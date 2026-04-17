-- ============================================================================
-- Migration 019 — Requalification risk (audit finding #6)
-- ============================================================================
-- Objectif légal : alerter worker + company quand la relation commerciale
-- s'approche d'un faisceau d'indices de requalification en salariat
-- (Cass. soc. 04/03/2020 Uber ; Cass. soc. 28/11/2018 Take Eat Easy).
--
-- Approche produit (validée avec l'équipe) :
--   - Deux métriques sur 12 mois glissants : part du CA et heures cumulées
--   - Seuils montée : 45 % / 70 % et 400 h / 800 h
--   - Hystérésis descente : 35 % / 60 % et 300 h / 650 h (anti flip-flop)
--   - Plancher anti faux positifs : 1000 € OU 5 missions OU 100 h cumulés
--   - Dormance : pair sans contrat actif depuis 90 jours → forcé à ok
--   - Action quand alert : pas de blocage, ack obligatoire côté company
--     à la prochaine mission ciblant ce worker (trace juridique)
--   - Audit log append-only pour la diligence documentée
--
-- Les heures réelles viennent de mission_time_entries (migration 018) avec
-- fallback sur contracts.total_hours pour les contrats antérieurs.
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Types enum
-- ────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'requalification_level') then
    create type requalification_level as enum ('ok','warning','alert');
  end if;
  if not exists (select 1 from pg_type where typname = 'requalification_audit_event') then
    create type requalification_audit_event as enum (
      'level_transition',
      'notif_sent',
      'ack_required',
      'ack_given',
      'dispute',
      'reset_dormant'
    );
  end if;
end $$;

alter type notif_type add value if not exists 'requalification_level_changed';

-- ────────────────────────────────────────────
-- 2. Colonne agrégée sur workers
-- ────────────────────────────────────────────
alter table workers
  add column if not exists requalification_risk_level       requalification_level not null default 'ok',
  add column if not exists requalification_risk_computed_at timestamptz;

comment on column workers.requalification_risk_level is
  'Agrégat du niveau de risque sur tous les pairs (worker, company) non dormants. Max sur worker_company_risk.';

-- Extension du GRANT de migration 017 : cette colonne est volontairement
-- publique pour créer la diligence (warnings visibles côté company).
grant select (requalification_risk_level, requalification_risk_computed_at)
  on public.workers to authenticated;

-- ────────────────────────────────────────────
-- 3. Table worker_company_risk — une ligne par pair
-- ────────────────────────────────────────────
create table if not exists worker_company_risk (
  id                    uuid                  primary key default uuid_generate_v4(),
  worker_id             uuid                  not null references workers(id)   on delete cascade,
  company_id            uuid                  not null references companies(id) on delete cascade,
  ca_ratio_12m          decimal(5,4)          not null default 0,
  hours_cumulative_12m  integer               not null default 0,
  total_missions_12m    integer               not null default 0,
  total_amount_12m      decimal(12,2)         not null default 0,
  last_contract_at      timestamptz,
  is_dormant            boolean               not null default false,
  level                 requalification_level not null default 'ok',
  computed_at           timestamptz           not null default now(),
  unique (worker_id, company_id)
);

comment on table worker_company_risk is
  'Métriques de requalification calculées par pair (worker, company) sur 12 mois glissants.';
comment on column worker_company_risk.ca_ratio_12m is
  'Part du CA 12 mois glissants du worker qui vient de cette company (0.0000 à 1.0000).';
comment on column worker_company_risk.is_dormant is
  'True si aucun contrat actif/completed sur le pair dans les 90 derniers jours.';

create index if not exists idx_worker_company_risk_worker  on worker_company_risk(worker_id, level);
create index if not exists idx_worker_company_risk_company on worker_company_risk(company_id, level);
create index if not exists idx_worker_company_risk_active
  on worker_company_risk(level) where level <> 'ok' and not is_dormant;

alter table worker_company_risk enable row level security;

-- RLS : worker voit les siens, company voit les siens, admin voit tout.
drop policy if exists "worker_company_risk · lecture parties" on worker_company_risk;
create policy "worker_company_risk · lecture parties"
  on worker_company_risk for select
  using (worker_id = auth.uid() or company_id = auth.uid() or is_admin());

-- Pas d'insert/update/delete côté client : tout passe par recompute_requalification_risk().
-- Les triggers et fonctions SECURITY DEFINER bypass RLS.

-- ────────────────────────────────────────────
-- 4. Table requalification_audit_log — append-only
-- ────────────────────────────────────────────
create table if not exists requalification_audit_log (
  id              uuid                        primary key default uuid_generate_v4(),
  worker_id       uuid                        not null references workers(id),
  company_id      uuid                        not null references companies(id),
  event           requalification_audit_event not null,
  previous_level  requalification_level,
  new_level       requalification_level,
  triggered_by    uuid,
  metadata        jsonb                       not null default '{}',
  created_at      timestamptz                 not null default now()
);

comment on table requalification_audit_log is
  'Journal append-only des transitions de niveau, ack, notifs. Preuve de diligence Tempo en cas de contrôle URSSAF/CPH.';

create index if not exists idx_requalification_audit_pair  on requalification_audit_log(worker_id, company_id, created_at desc);
create index if not exists idx_requalification_audit_event on requalification_audit_log(event, created_at desc);

alter table requalification_audit_log enable row level security;

-- Lecture admin uniquement.
drop policy if exists "audit_log · admin only" on requalification_audit_log;
create policy "audit_log · admin only"
  on requalification_audit_log for select
  using (is_admin());

-- Pas d'UPDATE ni DELETE possibles via RLS (aucune policy).
-- L'INSERT est fait par les fonctions SECURITY DEFINER qui bypass RLS.

-- ────────────────────────────────────────────
-- 5. Fonction de recalcul — cœur du mécanisme
-- ────────────────────────────────────────────
create or replace function recompute_requalification_risk(p_worker_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pair             record;
  v_ca_total_12m     numeric := 0;
  v_previous_level   requalification_level;
  v_new_level        requalification_level;
  v_ratio            numeric;
  v_plancher         boolean;
  v_dormant          boolean;
  v_agg_level        requalification_level := 'ok';
  -- Constantes des seuils (policy Tempo, révisable)
  c_seuil_ca_up_w    constant numeric := 0.45;
  c_seuil_ca_up_a    constant numeric := 0.70;
  c_seuil_ca_dn_w    constant numeric := 0.35;
  c_seuil_ca_dn_a    constant numeric := 0.60;
  c_seuil_h_up_w     constant integer := 400;
  c_seuil_h_up_a     constant integer := 800;
  c_seuil_h_dn_w     constant integer := 300;
  c_seuil_h_dn_a     constant integer := 650;
  c_plancher_amount  constant numeric := 1000;
  c_plancher_miss    constant integer := 5;
  c_plancher_hours   constant integer := 100;
  c_dormant_days     constant integer := 90;
begin
  -- Étape 1 : CA total 12 mois glissants du worker (tous contrats confondus)
  select coalesce(sum(c.total_amount_ht), 0) into v_ca_total_12m
    from contracts c
   where c.worker_id   = p_worker_id
     and c.created_at >= now() - interval '12 months'
     and c.status in ('active','completed','awaiting_hours_validation','hours_disputed');

  -- Étape 2 : Parcourt chaque pair (worker, company) actif sur 12 mois
  for v_pair in
    select
      c.company_id                                                              as company_id,
      coalesce(sum(c.total_amount_ht), 0)                                       as amount_12m,
      count(*)::int                                                             as missions_12m,
      max(c.created_at)                                                         as last_contract_at,
      coalesce(sum(
        case
          -- Si entries validées existent, on prend la réalité
          when exists (
            select 1 from mission_time_entries e
             where e.contract_id = c.id
               and e.status in ('validated','billed')
          ) then (
            select coalesce(sum(e2.worked_minutes), 0) / 60.0
              from mission_time_entries e2
             where e2.contract_id = c.id
               and e2.status in ('validated','billed')
          )
          -- Sinon fallback sur le forfait contractuel
          else coalesce(c.total_hours, 0)
        end
      ), 0)::int                                                                as hours_12m
    from contracts c
    where c.worker_id   = p_worker_id
      and c.created_at >= now() - interval '12 months'
      and c.status in ('active','completed','awaiting_hours_validation','hours_disputed')
    group by c.company_id
  loop
    -- Dormance : pas de contrat sur ce pair dans les 90 derniers jours
    v_dormant := v_pair.last_contract_at < now() - (c_dormant_days || ' days')::interval;

    -- Ratio CA
    v_ratio := case when v_ca_total_12m > 0
                    then v_pair.amount_12m / v_ca_total_12m
                    else 0
               end;

    -- Plancher : pas assez de volume pour juger
    v_plancher :=
      v_pair.amount_12m   < c_plancher_amount
      and v_pair.missions_12m < c_plancher_miss
      and v_pair.hours_12m    < c_plancher_hours;

    -- Lire le niveau précédent pour l'hystérésis
    select level into v_previous_level
      from worker_company_risk
     where worker_id = p_worker_id
       and company_id = v_pair.company_id;
    if v_previous_level is null then
      v_previous_level := 'ok';
    end if;

    -- Calcul du nouveau niveau
    if v_plancher or v_dormant then
      v_new_level := 'ok';
    else
      case v_previous_level
        when 'ok' then
          if v_ratio >= c_seuil_ca_up_a or v_pair.hours_12m >= c_seuil_h_up_a then
            v_new_level := 'alert';
          elsif v_ratio >= c_seuil_ca_up_w or v_pair.hours_12m >= c_seuil_h_up_w then
            v_new_level := 'warning';
          else
            v_new_level := 'ok';
          end if;
        when 'warning' then
          if v_ratio >= c_seuil_ca_up_a or v_pair.hours_12m >= c_seuil_h_up_a then
            v_new_level := 'alert';
          elsif v_ratio < c_seuil_ca_dn_w and v_pair.hours_12m < c_seuil_h_dn_w then
            v_new_level := 'ok';
          else
            v_new_level := 'warning';
          end if;
        when 'alert' then
          if v_ratio < c_seuil_ca_dn_a and v_pair.hours_12m < c_seuil_h_dn_a then
            v_new_level := 'warning';
          else
            v_new_level := 'alert';
          end if;
      end case;
    end if;

    -- UPSERT du row de pair
    insert into worker_company_risk (
      worker_id, company_id, ca_ratio_12m, hours_cumulative_12m,
      total_missions_12m, total_amount_12m, last_contract_at, is_dormant,
      level, computed_at
    ) values (
      p_worker_id, v_pair.company_id, v_ratio, v_pair.hours_12m,
      v_pair.missions_12m, v_pair.amount_12m, v_pair.last_contract_at, v_dormant,
      v_new_level, now()
    )
    on conflict (worker_id, company_id) do update
       set ca_ratio_12m         = excluded.ca_ratio_12m,
           hours_cumulative_12m = excluded.hours_cumulative_12m,
           total_missions_12m   = excluded.total_missions_12m,
           total_amount_12m     = excluded.total_amount_12m,
           last_contract_at     = excluded.last_contract_at,
           is_dormant           = excluded.is_dormant,
           level                = excluded.level,
           computed_at          = excluded.computed_at;

    -- Log de transition si changement
    if v_new_level <> v_previous_level then
      insert into requalification_audit_log (
        worker_id, company_id, event, previous_level, new_level, metadata
      ) values (
        p_worker_id, v_pair.company_id, 'level_transition',
        v_previous_level, v_new_level,
        jsonb_build_object(
          'ca_ratio',      v_ratio,
          'hours_12m',     v_pair.hours_12m,
          'missions_12m',  v_pair.missions_12m,
          'amount_12m',    v_pair.amount_12m,
          'ca_total_12m',  v_ca_total_12m,
          'is_dormant',    v_dormant
        )
      );

      -- Notif worker si escalade
      if (v_new_level = 'warning' and v_previous_level = 'ok')
         or v_new_level = 'alert' then
        insert into notifications (user_id, type, title, body, payload)
        values (
          p_worker_id,
          'requalification_level_changed',
          case v_new_level
            when 'warning' then 'Attention à ton indépendance'
            when 'alert'   then 'Risque de requalification élevé'
            else ''
          end,
          case v_new_level
            when 'warning' then 'Une de tes collaborations devient importante. Diversifier tes clients protège ton statut.'
            when 'alert'   then 'Une collaboration atteint un niveau qui pourrait remettre en cause ton statut d''indépendant. Nous te conseillons de diversifier activement.'
            else ''
          end,
          jsonb_build_object('company_id', v_pair.company_id, 'level', v_new_level)
        );
        insert into requalification_audit_log (
          worker_id, company_id, event, new_level, metadata
        ) values (
          p_worker_id, v_pair.company_id, 'notif_sent', v_new_level,
          jsonb_build_object('target', 'worker')
        );
      end if;

      -- Notif company si escalade (pour qu'elle sache qu'elle devra acker)
      if v_new_level = 'alert' then
        insert into notifications (user_id, type, title, body, payload)
        values (
          v_pair.company_id,
          'requalification_level_changed',
          'Risque de requalification',
          'Cette collaboration atteint un seuil qui nécessitera une reconnaissance explicite à la prochaine mission.',
          jsonb_build_object('worker_id', p_worker_id, 'level', 'alert')
        );
        insert into requalification_audit_log (
          worker_id, company_id, event, new_level, metadata
        ) values (
          p_worker_id, v_pair.company_id, 'notif_sent', 'alert',
          jsonb_build_object('target', 'company')
        );
      end if;
    end if;

    -- Agrégat worker : on retient le max sur les pairs non dormants
    if not v_dormant then
      if v_new_level = 'alert' then
        v_agg_level := 'alert';
      elsif v_new_level = 'warning' and v_agg_level <> 'alert' then
        v_agg_level := 'warning';
      end if;
    end if;
  end loop;

  -- Pairs disparus : ceux qui existaient avant mais n'apparaissent plus
  -- dans la boucle (parce que hors fenêtre 12 mois) → marqués dormants.
  update worker_company_risk
     set is_dormant  = true,
         level       = 'ok',
         computed_at = now()
   where worker_id = p_worker_id
     and last_contract_at < now() - (c_dormant_days || ' days')::interval
     and is_dormant = false;

  -- Mise à jour de l'agrégat sur workers
  update workers
     set requalification_risk_level       = v_agg_level,
         requalification_risk_computed_at = now()
   where id = p_worker_id;
end;
$$;

comment on function recompute_requalification_risk(uuid) is
  'Recalcule tous les pairs (worker, company) du worker donné + agrégat sur workers. Applique hystérésis, plancher et dormance.';

revoke execute on function recompute_requalification_risk(uuid) from public;
grant execute on function recompute_requalification_risk(uuid) to authenticated;

-- ────────────────────────────────────────────
-- 6. Triggers d'appel
-- ────────────────────────────────────────────
create or replace function tempo_trigger_requalification_on_contract()
returns trigger
language plpgsql
as $$
begin
  perform recompute_requalification_risk(NEW.worker_id);
  return NEW;
end;
$$;

drop trigger if exists trg_contracts_requalification on contracts;
create trigger trg_contracts_requalification
  after insert or update of status, total_hours, hourly_rate on contracts
  for each row
  execute function tempo_trigger_requalification_on_contract();

create or replace function tempo_trigger_requalification_on_time_entry()
returns trigger
language plpgsql
as $$
begin
  if NEW.status in ('validated','billed') and (OLD.status is null or OLD.status <> NEW.status) then
    perform recompute_requalification_risk(NEW.worker_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_time_entries_requalification on mission_time_entries;
create trigger trg_time_entries_requalification
  after update of status on mission_time_entries
  for each row
  execute function tempo_trigger_requalification_on_time_entry();

-- ────────────────────────────────────────────
-- 7. RPC ack côté company
-- ────────────────────────────────────────────
create or replace function ack_requalification_risk(
  p_worker_id  uuid,
  p_company_id uuid,
  p_ack        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pair_level requalification_level;
  v_log_id     uuid;
begin
  if auth.uid() <> p_company_id and not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select level into v_pair_level
    from worker_company_risk
   where worker_id = p_worker_id
     and company_id = p_company_id;

  if v_pair_level is null or v_pair_level <> 'alert' then
    raise exception 'ack_not_required' using errcode = 'P0001';
  end if;

  insert into requalification_audit_log (
    worker_id, company_id, event, new_level, triggered_by, metadata
  ) values (
    p_worker_id, p_company_id, 'ack_given', 'alert', auth.uid(),
    coalesce(p_ack, '{}'::jsonb)
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

grant execute on function ack_requalification_risk(uuid, uuid, jsonb) to authenticated;

-- ────────────────────────────────────────────
-- 8. RPC lecture — check avant création mission
-- ────────────────────────────────────────────
create or replace function check_requalification_for_new_mission(
  p_worker_id  uuid,
  p_company_id uuid
)
returns table (
  level           requalification_level,
  requires_ack    boolean,
  ca_ratio_12m    decimal(5,4),
  hours_12m       integer,
  missions_12m    integer,
  amount_12m      decimal(12,2),
  is_dormant      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(r.level, 'ok'::requalification_level) as level,
    coalesce(r.level = 'alert' and not r.is_dormant, false) as requires_ack,
    coalesce(r.ca_ratio_12m, 0)         as ca_ratio_12m,
    coalesce(r.hours_cumulative_12m, 0) as hours_12m,
    coalesce(r.total_missions_12m, 0)   as missions_12m,
    coalesce(r.total_amount_12m, 0)     as amount_12m,
    coalesce(r.is_dormant, false)       as is_dormant
  from (select 1) dummy
  left join worker_company_risk r
    on r.worker_id = p_worker_id
   and r.company_id = p_company_id
  where auth.uid() = p_company_id or auth.uid() = p_worker_id or is_admin()
$$;

grant execute on function check_requalification_for_new_mission(uuid, uuid) to authenticated;

-- ────────────────────────────────────────────
-- 9. RPC admin — lister les pairs à risque
-- ────────────────────────────────────────────
create or replace function admin_list_pairs_at_risk(
  p_min_level requalification_level default 'warning'
)
returns setof worker_company_risk
language sql
stable
security definer
set search_path = public
as $$
  select *
    from worker_company_risk
   where is_admin()
     and is_dormant = false
     and (
       (p_min_level = 'warning' and level in ('warning','alert'))
       or (p_min_level = 'alert' and level = 'alert')
     )
   order by level desc, computed_at desc
$$;

grant execute on function admin_list_pairs_at_risk(requalification_level) to authenticated;

-- ────────────────────────────────────────────
-- 10. Backfill initial
-- ────────────────────────────────────────────
do $$
declare
  v_worker record;
begin
  for v_worker in select id from workers loop
    perform recompute_requalification_risk(v_worker.id);
  end loop;
end $$;

-- ============================================================================
-- Migration 033 — fraud_case_resolved : notif dédiée à la clôture de litige
-- ============================================================================
-- admin_update_fraud_case() envoyait 'fraud_case_updated' indistinctement
-- pour les mises à jour en cours ET les résolutions définitives.
-- Fix : distinguer les deux cas avec un type dédié 'fraud_case_resolved'.
-- ============================================================================

create or replace function admin_update_fraud_case(
  p_case_id     uuid,
  p_status      fraud_case_status default null,
  p_admin_notes text              default null,
  p_decision    text              default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case         fraud_cases;
  v_caller       uuid := auth.uid();
  v_is_resolved  boolean;
  v_other_open   integer;
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_case from fraud_cases where id = p_case_id;
  if v_case is null then
    raise exception 'fraud_case_not_found: dossier de litige introuvable'
      using errcode = 'foreign_key_violation';
  end if;

  if v_case.status in ('resolved_worker', 'resolved_company', 'resolved_mutual', 'dismissed') then
    raise exception 'fraud_case_closed: ce litige est déjà résolu'
      using errcode = 'check_violation';
  end if;

  v_is_resolved := p_status in ('resolved_worker', 'resolved_company', 'resolved_mutual', 'dismissed');

  update fraud_cases set
    status          = coalesce(p_status, status),
    admin_notes     = coalesce(p_admin_notes, admin_notes),
    decision        = case when v_is_resolved then coalesce(p_decision, decision) else decision end,
    decided_by      = case when v_is_resolved then v_caller else decided_by end,
    decided_at      = case when v_is_resolved then now() else decided_at end,
    closed_at       = case when v_is_resolved then now() else closed_at end,
    retention_until = case when v_is_resolved then now() + interval '5 years' else retention_until end
  where id = p_case_id;

  if v_is_resolved and v_case.suspension_applied and v_case.suspended_profile_id is not null then
    select count(*) into v_other_open
    from fraud_cases
    where company_id = v_case.company_id
      and id         <> p_case_id
      and type       = 'non_payment'
      and status     in ('open', 'investigating');

    if v_other_open = 0 then
      update profiles set status = 'verified'
      where id = v_case.suspended_profile_id
        and status = 'suspended';

      insert into notifications (user_id, type, title, body)
      values (
        v_case.suspended_profile_id,
        'account_unsuspended',
        'Compte réactivé',
        'Votre compte a été réactivé suite à la résolution du litige. Vous pouvez à nouveau publier des missions.'
      );
    end if;
  end if;

  -- PATCH 033 : distinguer mise à jour en cours vs clôture définitive
  if v_is_resolved then
    insert into notifications (user_id, type, title, body, payload)
    values
      (v_case.worker_id,  'fraud_case_resolved', 'Litige clôturé',
       'Votre litige a été résolu. Consultez la décision dans votre espace disputes.',
       jsonb_build_object('case_id', p_case_id)),
      (v_case.company_id, 'fraud_case_resolved', 'Litige clôturé',
       'Le litige a été clôturé. Consultez la décision dans votre espace disputes.',
       jsonb_build_object('case_id', p_case_id));
  else
    insert into notifications (user_id, type, title, body, payload)
    values
      (v_case.worker_id,  'fraud_case_updated', 'Litige mis à jour',
       'Le statut de votre litige a été mis à jour par l''administrateur.',
       jsonb_build_object('case_id', p_case_id)),
      (v_case.company_id, 'fraud_case_updated', 'Litige mis à jour',
       'Le statut de votre litige a été mis à jour par l''administrateur.',
       jsonb_build_object('case_id', p_case_id));
  end if;
end;
$$;

comment on function admin_update_fraud_case is
  'Admin : met à jour un dossier litige. Gère la désuspension automatique. '
  'Patch 032 : case_id dans les payloads. '
  'Patch 033 : fraud_case_resolved pour les clôtures, fraud_case_updated pour les mises à jour en cours.';

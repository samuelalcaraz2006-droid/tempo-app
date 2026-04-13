import React from 'react'
import { SECTOR_LABELS } from '../../lib/formatters'

const Star = ({ n }) => (
  <span style={{ color: 'var(--am)', fontSize: 12 }}>
    {'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}
  </span>
)

const SECTORS = Object.entries(SECTOR_LABELS)

export default function CompanyProfile({
  company,
  profile,
  profileForm,
  setProfileForm,
  onSave,
  saving,
  displayName,
  initials,
  onLogout,
}) {
  return (
    <div>
      {/* En-tête */}
      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--navy)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600 }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{displayName}</div>
            <div style={{ fontSize: 13, color: 'var(--g4)' }}>{profile?.email}</div>
            {company?.rating_avg > 0 && (
              <div style={{ marginTop: 4 }}>
                <Star n={company.rating_avg} />
                <span style={{ fontSize: 12, color: 'var(--g4)', marginLeft: 4 }}>
                  {parseFloat(company.rating_avg).toFixed(1)} · {company.rating_count} avis
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Infos entreprise */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Informations entreprise</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
            Nom de l'entreprise
          </label>
          <input
            className="input"
            value={profileForm.name || ''}
            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Dupont Logistics SAS"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              SIRET
            </label>
            <input
              className="input"
              value={profileForm.siret || ''}
              onChange={e => setProfileForm(f => ({ ...f, siret: e.target.value }))}
              placeholder="12345678900012"
              maxLength={14}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Secteur
            </label>
            <select
              className="input"
              value={profileForm.sector || ''}
              onChange={e => setProfileForm(f => ({ ...f, sector: e.target.value }))}
            >
              <option value="">Sélectionner...</option>
              {SECTORS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Ville
            </label>
            <input
              className="input"
              value={profileForm.city || ''}
              onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Ex: Paris"
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Adresse
            </label>
            <input
              className="input"
              value={profileForm.address || ''}
              onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Ex: 12 rue du Commerce"
            />
          </div>
        </div>

        {/* Contact */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, marginTop: 4 }}>Contact</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Nom du contact
            </label>
            <input
              className="input"
              value={profileForm.contact_name || ''}
              onChange={e => setProfileForm(f => ({ ...f, contact_name: e.target.value }))}
              placeholder="Ex: Jean Dupont"
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Téléphone
            </label>
            <input
              className="input"
              value={profileForm.contact_phone || ''}
              onChange={e => setProfileForm(f => ({ ...f, contact_phone: e.target.value }))}
              placeholder="Ex: 06 12 34 56 78"
            />
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => onSave(profileForm)}
          disabled={saving}
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
        </button>
      </div>

      {/* Stats */}
      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', textAlign: 'center' }}>
          {[
            [company?.missions_posted || 0, 'Missions publiées'],
            [company?.missions_completed || 0, 'Terminées'],
            [company?.rating_avg ? parseFloat(company.rating_avg).toFixed(1) : '—', 'Note'],
          ].map(([v, l], i) => (
            <div key={l} style={{ borderLeft: i > 0 ? '1px solid var(--g2)' : 'none' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{v}</div>
              <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Abonnement */}
      {company?.subscription_plan && (
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Abonnement</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, textTransform: 'capitalize', fontWeight: 500 }}>
              Plan {company.subscription_plan}
            </span>
            {company.subscription_ends && (
              <span style={{ fontSize: 12, color: 'var(--g4)' }}>
                Expire le {new Date(company.subscription_ends).toLocaleDateString('fr-FR')}
              </span>
            )}
          </div>
        </div>
      )}

      <button
        className="btn-secondary"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={onLogout}
      >
        Se déconnecter
      </button>
    </div>
  )
}

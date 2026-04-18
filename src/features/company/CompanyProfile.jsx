
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
      <div style={{ marginBottom: 20 }}>
        <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>Profil entreprise</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          Votre <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>espace</span> {displayName || 'TEMPO'}.
        </div>
      </div>
      {/* En-tête */}
      <div className="a-card" style={{ padding: 24, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #1E40AF, #0D1117)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
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
          <input
            className="input"
            value={profileForm.name || ''}
            onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Ex: Dupont Logistics SAS"
          /></label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              SIRET
            <input
              className="input"
              value={profileForm.siret || ''}
              onChange={e => setProfileForm(f => ({ ...f, siret: e.target.value }))}
              placeholder="12345678900012"
              maxLength={14}
            /></label>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Secteur
            <select
              className="input"
              value={profileForm.sector || ''}
              onChange={e => setProfileForm(f => ({ ...f, sector: e.target.value }))}
            >
              <option value="">Sélectionner...</option>
              {SECTORS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select></label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Ville
            <input
              className="input"
              value={profileForm.city || ''}
              onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Ex: Paris"
            /></label>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Adresse
            <input
              className="input"
              value={profileForm.address || ''}
              onChange={e => setProfileForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Ex: 12 rue du Commerce"
            /></label>
          </div>
        </div>

        {/* Contact */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, marginTop: 4 }}>Contact</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Nom du contact
            <input
              className="input"
              value={profileForm.contact_name || ''}
              onChange={e => setProfileForm(f => ({ ...f, contact_name: e.target.value }))}
              placeholder="Ex: Jean Dupont"
            /></label>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
              Téléphone
            <input
              className="input"
              value={profileForm.contact_phone || ''}
              onChange={e => setProfileForm(f => ({ ...f, contact_phone: e.target.value }))}
              placeholder="Ex: 06 12 34 56 78"
            /></label>
          </div>
        </div>

        {/* Description — visible sur la carte de visite publique */}
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, marginTop: 4 }}>Présentation publique</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)' }}>À propos de votre entreprise</label>
            <span style={{ fontSize: 11, color: 'var(--g4)', fontFamily: "'JetBrains Mono', monospace" }}>
              {(profileForm.description || '').length} / 500
            </span>
          </div>
          <textarea
            className="input"
            rows={4}
            maxLength={500}
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            placeholder="Décrivez votre entreprise en quelques phrases. Secteur, taille, culture, pourquoi travailler avec vous."
            value={profileForm.description || ''}
            onChange={e => setProfileForm(f => ({ ...f, description: e.target.value }))}
          />
          <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 4, lineHeight: 1.5 }}>
            Affiché sur votre carte de visite publique que consultent les travailleurs avant de postuler.
          </div>
        </div>

        <button type="button"
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

      <button type="button"
        className="btn-secondary"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={onLogout}
      >
        Se déconnecter
      </button>
    </div>
  )
}

import React, { useState } from 'react'

const TABS = [
  ['cgu', 'CGU'],
  ['cgv', 'CGV'],
  ['mentions', 'Mentions legales'],
  ['rgpd', 'Politique RGPD'],
  ['cookies', 'Cookies'],
  ['charte', 'Charte travailleur'],
]

const CGU = () => (
  <div>
    <h2>Conditions Generales d'Utilisation</h2>
    <p><em>Derniere mise a jour : avril 2026</em></p>

    <h3>1. Objet</h3>
    <p>Les presentes CGU regissent l'utilisation de la plateforme TEMPO, service de mise en relation entre entreprises et travailleurs independants pour des missions temporaires.</p>

    <h3>2. Definitions</h3>
    <ul>
      <li><strong>Plateforme</strong> : le site web et l'application mobile TEMPO</li>
      <li><strong>Entreprise</strong> : personne morale publiant des missions sur la Plateforme</li>
      <li><strong>Travailleur</strong> : personne physique exercant une activite independante et inscrite sur la Plateforme</li>
      <li><strong>Mission</strong> : prestation de service proposee par une Entreprise et realisee par un Travailleur</li>
    </ul>

    <h3>3. Inscription</h3>
    <p>L'inscription est gratuite et ouverte aux personnes majeures. Le Travailleur doit fournir un SIRET actif, une piece d'identite et une attestation sur l'honneur. L'Entreprise doit fournir ses coordonnees legales.</p>

    <h3>4. Role de TEMPO</h3>
    <p>TEMPO agit en qualite de plateforme de mise en relation. TEMPO n'est ni employeur, ni agence d'interim, ni donneur d'ordre. Les Travailleurs exercent en totale independance, sans lien de subordination avec TEMPO ou les Entreprises.</p>

    <h3>5. Obligations des Travailleurs</h3>
    <ul>
      <li>Maintenir un SIRET actif et etre a jour de ses cotisations URSSAF</li>
      <li>Disposer d'une assurance RC Professionnelle en cours de validite</li>
      <li>Executer les missions conformement aux conditions convenues dans le contrat</li>
      <li>Respecter les regles de securite et d'hygiene sur le lieu de mission</li>
    </ul>

    <h3>6. Obligations des Entreprises</h3>
    <ul>
      <li>Fournir des informations exactes sur les missions proposees</li>
      <li>Garantir des conditions de travail conformes a la reglementation</li>
      <li>Proceder au paiement dans les delais convenus</li>
      <li>Ne pas exercer de lien de subordination sur les Travailleurs</li>
    </ul>

    <h3>7. Paiements et commission</h3>
    <p>Les paiements sont securises via Stripe. TEMPO preleve une commission de 8% TTC sur le montant de chaque mission. Le Travailleur recoit le solde apres deduction de la commission.</p>

    <h3>8. Responsabilite</h3>
    <p>TEMPO ne garantit pas la disponibilite des Travailleurs ni le resultat des missions. La responsabilite de TEMPO est limitee au bon fonctionnement de la plateforme.</p>

    <h3>9. Propriete intellectuelle</h3>
    <p>L'ensemble des contenus de la Plateforme (textes, logos, design) sont la propriete de TEMPO et proteges par le droit d'auteur.</p>

    <h3>10. Modification des CGU</h3>
    <p>TEMPO se reserve le droit de modifier les presentes CGU. Les utilisateurs seront informes par email de toute modification substantielle.</p>

    <h3>11. Droit applicable</h3>
    <p>Les presentes CGU sont soumises au droit francais. Tout litige sera porte devant les tribunaux competents de Lyon.</p>
  </div>
)

const CGV = () => (
  <div>
    <h2>Conditions Generales de Vente</h2>
    <p><em>Derniere mise a jour : avril 2026</em></p>

    <h3>1. Objet</h3>
    <p>Les presentes CGV definissent les conditions de facturation et de paiement des services de mise en relation fournis par TEMPO.</p>

    <h3>2. Prix</h3>
    <p>La commission TEMPO est de <strong>8% TTC</strong> du montant brut de chaque mission, prelevee automatiquement lors du paiement.</p>

    <h3>3. Facturation</h3>
    <p>TEMPO genere automatiquement une facture pour chaque mission terminee. Les factures sont numerotees sequentiellement et archivees pendant 10 ans conformement aux obligations comptables.</p>

    <h3>4. Paiement</h3>
    <p>Le paiement est autorise a la signature du contrat et capture a la validation du timesheet par l'Entreprise. Le virement vers le Travailleur est effectue sous 2 jours ouvrables via Stripe Connect.</p>

    <h3>5. Retard de paiement</h3>
    <p>En cas de retard de paiement, des penalites de retard seront appliquees au taux de 3 fois le taux d'interet legal, conformement a l'article L441-10 du Code de commerce.</p>

    <h3>6. Litiges</h3>
    <p>En cas de litige, le paiement est gele et un administrateur TEMPO examine le dossier. Si le litige ne peut etre resolu a l'amiable, il sera soumis a la juridiction competente.</p>
  </div>
)

const Mentions = () => (
  <div>
    <h2>Mentions legales</h2>

    <h3>Editeur du site</h3>
    <p>
      TEMPO SAS (en cours de creation)<br/>
      Siege social : [adresse a completer]<br/>
      SIRET : [a completer]<br/>
      Capital social : [a completer]<br/>
      Directeur de la publication : [a completer]<br/>
      Email : contact@tempo-app.fr
    </p>

    <h3>Hebergement</h3>
    <p>
      <strong>Application</strong> : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA<br/>
      <strong>Base de donnees</strong> : Supabase Inc., region eu-west-2 (Londres)<br/>
      <strong>Paiements</strong> : Stripe Payments Europe Ltd, Dublin, Irlande
    </p>

    <h3>Contact</h3>
    <p>Pour toute question : contact@tempo-app.fr</p>
  </div>
)

const RGPD = () => (
  <div>
    <h2>Politique de confidentialite (RGPD)</h2>
    <p><em>Derniere mise a jour : avril 2026</em></p>

    <h3>1. Responsable du traitement</h3>
    <p>TEMPO SAS, [adresse], contact@tempo-app.fr</p>

    <h3>2. Donnees collectees</h3>
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:16 }}>
      <thead><tr style={{ background:'var(--g1)' }}><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Donnee</th><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Finalite</th><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Base legale</th><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Duree</th></tr></thead>
      <tbody>
        {[
          ['Email, mot de passe', 'Authentification', 'Contrat', '3 ans apres dernier usage'],
          ['Nom, prenom, ville', 'Profil et matching', 'Contrat', '3 ans apres dernier usage'],
          ['SIRET, piece identite', 'Verification KYC', 'Obligation legale', '5 ans'],
          ['RC Pro, attestations', 'Conformite reglementaire', 'Obligation legale', '5 ans'],
          ['Geolocalisation (ville)', 'Matching geographique', 'Consentement', '3 ans'],
          ['Donnees de paiement', 'Facturation Stripe', 'Contrat', '10 ans (obligation comptable)'],
          ['Messages', 'Communication', 'Contrat', '1 an'],
          ['Logs de connexion', 'Securite', 'Interet legitime', '1 an'],
        ].map(([d, f, b, du]) => (
          <tr key={d}><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12 }}>{d}</td><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12 }}>{f}</td><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12 }}>{b}</td><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12 }}>{du}</td></tr>
        ))}
      </tbody>
    </table>

    <h3>3. Vos droits</h3>
    <p>Conformement au RGPD (articles 15 a 22), vous disposez des droits suivants :</p>
    <ul>
      <li><strong>Acces</strong> (art. 15) : obtenir une copie de vos donnees via le bouton "Telecharger mes donnees" dans votre profil</li>
      <li><strong>Rectification</strong> (art. 16) : modifier vos informations depuis votre profil</li>
      <li><strong>Effacement</strong> (art. 17) : demander la suppression de votre compte (les factures sont conservees 10 ans)</li>
      <li><strong>Limitation</strong> (art. 18) : demander la limitation du traitement</li>
      <li><strong>Portabilite</strong> (art. 20) : recevoir vos donnees dans un format structure (JSON)</li>
      <li><strong>Opposition</strong> (art. 21) : vous opposer au traitement de vos donnees</li>
    </ul>
    <p>Pour exercer ces droits : contact@tempo-app.fr ou via votre profil TEMPO.</p>

    <h3>4. Sous-traitants</h3>
    <ul>
      <li><strong>Supabase</strong> (UE) : hebergement et base de donnees</li>
      <li><strong>Stripe</strong> (UE) : traitement des paiements</li>
      <li><strong>Vercel</strong> (US, clauses contractuelles types) : hebergement frontend</li>
    </ul>

    <h3>5. Transferts hors UE</h3>
    <p>Vercel (US) opere sous clauses contractuelles types approuvees par la Commission europeenne. Aucune autre donnee n'est transferee hors UE.</p>

    <h3>6. Securite</h3>
    <p>Chiffrement TLS en transit, chiffrement au repos, RLS (Row Level Security) sur toutes les tables, authentification JWT, audit log des actions admin.</p>

    <h3>7. Contact DPO</h3>
    <p>Delegue a la protection des donnees : dpo@tempo-app.fr</p>

    <h3>8. Reclamation</h3>
    <p>Vous pouvez introduire une reclamation aupres de la CNIL : www.cnil.fr</p>
  </div>
)

const Cookies = () => (
  <div>
    <h2>Politique cookies</h2>
    <p><em>Derniere mise a jour : avril 2026</em></p>

    <h3>Cookies utilises</h3>
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:16 }}>
      <thead><tr style={{ background:'var(--g1)' }}><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Cookie</th><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Type</th><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Finalite</th><th style={{ padding:8, textAlign:'left', borderBottom:'1px solid var(--g2)' }}>Duree</th></tr></thead>
      <tbody>
        {[
          ['sb-*-auth-token', 'Necessaire', 'Session d\'authentification Supabase', 'Session'],
          ['tempo_dark_mode', 'Necessaire', 'Preference theme sombre', 'Permanente'],
          ['tempo_onboarding_done', 'Necessaire', 'Etat onboarding premier usage', 'Permanente'],
          ['tempo_cookie_consent', 'Necessaire', 'Choix cookies', '13 mois'],
        ].map(([n, t, f, d]) => (
          <tr key={n}><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12, fontFamily:'monospace' }}>{n}</td><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12 }}>{t}</td><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12 }}>{f}</td><td style={{ padding:6, borderBottom:'1px solid var(--g1)', fontSize:12 }}>{d}</td></tr>
        ))}
      </tbody>
    </table>

    <h3>Cookies tiers</h3>
    <p>TEMPO n'utilise <strong>aucun cookie publicitaire</strong> ni tracker tiers. Aucun cookie Google Analytics, Facebook Pixel ou equivalent n'est depose.</p>

    <h3>Gestion des cookies</h3>
    <p>Tous les cookies utilises par TEMPO sont strictement necessaires au fonctionnement du service. Conformement a la reglementation CNIL, les cookies strictement necessaires ne necessitent pas de consentement. Vous pouvez neanmoins les supprimer via les parametres de votre navigateur.</p>
  </div>
)

const Charte = () => (
  <div>
    <h2>Charte du travailleur independant</h2>
    <p><em>Derniere mise a jour : avril 2026</em></p>

    <h3>Statut d'independant</h3>
    <p>En utilisant TEMPO, vous confirmez exercer votre activite en tant que <strong>travailleur independant</strong> (auto-entrepreneur, micro-entreprise ou societe). TEMPO n'est pas votre employeur.</p>

    <h3>Absence de lien de subordination</h3>
    <p>Vous etes libre de :</p>
    <ul>
      <li>Accepter ou refuser toute mission proposee</li>
      <li>Organiser votre emploi du temps librement</li>
      <li>Travailler pour d'autres plateformes ou clients simultanement</li>
      <li>Choisir vos methodes de travail</li>
    </ul>
    <p><strong>L'Entreprise ne peut pas :</strong></p>
    <ul>
      <li>Imposer des horaires precis (sauf coordination necessaire)</li>
      <li>Exercer un controle hierarchique</li>
      <li>Fournir les outils de travail (sauf accord contractuel)</li>
      <li>Appliquer des sanctions disciplinaires</li>
    </ul>

    <h3>Obligations legales</h3>
    <ul>
      <li>Tenir a jour votre SIRET et vos cotisations URSSAF</li>
      <li>Souscrire une assurance RC Professionnelle</li>
      <li>Declarer vos revenus aupres des services fiscaux</li>
      <li>Respecter le plafond de chiffre d'affaires auto-entrepreneur (77 700 EUR en 2026)</li>
    </ul>

    <h3>Signalement</h3>
    <p>Si vous estimez qu'une Entreprise exerce un lien de subordination, signalez-le immediatement a contact@tempo-app.fr. TEMPO s'engage a examiner chaque signalement.</p>
  </div>
)

const CONTENT = { cgu: CGU, cgv: CGV, mentions: Mentions, rgpd: RGPD, cookies: Cookies, charte: Charte }

export default function Legal({ onBack }) {
  const [tab, setTab] = useState('cgu')
  const Content = CONTENT[tab]

  return (
    <div style={{ minHeight:'100vh', background:'var(--wh)', padding:'24px 20px' }}>
      <div style={{ maxWidth:800, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          {onBack && <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'var(--g4)' }}>‹ Retour</button>}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:24, height:24, background:'var(--or)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
            </div>
            <span style={{ fontWeight:600, letterSpacing:'1.5px', fontSize:13 }}>TEMPO</span>
          </div>
          <span style={{ fontSize:14, fontWeight:600, color:'var(--g6)' }}>Informations legales</span>
        </div>

        <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--g2)', marginBottom:24, overflowX:'auto' }}>
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding:'10px 14px', border:'none', background:'transparent', fontSize:13, fontWeight: tab === k ? 500 : 400, color: tab === k ? 'var(--bk)' : 'var(--g4)', borderBottom: tab === k ? '2px solid var(--or)' : '2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>{l}</button>
          ))}
        </div>

        <div style={{ fontSize:14, lineHeight:1.8, color:'var(--g6)' }}>
          <Content />
        </div>

        <div style={{ marginTop:40, padding:'20px 0', borderTop:'1px solid var(--g2)', fontSize:12, color:'var(--g4)', textAlign:'center' }}>
          TEMPO SAS — contact@tempo-app.fr — Tous droits reserves {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

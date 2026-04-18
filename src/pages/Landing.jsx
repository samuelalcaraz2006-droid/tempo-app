import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeUp, slideRight, stagger, staggerFast, scaleIn, viewportOnce } from '../lib/animations'
import AnimatedCounter from '../components/AnimatedCounter'
import {
  Zap, Star, ChevronDown, ChevronUp,
  Package, HardHat, Settings, UtensilsCrossed, Sparkles,
  ArrowRight, Check, Users, Clock, TrendingUp, Award,
  Building2, UserCheck, Menu, X, Timer, Radar, Gavel,
} from 'lucide-react'

const sectors = [
  { Icon: Package, label: 'Logistique', desc: 'Cariste, prep commandes, manutention', iconBg: 'var(--brand-l)', iconColor: 'var(--brand)' },
  { Icon: HardHat, label: 'BTP', desc: 'Manoeuvre, electricien, chantier urgent', iconBg: '#FEF3C7', iconColor: '#92400E' },
  { Icon: Settings, label: 'Industrie', desc: 'Operateur, regleur, controle qualite', iconBg: 'var(--g1)', iconColor: 'var(--g5)' },
  { Icon: UtensilsCrossed, label: 'Hotellerie', desc: 'Cuisine, service, reception', iconBg: '#FDF2F8', iconColor: '#9D174D' },
  { Icon: Sparkles, label: 'Proprete', desc: 'Agent de surface et interventions express', iconBg: 'var(--gr-l)', iconColor: 'var(--gr-d)' },
]

const stepsCompany = [
  { n: '1', t: 'Publiez le besoin', d: 'Poste, horaires, lieu, tarif et demarrage en 2 minutes.' },
  { n: '2', t: 'TEMPO active le matching', d: 'Les profils verifies et disponibles sont notifies en temps reel.' },
  { n: '3', t: 'Mission executee', d: 'Contrat et suivi centralises, sans friction administrative.' },
]

const stepsWorker = [
  { n: '1', t: 'Profilez vos competences', d: 'Secteurs, certificats, disponibilite et zone de deplacement.' },
  { n: '2', t: 'Recevez les meilleures missions', d: 'Selection personnalisee selon votre historique et votre localisation.' },
  { n: '3', t: 'Travaillez et encaissez vite', d: 'Process simple, statut clair, paiement automatise.' },
]

const replacementPillars = [
  {
    Icon: Timer,
    title: 'Vitesse operationnelle',
    desc: "Stop aux cycles longs d'agence. TEMPO couvre le besoin terrain avec un flux instantane.",
    metric: '22 min en moyenne',
  },
  {
    Icon: Radar,
    title: 'Pilotage en continu',
    desc: 'Disponibilites, scores, missions et couts visibles en live par les equipes operations.',
    metric: 'Vue 360 des missions',
  },
  {
    Icon: Gavel,
    title: 'Conformite native',
    desc: 'Verification des profils, pieces, contrats et traces operationnelles au meme endroit.',
    metric: 'Compliance-first',
  },
]

const testimonials = [
  { name: 'Marc R.', role: 'Cariste - Lyon', text: 'Avec TEMPO je trouve des missions regulieres sans perdre mes journees a chercher.', stars: 5 },
  { name: 'Sophie B.', role: 'Magasiniere - Venissieux', text: 'Le suivi mission + facture auto me fait gagner un temps enorme.', stars: 5 },
  { name: 'Responsable Ops', role: 'Entrepot regional', text: 'On a staffe un shift critique un dimanche soir en moins de 30 minutes.', stars: 5 },
]

const faqs = [
  { q: 'TEMPO est une agence d interim ?', a: 'Non. TEMPO est une plateforme operationnelle de mise en relation et d execution de mission.' },
  { q: 'Comment la qualite est garantie ?', a: 'Par verification des profils, scoring, historique de mission et notation bidirectionnelle.' },
  { q: 'Et le cadre administratif ?', a: 'Le flux de mission est encadre par des etapes formalisees et une tracabilite complete.' },
]

const algoFeatures = [
  { label: 'Precision du matching', value: 94, color: 'var(--bl)' },
  { label: 'Missions pourvues rapidement', value: 87, color: 'var(--bl-m)' },
  { label: 'Satisfaction globale', value: 98, color: 'var(--bl-xl)' },
  { label: 'Profils verifies', value: 100, color: '#34D399' },
]

function Navbar({ onNavigate }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollToId = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileOpen(false)
  }

  const navItems = [
    ['entreprises', 'Entreprises'],
    ['travailleurs', 'Travailleurs'],
    ['process', 'Comment ca marche'],
    ['tarifs', 'Tarifs'],
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      transition: 'all 0.3s',
      background: scrolled ? 'rgba(13,17,23,.9)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,.08)' : 'none',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 32, height: 32, background: 'var(--bl)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(29,78,216,.5)' }}>
            <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 1.5L11 6.5L2 11.5Z" fill="white"/></svg>
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '2.5px', fontSize: 15, color: '#fff' }}>TEMPO</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }} className="nav-desktop">
          {navItems.map(([id, label]) => (
            <button key={id} onClick={() => scrollToId(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.75)', fontSize: 14, fontWeight: 600 }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-ghost nav-desktop-cta" onClick={() => onNavigate('auth')} style={{ fontSize: 14, padding: '9px 20px' }}>Connexion</button>
          <button className="btn-primary nav-desktop-cta" onClick={() => onNavigate('auth')} style={{ fontSize: 14, padding: '9px 20px' }}>Demarrer <ArrowRight size={14} /></button>
          <button aria-label="Menu mobile" onClick={() => setMobileOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#fff', display: 'none', cursor:'pointer', padding:8 }} className="nav-mobile-btn">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ background: 'rgba(13,17,23,.97)', borderTop: '1px solid rgba(255,255,255,.08)', padding: '16px 24px 24px' }}>
            {navItems.map(([id, label]) => (
              <button key={id} onClick={() => scrollToId(id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', background: 'none', border: 'none', color: 'rgba(255,255,255,.85)', fontSize: 15, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {label}
              </button>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn-ghost" onClick={() => { setMobileOpen(false); onNavigate('auth') }} style={{ fontSize: 14, padding: '11px 20px', justifyContent: 'center' }}>Connexion</button>
              <button type="button" className="btn-primary" onClick={() => { setMobileOpen(false); onNavigate('auth') }} style={{ fontSize: 14, padding: '11px 20px', justifyContent: 'center' }}>Demarrer <ArrowRight size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

function HeroMockup() {
  const missions = [
    { title: 'Cariste CACES 3', company: 'Amazon Logistics', pay: '16EUR/h', match: 97, color: '#34D399' },
    { title: 'Preparateur commandes', company: 'Chronopost Lyon', pay: '14.5EUR/h', match: 91, color: 'var(--bl-m)' },
    { title: 'Operateur industrie', company: 'Michelin', pay: '15EUR/h', match: 85, color: 'var(--bl-xl)' },
  ]

  return (
    <motion.div variants={slideRight} className="float" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, backdropFilter: 'blur(20px)', padding: 20, width: '100%', maxWidth: 380 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 2, letterSpacing: '1px', textTransform: 'uppercase' }}>Missions live</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>3 nouveaux besoins</div>
        </div>
        <div style={{ background: 'var(--bl)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#fff' }}>Live</div>
      </div>

      {missions.map((m, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{m.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{m.company} � {m.pay}</div>
          </div>
          <div style={{ background: `${m.color}20`, border: `1px solid ${m.color}40`, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: m.color }}>{m.match}%</div>
        </motion.div>
      ))}
    </motion.div>
  )
}

function AnimatedBar({ label, value, color, delay = 0 }) {
  const ref = useRef(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 100, width: started ? `${value}%` : '0%', transition: `width 1s ease-out ${delay}s` }} />
      </div>
    </div>
  )
}

export default function Landing({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('company')
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div style={{
      background: 'var(--wh)',
      overflowX: 'hidden',
    }}>
      <Navbar onNavigate={onNavigate} />

      <section id="hero" style={{ background: 'var(--navy)', minHeight: '100dvh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 68 }}>
        <div className="blob-animate hero-blob" style={{ position: 'absolute', top: '-20%', left: '-10%', width: 'clamp(300px, 55vw, 600px)', height: 'clamp(300px, 55vw, 600px)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)' }} />
        <div className="blob-animate hero-blob" style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 'clamp(260px, 45vw, 500px)', height: 'clamp(260px, 45vw, 500px)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', animationDelay: '4s' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', width: '100%', display: 'flex', alignItems: 'center', gap: 60 }} className="hero-grid">
          <motion.div initial="hidden" animate="visible" variants={stagger} style={{ flex: 1 }}>
            <motion.div variants={fadeUp}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 100, padding: '6px 14px', marginBottom: 24 }}>
                <Zap size={13} color="var(--bl-xl)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--bl-xl)', letterSpacing: '0.5px' }}>Staffing on-demand</span>
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.05, color: '#fff', marginBottom: 20, letterSpacing: '-0.03em' }}>
              Remplacer l'interim par une execution <span className="font-serif-italic" style={{ color: 'var(--brand-xl)' }}>temps reel</span>
            </motion.h1>

            <motion.p variants={fadeUp} style={{ fontSize: 18, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, marginBottom: 36, maxWidth: 560 }}>
              TEMPO connecte entreprises et travailleurs verifies dans un flux unique: matching, mission, suivi et paiement.
            </motion.p>

            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
              <button className="btn-primary" onClick={() => onNavigate('auth')} style={{ fontSize: 15, padding: '14px 28px' }}>Je suis une entreprise <ArrowRight size={16} /></button>
              <button className="btn-ghost" onClick={() => onNavigate('auth')} style={{ fontSize: 15, padding: '14px 28px' }}>Je cherche des missions</button>
            </motion.div>

            <motion.div variants={staggerFast} style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { value: 2400, suffix: '+', label: 'travailleurs actifs' },
                { value: 98, suffix: '%', label: 'missions pourvues' },
                { value: 30, suffix: ' min', label: 'delai moyen', prefix: '<' },
              ].map((s, i) => (
                <motion.div key={i} variants={fadeUp} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}><AnimatedCounter value={s.value} suffix={s.suffix} prefix={s.prefix || ''} /></div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{s.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={stagger} style={{ flex: 1, display: 'flex', justifyContent: 'center' }} className="hero-mockup">
            <HeroMockup />
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '96px 24px', background: 'var(--wh2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ textAlign: 'center', marginBottom: 56 }}>
            <motion.p variants={fadeUp} className="a-eyebrow" style={{ marginBottom: 12, fontSize: 11 }}>Secteurs actifs</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em' }}>Les métiers qui doivent <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>tourner sans rupture</span></motion.h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
            {sectors.map((s, i) => {const { Icon, label, desc } = s; return (
              <motion.div key={i} variants={fadeUp} className="card card-hover" style={{ padding: '28px 20px', textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon size={24} color={s.iconColor} /></div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--bk)', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--g4)', lineHeight: 1.5 }}>{desc}</div>
              </motion.div>
            )})}
          </motion.div>
        </div>
      </section>

      <section id="process" style={{ padding: '96px 24px', background: 'var(--wh)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
            <motion.p variants={fadeUp} className="a-eyebrow" style={{ marginBottom: 12, fontSize: 11 }}>Flux opérationnel</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em' }}>Comment TEMPO <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>exécute</span> la mission</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp} style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', background: 'var(--g1)', borderRadius: 50, padding: 4, gap: 4 }}>
              {[
                { id: 'company', label: 'Entreprise', Icon: Building2 },
                { id: 'worker', label: 'Travailleur', Icon: UserCheck },
              ].map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 50, border: 'none', fontSize: 14, fontWeight: 700, background: activeTab === id ? 'var(--brand)' : 'transparent', color: activeTab === id ? '#fff' : 'var(--g5)', transition: 'background .2s, color .2s' }}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
              {(activeTab === 'company' ? stepsCompany : stepsWorker).map((s, i) => (
                <div key={i} className="card" style={{ padding: '28px 24px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bl)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 16 }}>{s.n}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--bk)', marginBottom: 8 }}>{s.t}</div>
                  <div style={{ fontSize: 13, color: 'var(--g5)', lineHeight: 1.6 }}>{s.d}</div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section id="entreprises" style={{ padding: '96px 24px', background: 'linear-gradient(180deg, #fff 0%, #EFF6FF 100%)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ textAlign: 'center', marginBottom: 56 }}>
            <motion.p variants={fadeUp} className="a-eyebrow" style={{ marginBottom: 12, fontSize: 11 }}>Pourquoi pas une agence</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--bk)', lineHeight: 1.1, letterSpacing: '-0.025em' }}>
              Plus rapide qu'une agence, <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>plus fiable</span> qu'un simple jobboard
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {replacementPillars.map(({ Icon, title, desc, metric }) => (
              <motion.div key={title} variants={fadeUp} className="card card-hover" style={{ padding: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bl-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon size={22} color="var(--bl)" /></div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--bk)', marginBottom: 10 }}>{title}</div>
                <p style={{ fontSize: 14, color: 'var(--g5)', lineHeight: 1.7, marginBottom: 14 }}>{desc}</p>
                <span className="badge badge-blue" style={{ fontSize: 11 }}>{metric}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="travailleurs" style={{ padding: '96px 24px', background: 'var(--navy)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ textAlign: 'center', marginBottom: 64 }}>
            <motion.p variants={fadeUp} className="a-eyebrow" style={{ marginBottom: 12, fontSize: 11, color: 'var(--brand-xl)' }}>Moteur TEMPO</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.025em' }}>Un matching qui tient la <span className="font-serif-italic" style={{ color: 'var(--brand-xl)' }}>charge terrain</span></motion.h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
            <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { Icon: Users, value: 2400, suffix: '+', label: 'Travailleurs actifs' },
                { Icon: Clock, value: 22, suffix: ' min', label: 'Temps de matching' },
                { Icon: TrendingUp, value: 98, suffix: '%', label: 'Missions pourvues' },
                { Icon: Award, value: 4.9, suffix: '/5', label: 'Note moyenne' },
              ].map(({ Icon, value, suffix, label }, i) => (
                <motion.div key={i} variants={scaleIn} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 16px', textAlign: 'center' }}>
                  <Icon size={20} color="var(--bl-xl)" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}><AnimatedCounter value={value} suffix={suffix} duration={1.5} /></div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>{label}</div>
                </motion.div>
              ))}
            </motion.div>

            <div>
              {algoFeatures.map((f, i) => <AnimatedBar key={i} label={f.label} value={f.value} color={f.color} delay={i * 0.15} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="tarifs" style={{ padding: '96px 24px', background: 'var(--g1)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ textAlign: 'center', marginBottom: 56 }}>
            <motion.p variants={fadeUp} className="a-eyebrow" style={{ marginBottom: 12, fontSize: 11 }}>Ils utilisent TEMPO</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em' }}><span className="font-serif-italic" style={{ color: 'var(--brand)' }}>Témoignages</span> terrain</motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {testimonials.map((t, i) => (
              <motion.div key={i} variants={fadeUp} className="card card-hover" style={{ padding: 28 }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>{Array.from({ length: t.stars }).map((_, j) => <Star key={j} size={14} fill="var(--or)" color="var(--or)" />)}</div>
                <p style={{ fontSize: 14, color: 'var(--g5)', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>&quot;{t.text}&quot;</p>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bk)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--g4)' }}>{t.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '96px 24px', background: 'var(--wh2)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger} style={{ textAlign: 'center', marginBottom: 48 }}>
            <motion.p variants={fadeUp} className="a-eyebrow" style={{ marginBottom: 12, fontSize: 11 }}>FAQ</motion.p>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em' }}>Questions <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>fréquentes</span></motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger}>
            {faqs.map((f, i) => (
              <motion.div key={i} variants={fadeUp} style={{ borderBottom: '1px solid var(--g2)', overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', background: 'none', border: 'none', textAlign: 'left' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bk)', paddingRight: 16 }}>{f.q}</span>
                  {openFaq === i ? <ChevronUp size={18} color="var(--bl)" /> : <ChevronDown size={18} color="var(--g4)" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <p style={{ fontSize: 14, color: 'var(--g5)', lineHeight: 1.7, paddingBottom: 20 }}>{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section style={{ padding: '96px 24px', background: 'linear-gradient(135deg, #0D1117 0%, #1E3A8A 50%, #1D4ED8 100%)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={stagger}>
            <motion.h2 variants={fadeUp} style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#fff', lineHeight: 1.05, marginBottom: 16, letterSpacing: '-0.03em' }}>Prêt à <span className="font-serif-italic" style={{ color: 'var(--brand-xl)' }}>remplacer</span> vos cycles intérim ?</motion.h2>
            <motion.p variants={fadeUp} style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', marginBottom: 40, lineHeight: 1.7 }}>Passez en mode execution on-demand avec TEMPO.</motion.p>
            <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-dark" onClick={() => onNavigate('auth')} style={{ padding: '13px 24px' }}>Demarrer entreprise</button>
              <button className="btn-ghost" onClick={() => onNavigate('auth')} style={{ padding: '13px 24px', borderColor: 'rgba(255,255,255,.35)' }}>Demarrer travailleur</button>
            </motion.div>
            <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 28, flexWrap: 'wrap' }}>
              {['Inscription rapide', 'Execution tracee', 'Support 7j/7'].map(l => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.78)' }}><Check size={13} /> {l}</div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      <footer style={{ background: 'var(--navy)', borderTop: '1px solid rgba(255,255,255,.06)', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'var(--bl)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 13 13"><path d="M2 1.5L11 6.5L2 11.5Z" fill="white"/></svg>
            </div>
            <span style={{ fontWeight: 700, letterSpacing: '2px', fontSize: 13, color: 'rgba(255,255,255,.7)' }}>TEMPO</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>� 2026 TEMPO � Infrastructure staffing on-demand</div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid {
            flex-direction: column !important;
            text-align: center;
            gap: 32px !important;
            padding: 40px 20px !important;
          }
          .hero-mockup { display: none !important; }
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; align-items: center; }
          .nav-desktop-cta { display: none !important; }
          #hero { min-height: auto !important; }
          section:not(#hero) {
            padding-top: 56px !important;
            padding-bottom: 56px !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          .hero-grid h1 {
            font-size: clamp(28px, 8vw, 40px) !important;
          }
          .hero-grid p {
            font-size: 15px !important;
          }
        }
        @media (max-width: 480px) {
          #hero { padding-top: 60px !important; }
          .hero-grid { padding: 32px 16px !important; }
        }
      `}</style>
    </div>
  )
}


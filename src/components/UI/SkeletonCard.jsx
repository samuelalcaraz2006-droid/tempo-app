

function SkeletonLine({ width = '100%', height = 14, style }) {
  return (
    <div className="skeleton" style={{ width, height, borderRadius: 6, ...style }} />
  )
}

export function SkeletonMissionCard() {
  return (
    <div className="card-mission" style={{ padding: '14px 16px', marginBottom: 8, borderLeftColor: 'var(--g2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <SkeletonLine width="60%" height={16} />
          <SkeletonLine width="40%" height={12} style={{ marginTop: 8 }} />
        </div>
        <SkeletonLine width={60} height={22} style={{ borderRadius: 99, flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SkeletonLine width={70} height={22} style={{ borderRadius: 99 }} />
        <SkeletonLine width={50} height={22} style={{ borderRadius: 99 }} />
        <SkeletonLine width={80} height={22} style={{ borderRadius: 99 }} />
      </div>
    </div>
  )
}

export function SkeletonMetricCard() {
  return (
    <div className="metric-card">
      <SkeletonLine width="50%" height={10} style={{ marginBottom: 10 }} />
      <SkeletonLine width="40%" height={24} />
    </div>
  )
}

export default function SkeletonCard({ variant = 'mission', count = 3 }) {
  const Card = variant === 'metric' ? SkeletonMetricCard : SkeletonMissionCard
  return (
    <>
      {Array.from({ length: count }, (_, i) => <Card key={i} />)}
    </>
  )
}

import { useRef, useState, useEffect } from 'react'

export default function SignatureCanvas({ onSave, label = 'Signature' }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111'
  }, [])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  const start = (e) => {
    e.preventDefault()
    setDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    if (!drawing) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stop = () => setDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const save = () => {
    if (!hasDrawn) return
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8)
    // ~360×140 JPEG 80% ≈ 15-30 KB — refuser si anomalie
    if (dataUrl.length > 200000) {
      console.warn('[SignatureCanvas] dataUrl trop volumineux:', dataUrl.length)
      return
    }
    onSave(dataUrl)
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 6 }} id="sig-label">{label}</div>
      <p style={{ fontSize: 11, color: 'var(--g4)', marginBottom: 6, marginTop: 0 }}>
        Dessinez votre signature dans la zone ci-dessous, puis cliquez sur « Valider la signature ».
      </p>
      <canvas
        ref={canvasRef}
        width={360}
        height={140}
        role="img"
        aria-label={`Zone de signature — ${label}. Dessinez votre signature à la souris ou au doigt.`}
        aria-describedby="sig-instructions"
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={stop}
        style={{
          width: '100%', maxWidth: 360, height: 140,
          border: '1.5px dashed var(--g3)', borderRadius: 10,
          background: 'var(--g1)', cursor: 'crosshair', touchAction: 'none',
          display: 'block',
        }}
      />
      <span id="sig-instructions" style={{ display: 'none' }}>
        Utilisez la souris ou votre doigt pour dessiner votre signature dans cette zone.
        Cliquez sur Effacer pour recommencer, puis sur Valider la signature pour confirmer.
      </span>
      {hasDrawn && (
        <div role="status" aria-live="polite" style={{ fontSize: 11, color: 'var(--gr)', marginTop: 4 }}>
          Signature dessinée — cliquez sur « Valider la signature » pour confirmer.
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={clear} aria-label="Effacer la signature" style={{ padding: '6px 14px', fontSize: 12, border: '1px solid var(--g2)', borderRadius: 8, background: 'var(--wh)', cursor: 'pointer', color: 'var(--g4)' }}>
          Effacer
        </button>
        <button
          onClick={save}
          disabled={!hasDrawn}
          aria-disabled={!hasDrawn}
          aria-label={hasDrawn ? 'Valider la signature' : 'Valider la signature (dessinez d\'abord)'}
          style={{ padding: '6px 14px', fontSize: 12, border: 'none', borderRadius: 8, background: hasDrawn ? 'var(--gr)' : 'var(--g2)', color: hasDrawn ? '#fff' : 'var(--g4)', cursor: hasDrawn ? 'pointer' : 'default', fontWeight: 500 }}
        >
          Valider la signature
        </button>
      </div>
    </div>
  )
}

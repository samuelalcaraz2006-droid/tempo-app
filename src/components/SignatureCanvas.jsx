import React, { useRef, useState, useEffect } from 'react'

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
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
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
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#6E6E6B', marginBottom: 6 }}>{label}</div>
      <canvas
        ref={canvasRef}
        width={360}
        height={140}
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
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={clear} style={{ padding: '6px 14px', fontSize: 12, border: '1px solid var(--g2)', borderRadius: 8, background: 'var(--wh)', cursor: 'pointer', color: 'var(--g4)' }}>
          Effacer
        </button>
        <button onClick={save} disabled={!hasDrawn}
          style={{ padding: '6px 14px', fontSize: 12, border: 'none', borderRadius: 8, background: hasDrawn ? '#059669' : '#E8E8E5', color: hasDrawn ? '#fff' : '#8A8A86', cursor: hasDrawn ? 'pointer' : 'default', fontWeight: 500 }}>
          Valider la signature
        </button>
      </div>
    </div>
  )
}

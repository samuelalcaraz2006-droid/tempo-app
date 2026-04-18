import { useEffect, useRef, useState } from 'react'
import { useMotionValue, animate, useInView } from 'framer-motion'

export default function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1.2, style = {} }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const motionValue = useMotionValue(0)
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
  }, [isInView, value, duration, motionValue])

  return (
    <span ref={ref} style={style}>
      {prefix}{display}{suffix}
    </span>
  )
}

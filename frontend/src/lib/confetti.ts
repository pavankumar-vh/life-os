'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; life: number; maxLife: number
  rotation: number; rotationSpeed: number
}

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particles = useRef<Particle[]>([])
  const animFrame = useRef<number>(0)

  useEffect(() => {
    return () => { if (animFrame.current) cancelAnimationFrame(animFrame.current) }
  }, [])

  const fire = (x?: number, y?: number) => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none'
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      document.body.appendChild(canvas)
      canvasRef.current = canvas
    }

    const cx = x ?? window.innerWidth / 2
    const cy = y ?? window.innerHeight / 3
    const colors = ['#e8d5b7', '#34d399', '#60a5fa', '#a78bfa', '#fb923c', '#fb7185', '#22d3ee', '#f0dfc4']

    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + (Math.random() - 0.5) * 0.5
      const speed = 3 + Math.random() * 6
      particles.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 4,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      })
    }

    if (!animFrame.current) animate()
  }

  const animate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.current = particles.current.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.12 // gravity
      p.vx *= 0.99
      p.rotation += p.rotationSpeed
      p.life -= 1 / p.maxLife

      if (p.life <= 0) return false

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()

      return true
    })

    if (particles.current.length > 0) {
      animFrame.current = requestAnimationFrame(animate)
    } else {
      animFrame.current = 0
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
        canvasRef.current = null
      }
    }
  }

  return fire
}

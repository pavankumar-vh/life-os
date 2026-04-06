'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store'

/**
 * Draws a canvas-based favicon that matches the current accent color.
 * Re-runs when accentColor changes in the app store.
 */
export function DynamicFavicon() {
  const accentColor = useAppStore(s => s.accentColor)

  useEffect(() => {
    const size = 32
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const r = 7 // border-radius

    // Background rounded rect
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(size - r, 0)
    ctx.quadraticCurveTo(size, 0, size, r)
    ctx.lineTo(size, size - r)
    ctx.quadraticCurveTo(size, size, size - r, size)
    ctx.lineTo(r, size)
    ctx.quadraticCurveTo(0, size, 0, size - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fillStyle = '#0a0a0a'
    ctx.fill()

    // Subtle bg glow using accent color
    const bgGlow = ctx.createRadialGradient(16, 16, 2, 16, 16, 20)
    bgGlow.addColorStop(0, `${accentColor}22`)
    bgGlow.addColorStop(1, 'transparent')
    ctx.fillStyle = bgGlow
    ctx.fill()

    // Lightning bolt zap shape (same proportions as SVG: viewBox 0 0 32 32)
    // path: M19 4 L10 18 h7 l-4 10 l13-16 h-8 l2-8z
    const zapGrad = ctx.createLinearGradient(10, 4, 23, 28)
    zapGrad.addColorStop(0, lighten(accentColor, 0.15))
    zapGrad.addColorStop(1, accentColor)

    ctx.beginPath()
    ctx.moveTo(19, 4)
    ctx.lineTo(10, 18)
    ctx.lineTo(17, 18)
    ctx.lineTo(13, 28)
    ctx.lineTo(26, 12)
    ctx.lineTo(18, 12)
    ctx.lineTo(20, 4)    // close back to start region
    ctx.closePath()
    ctx.fillStyle = zapGrad
    ctx.fill()

    // Apply as favicon
    const link: HTMLLinkElement =
      document.querySelector("link[rel~='icon']") ||
      (() => {
        const el = document.createElement('link')
        el.rel = 'icon'
        document.head.appendChild(el)
        return el
      })()
    link.href = canvas.toDataURL('image/png')
    link.type = 'image/png'
  }, [accentColor])

  return null
}

/** Lighten a hex color by mixing with white */
function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.round((num >> 16) + (255 - (num >> 16)) * amount))
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount))
  const b = Math.min(255, Math.round((num & 0xff) + (255 - (num & 0xff)) * amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

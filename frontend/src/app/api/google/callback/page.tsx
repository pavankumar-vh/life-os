'use client'
import { useEffect } from 'react'

// Legacy redirect — all Google OAuth now goes through /auth/google/callback
export default function LegacyGoogleCallback() {
  useEffect(() => {
    // Preserve query params (code, state, error) and redirect
    window.location.replace('/auth/google/callback' + window.location.search)
  }, [])
  return null
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LifeOS — Your Personal Command Center',
  description: 'Track habits, journal, gym, diet, tasks, and goals. All in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg">{children}</body>
    </html>
  )
}

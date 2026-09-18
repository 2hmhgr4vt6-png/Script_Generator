import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'Bhasika AI Content Studio',
    template: '%s · Bhasika AI Content Studio',
  },
  description: 'Your content research, powered by AI. Turn real audience problems into content people care about.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-canvas font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}

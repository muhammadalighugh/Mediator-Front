import type { Metadata } from 'next'
import { Bebas_Neue } from 'next/font/google'
import './globals.css'

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MediFact',
  description: 'AI-powered live argument mediation with evidence-grounded verdicts',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={bebasNeue.variable}>
      <body className="min-h-screen bg-[#0f1117] text-[#e8eaf0] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}

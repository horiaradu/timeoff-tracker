import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Time off',
  description: 'Track vacation days and generate leave requests',
}

/**
 * Settles the theme before the first paint, otherwise a dark-mode visitor sees
 * a white flash. Runs from the stored choice, falling back to the device.
 */
const applyTheme = `
try {
  var choice = localStorage.getItem('theme')
  var dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme =
    choice === 'light' || choice === 'dark' ? choice : dark ? 'dark' : 'light'
} catch (error) {}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Script id="theme" strategy="beforeInteractive">
          {applyTheme}
        </Script>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

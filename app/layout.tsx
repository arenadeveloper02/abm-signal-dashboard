import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Poppins } from 'next/font/google'
import './globals.css'
import { ArenaEmailProvider } from '@/components/arena-email-provider'
import { getArenaEmailId } from '@/lib/arena-email'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Account Signal Tracker',
  description:
    'Upload a company list (CSV or XLSX) and track ABM account signals across funding, C-suite, product and partnership activity.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const emailId = await getArenaEmailId()
  return (
    <html lang="en">
      <body className={`${poppins.className} antialiased`}>
        <ArenaEmailProvider emailId={emailId}>{children}</ArenaEmailProvider>
      </body>
    </html>
  )
}

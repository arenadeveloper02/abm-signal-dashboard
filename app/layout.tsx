import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Poppins } from 'next/font/google'
import './globals.css'
import { ArenaEmailProvider } from '@/components/arena-email-provider'
import { getArenaEmailId } from '@/lib/arena-email'

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'ABM Signal Tracker',
  description:
    'Arena-themed analytics dashboard for ABM signals across funding, C-suite, product and partnership activity.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const emailId = await getArenaEmailId()
  return (
    <html lang="en">
      <body className={`${poppins.className} bg-[#121318] text-[#F2F3F5] antialiased`}>
        <ArenaEmailProvider emailId={emailId}>{children}</ArenaEmailProvider>
      </body>
    </html>
  )
}

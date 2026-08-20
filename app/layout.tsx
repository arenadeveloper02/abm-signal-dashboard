import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { ArenaEmailProvider } from '@/components/arena-email-provider';
import { getArenaEmailId } from '@/lib/arena-email';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ABM Signal Tracker',
  description:
    'Arena-themed ABM analytics dashboard tracking funding, C-suite, product and partnership signals.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const emailId = await getArenaEmailId();
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#0A0C10] text-[#E5EAF2] antialiased`}>
        <ArenaEmailProvider emailId={emailId}>{children}</ArenaEmailProvider>
      </body>
    </html>
  );
}

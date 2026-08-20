import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const defaultEmail = process.env.NEXT_PUBLIC_DEFAULT_EMAIL ?? 'sakshi.mishra@position2.com'
  return <DashboardClient defaultEmail={defaultEmail} />
}

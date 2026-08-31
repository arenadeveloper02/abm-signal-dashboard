import DashboardClient from '@/components/DashboardClient'
import ChatWidget from '@/components/ChatWidget'
import { getArenaEmailId } from '@/lib/arena-email'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const emailId = await getArenaEmailId()
  return (
    <>
      <DashboardClient defaultEmail={emailId ?? ''} />
      <ChatWidget />
    </>
  )
}

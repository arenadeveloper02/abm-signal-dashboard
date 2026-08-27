import AccountSignalTrackerClient from '@/components/AccountSignalTrackerClient'
import ChatWidget from '@/components/ChatWidget'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <>
      <AccountSignalTrackerClient />
      <ChatWidget />
    </>
  )
}

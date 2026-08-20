import DashboardClient from '@/components/DashboardClient';
import { getDashboardPayload } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const payload = getDashboardPayload();
  return <DashboardClient payload={payload} />;
}

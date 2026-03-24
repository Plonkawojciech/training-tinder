import { cookies } from 'next/headers'
import LandingPage from '@/components/landing-page'

export default async function HomePage() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('tt_auth')
  return <LandingPage userId={authCookie?.value ? 'authenticated' : null} />
}

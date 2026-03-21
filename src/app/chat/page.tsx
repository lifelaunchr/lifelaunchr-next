import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Soar by LifeLaunchr</h1>
          <p className="text-slate-400 text-sm">Your AI-powered college advisor</p>
        </div>
        <div className="text-slate-300 text-sm">
          Welcome, {user?.firstName || 'there'}
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 text-slate-500">
          <div className="text-6xl">🚀</div>
          <h2 className="text-2xl font-semibold text-slate-700">Chat coming soon</h2>
          <p>Authentication working ✓ — building the chat interface next</p>
        </div>
      </div>
    </main>
  )
}

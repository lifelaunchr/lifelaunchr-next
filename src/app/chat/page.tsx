import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await currentUser()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ backgroundColor: '#1a1a2e' }} className="text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Soar by LifeLaunchr</h1>
          <p className="text-sm opacity-70">Your AI-powered college advisor</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {user?.firstName || 'there'}!
          </h2>
          <p className="text-gray-600 mb-6">
            The chat interface is coming in Phase 2. Auth is working!
          </p>
          <div className="bg-indigo-50 rounded-lg p-4 text-left">
            <p className="text-sm font-medium text-indigo-800 mb-1">✅ Phase 1 Complete:</p>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>• Next.js with App Router</li>
              <li>• Clerk authentication</li>
              <li>• Tailwind CSS + shadcn/ui</li>
              <li>• TypeScript</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

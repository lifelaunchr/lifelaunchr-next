import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function ChatPage() {
  const { userId } = await auth()
  const user = userId ? await currentUser() : null

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Soar by LifeLaunchr</h1>
          <p className="text-slate-400 text-xs">Your AI-powered college advisor</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <span className="text-slate-300">{user.firstName || user.emailAddresses[0]?.emailAddress}</span>
          ) : (
            <>
              <Link href="/sign-in" className="text-slate-300 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md font-medium transition-colors"
              >
                Get started free
              </Link>
            </>
          )}
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

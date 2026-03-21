import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect('/chat')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Soar</h1>
        <p className="text-xl text-slate-300">
          Your AI-powered college and career planning advisor
        </p>
        <p className="text-slate-400">
          1,800+ colleges · 7,000+ scholarships · Expert counselor methodology
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/sign-in"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Get started free
          </Link>
        </div>
        <div className="pt-2">
          <Link
            href="/chat?guest=1"
            className="text-slate-400 hover:text-slate-300 text-sm underline underline-offset-4 transition-colors"
          >
            Continue as guest
          </Link>
        </div>
      </div>
    </main>
  )
}

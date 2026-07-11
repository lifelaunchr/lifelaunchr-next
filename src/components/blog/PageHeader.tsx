import Link from 'next/link'

export default function PageHeader() {
  return (
    <header className="border-b border-gray-100">
      <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-gray-900 tracking-tight">
          Soar
        </Link>
        <nav className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/blog" className="hover:text-gray-800 transition-colors">Blog</Link>
          <Link href="/webinars" className="hover:text-gray-800 transition-colors">Webinars</Link>
          <Link href="/chat" className="hover:text-gray-800 transition-colors">Go to app →</Link>
        </nav>
      </div>
    </header>
  )
}

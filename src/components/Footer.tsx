import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
        <span>© 2026 LifeLaunchr, Inc. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a
            href="mailto:help@lifelaunchr.com"
            className="hover:text-gray-700 transition-colors"
          >
            Give feedback
          </a>
          <Link href="/faq" className="hover:text-gray-700 transition-colors">
            FAQ
          </Link>
          <Link href="/safety" className="hover:text-gray-700 transition-colors">
            Safety
          </Link>
          <Link href="/terms" className="hover:text-gray-700 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-gray-700 transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  )
}

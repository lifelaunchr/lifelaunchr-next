import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <SignUp fallbackRedirectUrl="/onboarding" />
    </main>
  )
}

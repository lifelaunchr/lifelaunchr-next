import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900">
      <SignIn
        appearance={{
          elements: {
            // Hide the "Don't have an account? Sign up" footer link.
            // Real sign-up prevention is enforced in Clerk Dashboard →
            // Configure → Restrictions → Sign-up mode: Restricted.
            footerAction: { display: 'none' },
          },
        }}
      />
    </main>
  )
}

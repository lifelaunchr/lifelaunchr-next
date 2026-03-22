import { auth, currentUser } from '@clerk/nextjs/server'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function ChatPage() {
  const { userId } = await auth()
  const user = userId ? await currentUser() : null

  return (
    <ChatInterface
      userId={userId ?? null}
      userName={user?.firstName || user?.emailAddresses[0]?.emailAddress || null}
    />
  )
}

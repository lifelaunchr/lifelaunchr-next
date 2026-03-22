import { auth } from '@clerk/nextjs/server'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function ChatPage() {
  const { userId } = await auth()

  return (
    <ChatInterface
      userId={userId ?? null}
    />
  )
}

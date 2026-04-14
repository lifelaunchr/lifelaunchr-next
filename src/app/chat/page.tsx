import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat/ChatInterface'

export default async function ChatPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/')
  }

  return (
    <ChatInterface
      userId={userId}
    />
  )
}

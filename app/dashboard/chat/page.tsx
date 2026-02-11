import { ChatInterface } from "@/components/chat-interface"
import { ChatSidebar } from "@/components/chat-sidebar"

export default function ChatPage() {
  return (
    <div className="flex h-full">
      <ChatSidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border/50 p-4 bg-background/95 backdrop-blur">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-balance">AI Chat Assistant</h1>
            <p className="text-muted-foreground text-pretty">
              Ask questions about your documents and get intelligent answers with citations
            </p>
          </div>
        </div>
        <ChatInterface />
      </div>
    </div>
  )
}

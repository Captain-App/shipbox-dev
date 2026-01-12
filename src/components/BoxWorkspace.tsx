import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Bot, User, ExternalLink, Maximize2, Minimize2, ChevronLeft } from "lucide-react"
import { cn } from "../lib/utils"
import { Button } from "./ui/Button"
import type { Sandbox } from "../lib/api"

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hello! I'm your Sandbox Box agent. I'm currently running in London (LHR) and ready to help. What would you like me to work on?",
    timestamp: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: '2',
    role: 'user',
    content: "Can you set up a basic landing page for the project?",
    timestamp: new Date(Date.now() - 1000 * 60 * 4)
  },
  {
    id: '3',
    role: 'assistant',
    content: "Absolutely! I'll create a modern landing page with a hero section, feature highlights, and a call-to-action. I'm using Tailwind CSS and deploying to your Workers site. Give me a moment...",
    timestamp: new Date(Date.now() - 1000 * 60 * 3)
  },
  {
    id: '4',
    role: 'assistant',
    content: "Done! I've deployed the landing page. You can see it in the preview panel. It includes:\n\n• Hero section with gradient background\n• Three feature cards\n• Email signup form\n• Responsive design\n\nWant me to make any changes?",
    timestamp: new Date(Date.now() - 1000 * 60 * 1)
  }
]

interface ChatPanelProps {
  sandbox: Sandbox
}

export function ChatPanel({ sandbox }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm working on that now. You'll see the changes reflected in the preview panel shortly.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, agentMessage])
      setIsTyping(false)
    }, 2000)
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold">{sandbox.title || sandbox.id}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Cloudflare Sandbox</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' && "flex-row-reverse")}>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              msg.role === 'assistant' ? "bg-primary/20" : "bg-white/10"
            )}>
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-primary" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className={cn(
              "max-w-[80%] p-3 rounded-2xl text-sm",
              msg.role === 'assistant' 
                ? "bg-white/5 rounded-tl-sm" 
                : "bg-primary/20 text-primary-foreground rounded-tr-sm"
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <div className="text-[9px] text-muted-foreground mt-2 uppercase tracking-wider">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-white/5 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask your agent anything..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface BoxWorkspaceProps {
  sandbox: Sandbox
  onClose: () => void
}

export function BoxWorkspace({ sandbox, onClose }: BoxWorkspaceProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeMobileTab, setActiveMobileTab] = useState<'chat' | 'preview'>('chat')
  const [chatWidth] = useState(380)

  const iframeUrl = sandbox.webUiUrl

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col">
      {/* Toolbar */}
      <div className="h-12 md:h-14 bg-slate-950 border-b border-white/5 flex items-center justify-between px-2 md:px-4">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
          </button>
          <div className="h-4 w-px bg-white/10 shrink-0" />
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-sm font-bold truncate">{sandbox.title || sandbox.id}</span>
          </div>
        </div>

        {/* Mobile Tab Toggle */}
        <div className="flex items-center bg-white/5 rounded-lg p-1 md:hidden">
          <button
            onClick={() => setActiveMobileTab('chat')}
            className={cn(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
              activeMobileTab === 'chat' ? "bg-primary text-white" : "text-muted-foreground"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveMobileTab('preview')}
            className={cn(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
              activeMobileTab === 'preview' ? "bg-primary text-white" : "text-muted-foreground"
            )}
          >
            Preview
          </button>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="sm" className="gap-2 hidden sm:flex">
            <ExternalLink className="w-3 h-3" />
            <span className="hidden lg:inline">Open in New Tab</span>
          </Button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden md:block"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat Panel */}
        <div className={cn(
          "flex-shrink-0 transition-all duration-300 md:relative md:translate-x-0 md:opacity-100",
          isFullscreen ? "hidden" : "w-full md:w-[380px]",
          activeMobileTab === 'chat' ? "translate-x-0 opacity-100" : "absolute inset-0 -translate-x-full opacity-0 md:relative md:translate-x-0 md:opacity-100"
        )}>
          <ChatPanel sandbox={sandbox} />
        </div>

        {/* Preview Frame */}
        <div className={cn(
          "flex-1 bg-white relative transition-all duration-300",
          activeMobileTab === 'preview' ? "translate-x-0 opacity-100" : "absolute inset-0 translate-x-full opacity-0 md:relative md:translate-x-0 md:opacity-100"
        )}>
          <iframe 
            src={iframeUrl}
            className="w-full h-full border-0"
            title={`${sandbox.title || sandbox.id} Preview`}
          />
          
          {/* Fallback content for demo */}
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pointer-events-none">
            <div className="text-center space-y-4 md:space-y-6 max-w-lg px-6">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-3xl bg-primary/20 flex items-center justify-center">
                <Bot className="w-8 h-8 md:w-10 md:h-10 text-primary" />
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-white">
                {sandbox.title || sandbox.id}
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                This is your box's hosted preview. Your agent can deploy websites, APIs, and admin dashboards here.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Cloudflare Sandbox</span>
                <span className="hidden xs:inline">•</span>
                <span>Workers for Platforms</span>
                <span className="hidden xs:inline">•</span>
                <span className="text-green-500">Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




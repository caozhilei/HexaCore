
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Bot, User, ChevronLeft } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useParams } from 'next/navigation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Agent {
  id: string
  name: string
  config: any
}

export default function ChatPage() {
  const params = useParams()
  const agentId = params.id as string
  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  
  // WebSocket connection state
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)

  // Load Agent
  useEffect(() => {
    async function loadAgent() {
      const { data } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()
      
      if (data) setAgent(data)
    }
    loadAgent()
  }, [agentId])

  // Initialize WebSocket
  useEffect(() => {
    // In a real Docker env, this would point to the backend service
    // For local dev, we assume backend is at localhost:18790
    // Note: This requires the backend 'web-adapter' to be running and exposing WS
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18790/ws/chat'
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('Connected to chat server')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      console.log('Received WebSocket message:', event.data)
      try {
        const payload = JSON.parse(event.data)
        // Handle incoming message from agent
        // Backend format: { type: 'message', data: { content: '...', contentType: '...', ... } }
        if (payload.type === 'message' && payload.data && payload.data.content) {
             setMessages(prev => [...prev, {
                role: 'assistant',
                content: payload.data.content,
                timestamp: payload.data.timestamp || Date.now()
             }])
        } else if (payload.content && payload.content.text) {
             // Fallback for older format if any
             setMessages(prev => [...prev, {
                role: 'assistant',
                content: payload.content.text,
                timestamp: Date.now()
             }])
        }
      } catch (e) {
        console.error('Failed to parse message', e)
      }
      setLoading(false)
    }

    ws.onclose = () => {
        setConnected(false)
        console.log('Disconnected from chat server')
    }

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [])

  // Auto scroll
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !connected) return

    const userMsg: Message = {
        role: 'user',
        content: input,
        timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Send to WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        const payload = {
            channel: 'web',
            accountId: 'web-user', // In real app, use auth user id
            peer: {
                id: 'web-user',
                kind: 'dm'
            },
            message: userMsg.content,
            content: {
                type: 'text',
                text: userMsg.content
            },
            metadata: {
                targetAgentId: agentId,
                common: {
                  agentId
                }
            }
        }
        socket.send(JSON.stringify(payload))
    }
  }

  if (!agent) return <div>Loading agent...</div>

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border">
              <AvatarFallback className="bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-sm font-semibold leading-none">{agent.name}</h1>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Optional: Add settings/more button here */}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4 md:p-6" ref={scrollRef}>
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-muted p-4">
                  <Bot className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Send a message to start chatting with {agent.name}
                  </p>
                </div>
              </div>
            ) : (
                <div className="flex flex-col gap-6 pb-20">
                    {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                        <Avatar className="mt-0.5 h-8 w-8 border shadow-sm">
                            <AvatarFallback className="bg-background">
                            <Bot className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        )}
                        
                        <div className={`group relative max-w-[85%] space-y-1 md:max-w-[75%]`}>
                        <div
                            className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                            msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                : 'bg-background border rounded-tl-sm'
                            }`}
                        >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className={`block text-[10px] text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 ${
                            msg.role === 'user' ? 'text-right' : 'text-left'
                        }`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        </div>

                        {msg.role === 'user' && (
                        <Avatar className="mt-0.5 h-8 w-8 border shadow-sm">
                            <AvatarFallback className="bg-muted">
                            <User className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                        )}
                    </div>
                    ))}
                    
                    {loading && (
                    <div className="flex gap-3 justify-start">
                        <Avatar className="mt-0.5 h-8 w-8 border shadow-sm">
                        <AvatarFallback className="bg-background">
                            <Bot className="h-4 w-4" />
                        </AvatarFallback>
                        </Avatar>
                        <div className="bg-background border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40" />
                        </div>
                        </div>
                    </div>
                    )}
                </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-background/50 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <form onSubmit={handleSend} className="relative flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Message ${agent.name}...`}
              disabled={!connected}
              className="flex-1 border-0 bg-transparent px-3 py-2.5 focus-visible:ring-0 shadow-none placeholder:text-muted-foreground/50"
              autoFocus
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!connected || loading || !input.trim()}
              className="h-9 w-9 shrink-0 transition-all"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <div className="mt-2 text-center">
            <p className="text-[10px] text-muted-foreground/50">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, ArrowLeft, Phone, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { mockMessages } from '@/lib/mock-data'
import type { Message } from '@/lib/mock-data'

// Chat ativo mockado
const activeChat = {
  id: '1',
  partnerName: 'Maria Santos',
  partnerInitials: 'MS',
  lastSeen: 'Online agora',
  ride: {
    origin: 'Estação Pinheiros',
    destination: 'CESU - Campus Centro',
    time: '07:30'
  }
}

export default function DriverChatPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: String(messages.length + 1),
      senderId: '1',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    }

    setMessages([...messages, message])
    setNewMessage('')

    // Simula resposta automática
    setTimeout(() => {
      const autoReply: Message = {
        id: String(messages.length + 2),
        senderId: '2',
        content: 'Perfeito, obrigada!',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isOwn: false
      }
      setMessages(prev => [...prev, autoReply])
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col md:h-[calc(100vh-5rem)]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link href="/driver/home" className="md:hidden">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {activeChat.partnerInitials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <p className="font-semibold text-foreground">{activeChat.partnerName}</p>
          <p className="text-xs text-muted-foreground">{activeChat.lastSeen}</p>
        </div>

        <Button variant="ghost" size="icon">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Ride Info */}
      <div className="border-b border-border bg-muted/30 px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Carona: {activeChat.ride.origin} → {activeChat.ride.destination} às {activeChat.ride.time}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.isOwn ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2',
                  message.isOwn
                    ? 'rounded-br-md bg-primary text-primary-foreground'
                    : 'rounded-bl-md bg-secondary text-secondary-foreground'
                )}
              >
                <p className="text-sm">{message.content}</p>
                <p
                  className={cn(
                    'mt-1 text-right text-xs',
                    message.isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}
                >
                  {message.timestamp}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

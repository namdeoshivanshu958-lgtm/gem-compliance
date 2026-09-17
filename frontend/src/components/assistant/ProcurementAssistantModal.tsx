import React, { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  Bot,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'
import axios from 'axios'

interface Message {
  sender: 'user' | 'assistant'
  text: string
}

export default function ProcurementAssistantModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I am the **CPCL Procurement Assistant**.\n\nI answer queries using live tender, bidder compliance, and blockchain audit data without hallucination.\n\n**Try asking:**\n- *\"Why did Struggling Supplies fail?\"*\n- *\"Which bidders have mandatory failures?\"*\n- *\"Show high-risk documents requiring manual review.\"*\n- *\"Compare all active bidders on tender.\"*",
    },
  ])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function handleSend(queryText?: string) {
    const textToSend = queryText || input.trim()
    if (!textToSend || loading) return

    const userMsg: Message = { sender: 'user', text: textToSend }
    setMessages((prev) => [...prev, userMsg])
    if (!queryText) setInput('')
    setLoading(true)

    try {
      const res = await axios.post('/api/assistant/chat', {
        message: textToSend,
      })
      const botMsg: Message = {
        sender: 'assistant',
        text: res.data?.response || 'No data returned from procurement assistant.',
      }
      setMessages((prev) => [...prev, botMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sorry, I encountered an error querying live procurement data. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-50 bg-[#0b1f3a] hover:bg-slate-800 text-white p-3.5 rounded-full shadow-2xl border-2 border-amber-500 flex items-center gap-2 group transition-all"
        title="Open AI Procurement Assistant"
      >
        <Sparkles className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-bold hidden sm:inline pr-1">
          Procurement Assistant
        </span>
      </button>

      {/* Assistant Modal Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[95vw] sm:w-[440px] h-[560px] bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Top Bar */}
          <div className="bg-[#0b1f3a] text-white p-3.5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  CPCL Procurement Assistant
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-800">
                    Live Data
                  </span>
                </div>
                <div className="text-[10px] text-slate-300">
                  Grounded in actual database &amp; deterministic rules
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="bg-slate-50 border-b border-slate-200 p-2 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
            <button
              onClick={() => handleSend('Why did Struggling Supplies fail?')}
              className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-400 text-slate-700 whitespace-nowrap shadow-xs"
            >
              Why did Struggling Supplies fail?
            </button>
            <button
              onClick={() => handleSend('Which bidders have mandatory failures?')}
              className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-400 text-slate-700 whitespace-nowrap shadow-xs"
            >
              Mandatory failures?
            </button>
            <button
              onClick={() => handleSend('Show high-risk documents requiring manual review.')}
              className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-400 text-slate-700 whitespace-nowrap shadow-xs"
            >
              High-risk documents?
            </button>
            <button
              onClick={() => handleSend('Compare all active bidders on tender.')}
              className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-amber-400 text-slate-700 whitespace-nowrap shadow-xs"
            >
              Compare bidders
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs bg-slate-50/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#0b1f3a] text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-lg max-w-[85%] leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-[#1f5faf] text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-xs text-slate-400 italic">
                <Bot className="w-4 h-4 text-amber-500 animate-spin" />
                Querying procurement engine and database...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about tenders, scores, failure causes, or rules..."
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#0b1f3a] hover:bg-slate-800 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

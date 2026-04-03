'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore, useSettingsStore } from '@/store'
import { ListSkeleton } from '@/components/Skeletons'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2, Bot, User, Sparkles, MessageSquare, Key, ArrowDown } from 'lucide-react'

const SUGGESTIONS = [
  'How has my mood been this week?',
  'What habits am I doing well with?',
  'Summarize my pending tasks',
  'How are my goals progressing?',
  'What patterns do you see in my journal?',
  'Give me a wellness check based on my data',
]

export function ChatView() {
  const { messages, isLoading, isStreaming, fetchMessages, sendMessage, clearChat } = useChatStore()
  const [input, setInput] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasApiKey = useSettingsStore(s => {
    const provider = s.aiProvider || 'openai'
    return !!s.aiKeys[provider]
  })

  useEffect(() => { fetchMessages().catch(() => {}) }, [fetchMessages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const renderMarkdown = (text: string) => {
    const codeBlocks: string[] = []
    let processed = text.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      codeBlocks.push(`<pre class="bg-bg-elevated rounded-lg p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">${escapeHtml(code)}</code></pre>`)
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`
    })
    const inlineCode: string[] = []
    processed = processed.replace(/`(.*?)`/g, (_, code) => {
      inlineCode.push(`<code class="bg-bg-elevated px-1 py-0.5 rounded text-accent text-sm">${escapeHtml(code)}</code>`)
      return `__INLINE_CODE_${inlineCode.length - 1}__`
    })
    processed = escapeHtml(processed)
    processed = processed
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-text-primary mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-text-primary mt-3 mb-1">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-text-primary mt-3 mb-1">$1</h1>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-text-secondary">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 list-decimal text-text-secondary">$2</li>')
      .replace(/\n/g, '<br/>')
    codeBlocks.forEach((block, i) => { processed = processed.replace(`__CODE_BLOCK_${i}__`, block) })
    inlineCode.forEach((code, i) => { processed = processed.replace(`__INLINE_CODE_${i}__`, code) })
    return processed
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">AI Assistant</h1>
            <p className="text-xs text-text-muted">Ask anything about your life data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!hasApiKey && (
            <button
              onClick={() => {
                const key = prompt('Enter your API key:')
                if (key?.trim()) {
                  const s = useSettingsStore.getState()
                  const provider = s.aiProvider || 'openai'
                  s.updateSettings({ aiKeys: { ...s.aiKeys, [provider]: key.trim() } })
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              Add API Key
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated text-text-muted text-xs hover:text-red-soft hover:bg-red-soft/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto rounded-2xl bg-bg-elevated border border-border/30 p-4 space-y-4 relative"
      >
        {isLoading ? (
          <ListSkeleton />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">Your Personal AI</h2>
            <p className="text-sm text-text-muted max-w-md mb-8">
              I have access to your journal, habits, tasks, goals, workouts, sleep, and more.
              Ask me anything about your life data or just chat.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="text-left px-3 py-2.5 rounded-xl bg-bg-elevated/80 border border-border/20 text-xs text-text-secondary hover:text-text-primary hover:border-accent/30 hover:bg-accent/5 transition-all"
                >
                  <MessageSquare className="w-3 h-3 inline mr-1.5 text-accent/60" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-accent/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-accent" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-accent text-[#1a1a1a] rounded-br-md'
                      : 'bg-bg-elevated/80 text-text-secondary rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className="prose-chat"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '') }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-accent/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <User className="w-3.5 h-3.5 text-accent" />
                  </div>
                )}
              </motion.div>
            ))}
            {isStreaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-7 h-7 rounded-xl bg-accent/10 flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-accent animate-pulse" />
                </div>
                <div className="bg-bg-elevated/80 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-bg-elevated border border-border/50 flex items-center justify-center text-text-muted hover:text-text-primary shadow-lg transition-colors"
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="mt-3 flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={hasApiKey ? 'Ask about your habits, mood, goals...' : 'Add your OpenAI API key to start chatting...'}
            disabled={isStreaming || !hasApiKey}
            rows={1}
            className="w-full resize-none rounded-xl bg-bg-elevated/80 border border-border/30 px-4 py-3 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-50"
            style={{ maxHeight: 120 }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || !hasApiKey}
            className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-[#1a1a1a] disabled:opacity-30 disabled:bg-bg-hover hover:bg-accent-warm transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-text-muted text-center mt-1.5">
        Powered by GPT-4o mini · Your data stays private
      </p>
    </div>
  )
}

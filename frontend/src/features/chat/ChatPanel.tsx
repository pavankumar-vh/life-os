'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useChatStore, useSettingsStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2, User, Sparkles, X, ArrowDown, Settings, ChevronDown, Zap, RotateCcw } from 'lucide-react'

const SUGGESTIONS = [
  { text: 'How has my mood been this week?', icon: '🧠' },
  { text: 'What habits am I doing well with?', icon: '🔥' },
  { text: 'Summarize my pending tasks', icon: '✅' },
  { text: 'How are my goals progressing?', icon: '🎯' },
  { text: 'Any patterns in my journal entries?', icon: '📓' },
  { text: 'Give me a wellness overview', icon: '💪' },
]

const PROVIDERS: { id: string; label: string; icon: string; models: { id: string; label: string }[] }[] = [
  {
    id: 'openai', label: 'OpenAI', icon: '⬡',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    ],
  },
  {
    id: 'gemini', label: 'Gemini', icon: '✦',
    models: [
      { id: 'gemini-2.0-flash', label: '2.0 Flash' },
      { id: 'gemini-2.0-flash-lite', label: '2.0 Flash Lite' },
      { id: 'gemini-1.5-flash', label: '1.5 Flash' },
      { id: 'gemini-1.5-pro', label: '1.5 Pro' },
    ],
  },
  {
    id: 'anthropic', label: 'Claude', icon: '◈',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Sonnet 4' },
      { id: 'claude-3-5-haiku-20241022', label: '3.5 Haiku' },
      { id: 'claude-3-5-sonnet-20241022', label: '3.5 Sonnet' },
    ],
  },
]

function getStoredProvider(): string {
  return useSettingsStore.getState().aiProvider || 'openai'
}
function getStoredModel(provider: string): string {
  return useSettingsStore.getState().aiModels[provider] || PROVIDERS.find(p => p.id === provider)?.models[0]?.id || ''
}
function getStoredKey(provider: string): string {
  return useSettingsStore.getState().aiKeys[provider] || ''
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { messages, isLoading, isStreaming, fetchMessages, sendMessage, clearChat } = useChatStore()
  const [input, setInput] = useState('')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [provider, setProvider] = useState(getStoredProvider)
  const [model, setModel] = useState(() => getStoredModel(getStoredProvider()))
  const [apiKeyInput, setApiKeyInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const currentProvider = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0]
  const hasKey = !!getStoredKey(provider)
  const currentModelLabel = currentProvider.models.find(m => m.id === model)?.label || model

  useEffect(() => {
    if (open) {
      fetchMessages().catch(() => { /* chat history load failure is non-critical */ })
      setTimeout(() => inputRef.current?.focus(), 350)
    }
  }, [open, fetchMessages])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 80)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    await sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') onClose()
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handleProviderChange = (pid: string) => {
    setProvider(pid)
    useSettingsStore.getState().updateSettings({ aiProvider: pid })
    setModel(getStoredModel(pid))
    setApiKeyInput('')
  }

  const handleModelChange = (mid: string) => {
    setModel(mid)
    const s = useSettingsStore.getState()
    useSettingsStore.getState().updateSettings({ aiModels: { ...s.aiModels, [provider]: mid } })
  }

  const handleSaveKey = () => {
    if (apiKeyInput.trim()) {
      const s = useSettingsStore.getState()
      useSettingsStore.getState().updateSettings({ aiKeys: { ...s.aiKeys, [provider]: apiKeyInput.trim() } })
      setApiKeyInput('')
      setShowConfig(false)
    }
  }

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const renderMarkdown = (text: string) => {
    // Extract code blocks first (preserve raw content)
    const codeBlocks: string[] = []
    let processed = text.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/, '').replace(/```$/, '')
      codeBlocks.push(`<pre class="bg-[#0d0d0d] rounded-lg p-2.5 my-2 overflow-x-auto border border-border/10"><code class="text-[11px] text-text-secondary font-mono leading-relaxed">${escapeHtml(code)}</code></pre>`)
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`
    })
    // Extract inline code
    const inlineCode: string[] = []
    processed = processed.replace(/`(.*?)`/g, (_, code) => {
      inlineCode.push(`<code class="bg-bg-elevated/80 px-1.5 py-0.5 rounded-md text-accent text-[11px] font-mono">${escapeHtml(code)}</code>`)
      return `__INLINE_CODE_${inlineCode.length - 1}__`
    })
    // Escape remaining HTML
    processed = escapeHtml(processed)
    // Apply markdown formatting
    processed = processed
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gm, '<h3 class="text-[13px] font-semibold text-text-primary mt-3 mb-1.5">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-sm font-semibold text-text-primary mt-3 mb-1.5">$1</h2>')
      .replace(/^- (.*$)/gm, '<div class="flex gap-1.5 ml-1 my-0.5"><span class="text-accent/50 mt-px">•</span><span class="text-text-secondary text-[12px] leading-relaxed">$1</span></div>')
      .replace(/^(\d+)\. (.*$)/gm, '<div class="flex gap-1.5 ml-1 my-0.5"><span class="text-accent/50 text-[11px] mt-px min-w-[14px]">$1.</span><span class="text-text-secondary text-[12px] leading-relaxed">$2</span></div>')
      .replace(/\n\n/g, '<div class="h-2"></div>')
      .replace(/\n/g, '<br/>')
    // Restore code blocks and inline code
    codeBlocks.forEach((block, i) => { processed = processed.replace(`__CODE_BLOCK_${i}__`, block) })
    inlineCode.forEach((code, i) => { processed = processed.replace(`__INLINE_CODE_${i}__`, code) })
    return processed
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — mobile only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 32, stiffness: 350 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[400px] z-50 flex flex-col"
            style={{
              background: 'rgba(8, 8, 8, 0.98)',
              backdropFilter: 'blur(24px) saturate(150%)',
              WebkitBackdropFilter: 'blur(24px) saturate(150%)',
              borderLeft: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '-8px 0 32px -8px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(232,213,183,0.15), rgba(232,213,183,0.05))', border: '1px solid rgba(232,213,183,0.1)' }}>
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-primary leading-tight">LifeOS AI</p>
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors leading-tight"
                  >
                    {currentProvider.icon} {currentModelLabel}
                    <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showConfig ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {messages.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={clearChat}
                    className="p-2 rounded-xl text-text-muted hover:text-red-soft hover:bg-red-soft/8 transition-colors"
                    title="Clear chat"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Config Dropdown */}
            <AnimatePresence>
              {showConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="p-3 space-y-3">
                    {/* Provider pills */}
                    <div className="flex gap-1.5 p-1 rounded-xl bg-bg-surface/50">
                      {PROVIDERS.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleProviderChange(p.id)}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                            provider === p.id
                              ? 'bg-accent/12 text-accent shadow-sm'
                              : 'text-text-muted hover:text-text-secondary'
                          }`}
                        >
                          <span className="text-xs">{p.icon}</span> {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Model grid */}
                    <div className="flex flex-wrap gap-1.5">
                      {currentProvider.models.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handleModelChange(m.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                            model === m.id
                              ? 'bg-accent/10 text-accent font-semibold ring-1 ring-accent/20'
                              : 'text-text-muted hover:text-text-secondary bg-bg-elevated/40 hover:bg-bg-elevated/60'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* API Key */}
                    {!hasKey ? (
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <input
                            type="password"
                            value={apiKeyInput}
                            onChange={e => setApiKeyInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                            placeholder={provider === 'openai' ? 'sk-...' : provider === 'gemini' ? 'AIza...' : 'sk-ant-...'}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-bg-elevated/60 border border-border/20 text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 font-mono transition-colors"
                          />
                          <button onClick={handleSaveKey} disabled={!apiKeyInput.trim()}
                            className="px-3 py-1.5 rounded-lg bg-accent text-[#1a1a1a] text-xs font-semibold hover:bg-accent-warm transition-colors disabled:opacity-30">
                            Save
                          </button>
                        </div>
                        <p className="text-[11px] text-text-muted">
                          {provider === 'openai' && <>Get key → <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">platform.openai.com</a></>}
                          {provider === 'gemini' && <>Get key → <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">aistudio.google.com</a></>}
                          {provider === 'anthropic' && <>Get key → <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">console.anthropic.com</a></>}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-green-soft/5 border border-green-soft/8">
                        <Zap className="w-3 h-3 text-green-soft" />
                        <span className="flex-1 text-xs text-green-soft font-medium">Connected</span>
                        <span className="text-[11px] text-text-muted font-mono">...{getStoredKey(provider).slice(-5)}</span>
                        <button onClick={() => { const s = useSettingsStore.getState(); const keys = { ...s.aiKeys }; delete keys[provider]; s.updateSettings({ aiKeys: keys }); setApiKeyInput('') }}
                          className="text-text-muted hover:text-red-soft p-0.5 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                    className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(232,213,183,0.12), rgba(232,213,183,0.04))',
                      border: '1px solid rgba(232,213,183,0.08)',
                      boxShadow: '0 0 24px -8px rgba(232, 213, 183, 0.12)',
                    }}
                  >
                    <Sparkles className="w-7 h-7 text-accent" />
                  </motion.div>
                  <motion.h3
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-semibold text-text-primary mb-1"
                  >
                    Hey, how can I help?
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[11px] text-text-muted max-w-[260px] mb-6 leading-relaxed"
                  >
                    I know your habits, journal, tasks, goals, workouts, and more. Ask me anything.
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="grid grid-cols-2 gap-2 w-full"
                  >
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(s.text); inputRef.current?.focus() }}
                        className="text-left px-3 py-2.5 rounded-xl text-[11px] text-text-secondary hover:text-text-primary transition-all hover:bg-accent/5 hover:border-accent/10"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <span className="text-sm mr-1">{s.icon}</span>
                        <span className="leading-snug">{s.text}</span>
                      </button>
                    ))}
                  </motion.div>
                </div>
              ) : (
                /* Chat Messages */
                <>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={msg._id}
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, delay: idx > messages.length - 3 ? 0.05 : 0 }}
                      className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-1" style={{ background: 'linear-gradient(135deg, rgba(232,213,183,0.12), rgba(232,213,183,0.04))', border: '1px solid rgba(232,213,183,0.08)' }}>
                          <Sparkles className="w-3 h-3 text-accent" />
                        </div>
                      )}
                      <div
                        className={`max-w-[82%] text-[12.5px] leading-[1.65] ${
                          msg.role === 'user'
                            ? 'bg-accent text-[#1a1a1a] rounded-2xl rounded-br-md px-3.5 py-2.5'
                            : 'text-text-secondary'
                        }`}
                      >
                        {msg.role === 'assistant' ? (
                          <div
                            className="[&_pre]:my-2 [&_code]:break-words"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '') }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-6 h-6 rounded-lg bg-accent/15 flex-shrink-0 flex items-center justify-center mt-1">
                          <User className="w-3 h-3 text-accent" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Streaming indicator */}
                  {isStreaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2.5"
                    >
                      <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(232,213,183,0.12), rgba(232,213,183,0.04))', border: '1px solid rgba(232,213,183,0.08)' }}>
                        <Sparkles className="w-3 h-3 text-accent animate-pulse" />
                      </div>
                      <div className="flex items-center gap-1 py-2">
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-accent/40"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom */}
            <AnimatePresence>
              {showScrollBtn && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-24 right-6 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary shadow-xl z-10 transition-colors"
                  style={{ background: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="shrink-0 px-4 pb-4 pt-2">
              {!hasKey ? (
                <button
                  onClick={() => setShowConfig(true)}
                  className="w-full py-3 rounded-2xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(232,213,183,0.08), rgba(232,213,183,0.03))',
                    border: '1px solid rgba(232,213,183,0.1)',
                    color: 'rgba(232,213,183,0.8)',
                  }}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Add {currentProvider.label} API Key to chat
                </button>
              ) : (
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    disabled={isStreaming}
                    rows={1}
                    className="w-full resize-none rounded-2xl px-4 py-3 pr-12 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none transition-all disabled:opacity-50"
                    style={{
                      maxHeight: 120,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(232,213,183,0.2)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
                  />
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className="absolute right-2.5 bottom-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-20"
                    style={{
                      background: input.trim() ? 'linear-gradient(135deg, rgba(232,213,183,0.9), rgba(201,168,124,0.9))' : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Send className={`w-3.5 h-3.5 ${input.trim() ? 'text-[#1a1a1a]' : 'text-text-muted'}`} />
                  </motion.button>
                </div>
              )}
              <p className="text-center text-[11px] text-text-muted mt-2">
                {currentProvider.icon} {currentProvider.label} · {currentModelLabel} · ⌘J to toggle
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

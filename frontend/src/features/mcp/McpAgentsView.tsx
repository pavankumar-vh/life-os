import { useState, useEffect } from 'react'
import { getApiBaseUrl } from '@/lib/api'
import { toast } from '@/components/Toast'
import { Loader2, Key, Trash2, Plus, Server, Code, RefreshCw, Terminal, Eye, EyeOff } from 'lucide-react'

export function McpAgentsView() {
  const [tokens, setTokens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [generatedToken, setGeneratedToken] = useState<{ name: string; token: string } | null>(null)
  
  const apiBase = getApiBaseUrl()
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null

  const fetchTokens = async () => {
    try {
      const res = await fetch(`${apiBase}/api/mcp-tokens`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (res.ok) setTokens(await res.json())
    } catch (err) {
      toast.error('Failed to load MCP tokens')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTokens()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTokenName.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${apiBase}/api/mcp-tokens`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}` 
        },
        body: JSON.stringify({ name: newTokenName.trim(), scopes: ['read', 'write'] })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create token')
      
      setGeneratedToken({ name: data.name, token: data.token })
      setNewTokenName('')
      fetchTokens()
    } catch (err: any) {
      toast.error(err.message)
    }
    setCreating(false)
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoking this token will immediately break any agents using it. Continue?')) return
    try {
      const res = await fetch(`${apiBase}/api/mcp-tokens/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to revoke token')
      toast.success('Token revoked')
      fetchTokens()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Token copied to clipboard!')
  }

  if (loading) {
    return <div className="card flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
  }

  return (
    <div className="space-y-6">
      
      {/* EXPLANATION */}
      <div className="card bg-accent/5 border-accent/20">
        <h3 className="text-sm font-medium flex items-center gap-2 mb-2 text-accent">
          <Server className="w-4 h-4" /> Model Context Protocol (MCP)
        </h3>
        <p className="text-xs text-text-secondary leading-relaxed">
          Life OS acts as an MCP server, allowing AI agents (like Claude Desktop, OpenClaw, cursor, etc.) to read and interact with your second-brain data.
        </p>
        <div className="mt-4 p-3 bg-bg-elevated rounded-lg space-y-2">
          <p className="text-xs font-medium text-text-primary">Connection Configuration</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-text-muted mb-1">Standard (SSE HTTP)</p>
              <code className="block p-2 bg-bg-card rounded text-xs text-accent font-mono select-all">
                {window.location.origin}/api/mcp/sse
              </code>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-text-muted mb-1">Local (CLI Stdio)</p>
              <code className="block p-2 bg-bg-card rounded text-xs text-accent font-mono select-all">
                npx tsx backend/src/mcp/index.ts
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* GENERATED TOKEN ALERT */}
      {generatedToken && (
        <div className="p-4 bg-green-soft/10 border border-green-soft/20 rounded-xl space-y-3">
          <h4 className="text-sm font-medium text-green-soft">Token Generated: {generatedToken.name}</h4>
          <p className="text-xs text-text-primary">
            Please copy your new MCP token. For your security, <strong className="text-red-400">it will never be shown again</strong>.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-[#0a0a0a] rounded-lg text-accent font-mono text-sm break-all select-all">
              {generatedToken.token}
            </code>
            <button onClick={() => copyToClipboard(generatedToken.token)} className="px-4 py-3 bg-green-soft text-[#0a0a0a] font-semibold rounded-lg hover:bg-green-soft/90 transition-colors">
              Copy
            </button>
          </div>
          <button onClick={() => setGeneratedToken(null)} className="text-xs text-text-muted hover:text-text-primary underline">
            I have saved this token
          </button>
        </div>
      )}

      {/* CREATE TOKEN FORM */}
      <div className="card space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" /> Dedicated Access Tokens
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Generate dedicated access tokens for your AI agents. These tokens bypass the standard 30-day session limit and can be individually revoked.
        </p>

        <form onSubmit={handleCreate} className="flex gap-2">
          <input 
            type="text" 
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="Token name (e.g., Claude Desktop, OpenClaw Agent)" 
            className="input flex-1 text-sm"
            disabled={creating}
          />
          <button 
            type="submit" 
            disabled={creating || !newTokenName.trim()}
            className="btn flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generate Token
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {tokens.map(t => (
            <div key={t._id} className="p-3 bg-bg-elevated rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                    {t.name}
                    {t.isRevoked && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[9px] uppercase tracking-wider rounded font-bold">Revoked</span>}
                    {!t.isRevoked && <span className="px-1.5 py-0.5 bg-green-soft/10 text-green-soft text-[9px] uppercase tracking-wider rounded font-bold">Active</span>}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Created: {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt && ` · Last used: ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleRevoke(t._id)}
                disabled={t.isRevoked}
                className={`p-2 rounded-lg transition-colors ${t.isRevoked ? 'text-text-muted/30 cursor-not-allowed' : 'text-text-muted hover:text-red-500 hover:bg-red-500/10'}`}
                title={t.isRevoked ? 'Already revoked' : 'Revoke Token'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {tokens.length === 0 && (
            <p className="text-sm text-text-muted text-center py-6 border border-dashed border-white/[0.05] rounded-xl">
              No active tokens. Generate one above to connect an agent.
            </p>
          )}
        </div>
      </div>

    </div>
  )
}

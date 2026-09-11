import { useState, useEffect } from 'react'
import { getApiBaseUrl } from '@/lib/api'
import { toast } from '@/components/Toast'
import { Loader2, Users, CheckCircle2, ShieldOff, Shield, Database, Activity, RefreshCw, Server, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react'

export function AdminView() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  
  const apiBase = getApiBaseUrl()
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${authToken}` }
      
      const [overviewRes, usersRes, auditRes] = await Promise.all([
        fetch(`${apiBase}/api/admin/overview`, { headers }),
        fetch(`${apiBase}/api/admin/users`, { headers }),
        fetch(`${apiBase}/api/admin/audit`, { headers })
      ])
      
      if (overviewRes.ok) setOverview(await overviewRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (auditRes.ok) setAuditLogs(await auditRes.json())
    } catch (err) {
      toast.error('Failed to load admin data')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAdminData()
  }, [])

  const handleAction = async (userId: string, action: 'approve' | 'disable' | 'enable') => {
    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`)
      toast.success(`User ${action}d`)
      fetchAdminData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user AND all their files permanently?')) return
    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete user')
      toast.success('User deleted')
      fetchAdminData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return <div className="card flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
  }

  return (
    <div className="space-y-6">
      
      {/* OVERVIEW STATS */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-bg-elevated border border-white/[0.05] rounded-xl flex flex-col gap-1">
            <span className="text-xs text-text-muted flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Total Users</span>
            <span className="text-2xl font-semibold text-text-primary">{overview.totalUsers}</span>
            <span className="text-[10px] text-text-muted">Limit: {overview.limits.maxUsers}</span>
          </div>
          <div className="p-4 bg-bg-elevated border border-amber-500/10 rounded-xl flex flex-col gap-1">
            <span className="text-xs text-amber-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Pending</span>
            <span className="text-2xl font-semibold text-amber-500">{overview.pendingUsers}</span>
            <span className="text-[10px] text-text-muted">Approval required: {overview.limits.requireApproval ? 'Yes' : 'No'}</span>
          </div>
          <div className="p-4 bg-bg-elevated border border-white/[0.05] rounded-xl flex flex-col gap-1">
            <span className="text-xs text-text-muted flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Vault Storage</span>
            <span className="text-2xl font-semibold text-text-primary">{(overview.totalStorageBytes / 1024 / 1024).toFixed(1)} MB</span>
            <span className="text-[10px] text-text-muted">Max: {overview.limits.maxVaultBytesPerUser} bytes/user</span>
          </div>
          <div className="p-4 bg-bg-elevated border border-white/[0.05] rounded-xl flex flex-col gap-1">
            <span className="text-xs text-text-muted flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Registration</span>
            <span className="text-2xl font-semibold text-text-primary">{overview.limits.registrationEnabled ? 'Open' : 'Closed'}</span>
            <span className="text-[10px] text-text-muted">Managed via .env</span>
          </div>
        </div>
      )}

      {/* USERS LIST */}
      <div className="card space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" /> Host Accounts
        </h3>
        
        <div className="divide-y divide-white/[0.05]">
          {users.map(u => (
            <div key={u._id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                  {u.name}
                  {u.isAdmin && <span className="px-1.5 py-0.5 bg-accent/10 text-accent text-[9px] uppercase tracking-wider rounded font-bold">Admin</span>}
                  {!u.isApproved && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] uppercase tracking-wider rounded font-bold">Pending</span>}
                  {u.isDisabled && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[9px] uppercase tracking-wider rounded font-bold">Disabled</span>}
                </p>
                <p className="text-xs text-text-muted">{u.email} · Level {u.level}</p>
              </div>
              <div className="flex items-center gap-2">
                {!u.isApproved && (
                  <button onClick={() => handleAction(u._id, 'approve')} className="px-3 py-1.5 bg-green-soft/10 text-green-soft hover:bg-green-soft/20 text-xs font-medium rounded-lg transition-colors">
                    Approve
                  </button>
                )}
                {u.isApproved && !u.isDisabled && !u.isAdmin && (
                  <button onClick={() => handleAction(u._id, 'disable')} className="px-3 py-1.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-xs font-medium rounded-lg transition-colors">
                    Disable
                  </button>
                )}
                {u.isDisabled && (
                  <button onClick={() => handleAction(u._id, 'enable')} className="px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent/20 text-xs font-medium rounded-lg transition-colors">
                    Enable
                  </button>
                )}
                {!u.isAdmin && (
                  <button onClick={() => handleDelete(u._id)} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete User">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-text-muted text-center py-4">No users found.</p>}
        </div>
      </div>

      {/* AUDIT LOGS */}
      <div className="card space-y-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" /> Security Audit Log
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {auditLogs.map(log => (
            <div key={log._id} className="p-3 bg-bg-elevated rounded-xl flex items-start gap-3">
              <div className="mt-0.5">
                {log.action === 'create' ? <CheckCircle2 className="w-4 h-4 text-green-soft" /> : 
                 log.action === 'delete' ? <Trash2 className="w-4 h-4 text-red-500" /> : 
                 <RefreshCw className="w-4 h-4 text-blue-soft" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary">
                  <span className="font-semibold">{log.action.toUpperCase()}</span> on <span className="font-mono text-accent">{log.collectionName}</span>
                </p>
                <p className="text-[10px] text-text-muted mt-1 font-mono truncate">
                  By: {log.userId} · Target: {log.documentId}
                </p>
              </div>
              <span className="text-[10px] text-text-muted shrink-0">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
          {auditLogs.length === 0 && <p className="text-sm text-text-muted text-center py-4">No security logs found.</p>}
        </div>
      </div>

    </div>
  )
}

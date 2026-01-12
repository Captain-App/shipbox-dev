import { Key, Trash2, Plus, ShieldCheck, Loader2, X, Save } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "./ui/Button"
import { api } from "../lib/api"

interface Secret {
  id: string
  name: string
  hint: string
  createdAt: number
  lastUsed?: number
}

export function SecretsVault() {
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newValue, setNewValue] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchSecrets = async () => {
    try {
      setLoading(true)
      const data = await api.getBoxSecrets()
      setSecrets(data)
    } catch (error) {
      console.error("Failed to fetch secrets:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecrets()
  }, [])

  const handleAddSecret = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newValue) return
    
    setSaving(true)
    try {
      await api.createBoxSecret(newName, newValue)
      setNewName("")
      setNewValue("")
      setIsAdding(false)
      await fetchSecrets()
    } catch (error) {
      alert("Failed to create secret")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSecret = async (id: string) => {
    if (!confirm("Are you sure you want to delete this secret?")) return
    
    try {
      await api.deleteBoxSecret(id)
      setSecrets(prev => prev.filter(s => s.id !== id))
    } catch (error) {
      alert("Failed to delete secret")
    }
  }

  const handleRevokeAll = async () => {
    if (!confirm("Are you sure you want to revoke ALL secrets? This cannot be undone.")) return
    
    try {
      await Promise.all(secrets.map(s => api.deleteBoxSecret(s.id)))
      setSecrets([])
    } catch (error) {
      alert("Failed to revoke all secrets")
    }
  }

  const formatLastUsed = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    const diff = Math.floor((Date.now() / 1000) - timestamp)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Secrets Vault</h2>
          <p className="text-muted-foreground">Managed credentials with automatic proxy redaction.</p>
        </div>
        <div className="flex gap-2">
          {secrets.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleRevokeAll}>Revoke All</Button>
          )}
          <Button 
            variant={isAdding ? "ghost" : "primary"} 
            size="sm" 
            className="gap-2"
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? "Cancel" : "Add Secret"}
          </Button>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
        </div>
        <p className="text-sm text-blue-200/80">
          Your credentials never enter the sandbox directly. The agent uses short-lived tokens proxied through our secure gateway.
        </p>
      </div>

      {isAdding && (
        <form onSubmit={handleAddSecret} className="p-8 rounded-[2rem] border border-primary/20 bg-primary/5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Secret Name</label>
              <input
                id="name"
                type="text"
                placeholder="e.g. GITHUB_TOKEN"
                value={newName}
                onChange={e => setNewName(e.target.value.toUpperCase())}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="value" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Secret Value</label>
              <input
                id="value"
                type="password"
                placeholder="Paste value here"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" variant="primary" size="sm" className="gap-2" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Secret
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : secrets.length === 0 ? (
          <div className="text-center py-12 p-8 rounded-3xl border border-white/5 bg-white/5">
            <p className="text-muted-foreground">No secrets found in your vault.</p>
          </div>
        ) : (
          secrets.map((secret) => (
            <div 
              key={secret.id}
              className="p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between group hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Key className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold font-mono">{secret.name}</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground">
                      ••••••••{secret.hint}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Used</div>
                  <div className="text-xs font-medium">{formatLastUsed(secret.lastUsed)}</div>
                </div>
                <button 
                  onClick={() => handleDeleteSecret(secret.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

import { Key, Eye, EyeOff, Trash2, Plus, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/Button"
import { cn } from "../lib/utils"

interface Secret {
  id: string
  name: string
  key: string
  lastUsed: string
}

const mockSecrets: Secret[] = [
  { id: '1', name: 'ANTHROPIC_API_KEY', key: 'sk-ant-api03-....................', lastUsed: '2 mins ago' },
  { id: '2', name: 'GITHUB_TOKEN', key: 'ghp_............................', lastUsed: '12 mins ago' },
  { id: '3', name: 'CLOUDFLARE_API_TOKEN', key: '................................', lastUsed: '1 hour ago' },
  { id: '4', name: 'STRIPE_SECRET_KEY', key: 'sk_test_........................', lastUsed: 'Yesterday' },
]

export function SecretsVault() {
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const toggleSecret = (id: string) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Secrets Vault</h2>
          <p className="text-muted-foreground">Managed credentials with automatic proxy redaction.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" size="sm">Revoke All</Button>
          <Button variant="primary" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Secret
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

      <div className="space-y-4">
        {mockSecrets.map((secret) => (
          <div 
            key={secret.id}
            className="p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Key className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-mono">{secret.name}</h3>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-muted-foreground">
                    {showSecrets[secret.id] ? secret.key : '••••••••••••••••••••••••••••••••'}
                  </span>
                  <button 
                    onClick={() => toggleSecret(secret.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSecrets[secret.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Used</div>
                <div className="text-xs font-medium">{secret.lastUsed}</div>
              </div>
              <button className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


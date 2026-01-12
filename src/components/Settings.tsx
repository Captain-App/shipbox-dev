import { Key, Github, Loader2, Save, Trash2, ExternalLink, ShieldCheck } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { Button } from "./ui/Button"
import { api } from "../lib/api"
import { SecretsVault } from "./SecretsVault"

export function Settings() {
  const [settings, setSettings] = useState<{ anthropicHint: string | null } | null>(null);
  const [githubStatus, setGithubStatus] = useState<{ installationId: number; accountLogin: string; accountType: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  
  // Use ref for uncontrolled input - more AI/automation friendly
  const anthropicKeyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      api.getSettings(),
      api.getGitHubStatus()
    ]).then(([s, g]) => {
      setSettings(s);
      setGithubStatus(g);
    }).catch(err => console.error("Failed to fetch settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveAnthropicKey = async () => {
    const anthropicKey = anthropicKeyRef.current?.value || '';
    if (!anthropicKey) return;
    setSavingKey(true);
    try {
      await api.setAnthropicKey(anthropicKey);
      const s = await api.getSettings();
      setSettings(s);
      if (anthropicKeyRef.current) anthropicKeyRef.current.value = '';
    } catch (err) {
      alert("Failed to save API key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteAnthropicKey = async () => {
    if (!confirm("Are you sure you want to remove your Anthropic API key?")) return;
    try {
      await api.deleteAnthropicKey();
      const s = await api.getSettings();
      setSettings(s);
    } catch (err) {
      alert("Failed to delete API key");
    }
  };

  const handleConnectGitHub = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    window.location.href = `${apiUrl}/github/install`;
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm("Are you sure you want to disconnect GitHub?")) return;
    try {
      await api.disconnectGitHub();
      setGithubStatus(null);
    } catch (err) {
      alert("Failed to disconnect GitHub");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      <div className="space-y-1">
        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-white">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your credentials and integrations.</p>
      </div>

      {/* Anthropic BYOK */}
      <div className="p-6 md:p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Key className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Anthropic API Key (BYOK)</span>
        </div>
        
        <div className="space-y-4">
          {settings?.anthropicHint ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-white">Custom key active</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{settings.anthropicHint}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDeleteAnthropicKey} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 w-full sm:w-auto">
                <Trash2 className="w-4 h-4 mr-2 sm:mr-0" />
                <span className="sm:hidden">Delete Key</span>
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-xs md:text-sm text-primary/80">
              Using platform-owned API key. Usage will be deducted from your credit balance.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={anthropicKeyRef}
              id="anthropic-key"
              name="anthropic-key"
              type="password"
              placeholder="Paste sk-ant-... key"
              aria-label="Anthropic API key"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleSaveAnthropicKey}
              disabled={savingKey}
              aria-label="Save Anthropic API key"
              className="gap-2 w-full sm:w-auto"
            >
              {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {settings?.anthropicHint ? 'Update' : 'Save Key'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            Your key is encrypted and stored securely.
          </p>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="p-6 md:p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Github className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">GitHub App Integration</span>
        </div>

        {githubStatus ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white shrink-0">
                  {githubStatus.accountLogin[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{githubStatus.accountLogin}</div>
                  <div className="text-xs text-muted-foreground">{githubStatus.accountType} account</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="ghost" size="sm" onClick={handleConnectGitHub} className="gap-2 w-full sm:w-auto">
                  <ExternalLink className="w-4 h-4" />
                  Manage
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDisconnectGitHub} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 w-full sm:w-auto">
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect the Shipbox GitHub App to allow sandboxes to access your private repositories.
            </p>
            <Button variant="primary" onClick={handleConnectGitHub} className="gap-2 w-full sm:w-auto">
              <Github className="w-4 h-4" />
              Connect GitHub App
            </Button>
          </div>
        )}
      </div>

      {/* Secrets Vault */}
      <div className="p-6 md:p-8 rounded-[2rem] border border-white/5 bg-white/5 overflow-hidden">
        <SecretsVault />
      </div>
    </div>
  )
}

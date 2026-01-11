import { useState, useEffect } from 'react'
import { Layout } from './components/Layout'
import { ActivityTimeline } from './components/ActivityTimeline'
import { AcceptanceModal } from './components/AcceptanceModal'
import { CapabilityMarketplace } from './components/CapabilityMarketplace'
import { SecretsVault } from './components/SecretsVault'
import { BillingDashboard } from './components/BillingDashboard'
import { Settings } from './components/Settings'
import { CreateSandboxModal } from './components/CreateSandboxModal'
import { BoxWorkspace } from './components/BoxWorkspace'
import { Shield, Zap, Box, Server, Clock, CheckCircle2, Globe, Play, Loader2 } from 'lucide-react'
import type { Sandbox } from './lib/api'
import { api } from './lib/api'
import { cn } from './lib/utils'
import { Button } from './components/ui/Button'
import { useAuth } from './contexts/AuthContext'
import { AuthPage } from './pages/Auth'

function App() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isAcceptanceOpen, setIsAcceptanceOpen] = useState(false)
  const [isKilled, setIsKilled] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([])
  const [activeSandbox, setActiveSandbox] = useState<Sandbox | null>(null)
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchSandboxes()
      
      // Handle GitHub callback
      const url = new URL(window.location.href);
      const installationId = url.searchParams.get("installation_id");
      if (installationId) {
        api.linkGitHub(installationId).then(() => {
          url.searchParams.delete("installation_id");
          url.searchParams.delete("setup_action");
          window.history.replaceState({}, "", url.toString());
          setActiveTab("settings");
        }).catch(err => console.error("Failed to link GitHub:", err));
      }
    }
  }, [user])

  const fetchSandboxes = async () => {
    try {
      setLoading(true)
      const data = await api.getSessions()
      setSandboxes(data)
      if (data.length > 0 && !activeSandbox) {
        setActiveSandbox(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch sandboxes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = () => {
    setIsUnlocked(true)
    setIsAcceptanceOpen(false)
  }

  const handleKill = () => {
    setIsKilled(true)
  }

  const handleCreateSandbox = async (name: string, region: string, repository?: string) => {
    try {
      const newSandbox = await api.createSession(name, region, repository)
      setSandboxes(prev => [newSandbox, ...prev])
      setActiveSandbox(newSandbox)
      setIsCreateModalOpen(false)
    } catch (error) {
      console.error('Failed to create sandbox:', error)
    }
  }

  const handleOpenBox = (sandbox?: Sandbox) => {
    if (sandbox) {
      setActiveSandbox(sandbox)
    }
    setIsWorkspaceOpen(true)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  // If workspace is open, render that instead
  if (isWorkspaceOpen && activeSandbox) {
    return (
      <BoxWorkspace 
        sandbox={activeSandbox} 
        onClose={() => setIsWorkspaceOpen(false)} 
      />
    )
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      onKill={handleKill}
      isKilled={isKilled}
      activeSandbox={activeSandbox}
      sandboxes={sandboxes}
      onSelectSandbox={setActiveSandbox}
      onCreateSandbox={() => setIsCreateModalOpen(true)}
    >
      <div className="space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !activeSandbox ? (
          <div className="p-12 rounded-3xl border border-white/5 bg-white/5 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center">
              <Box className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">No Sandboxes Found</h2>
              <p className="text-muted-foreground">You haven't created any agent environments yet.</p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
              <Zap className="w-4 h-4" />
              Initialise Your First Box
            </Button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl col-span-2 relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <h1 className="text-4xl font-black tracking-tighter uppercase">{activeSandbox.title || activeSandbox.id}</h1>
                          <div className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                            activeSandbox.status === 'active' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-white/5 border-white/10 text-muted-foreground"
                          )}>
                            {activeSandbox.status}
                          </div>
                        </div>
                        <Button onClick={() => handleOpenBox()} className="gap-2">
                          <Play className="w-4 h-4" />
                          Open Box
                        </Button>
                      </div>
                      <p className="text-muted-foreground">Persistent agent box initialized on {new Date(activeSandbox.createdAt).toLocaleDateString()}.</p>
                      
                      <div className="mt-8 flex gap-4">
                        <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tasks Completed</div>
                          <div className="text-2xl font-black">{activeSandbox.tasksCompleted || 0}</div>
                        </div>
                        <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Active Memory</div>
                          <div className="text-2xl font-black">{activeSandbox.memoryUsage || '0 GB'}</div>
                        </div>
                      </div>

                      {!isUnlocked && (
                        <div className="mt-8 p-6 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                              <Zap className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-bold">Autonomous mode is disabled</div>
                              <div className="text-xs text-muted-foreground">Enable power tools to give your agent full capability.</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsAcceptanceOpen(true)}
                            className="px-6 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-lg"
                          >
                            Enable
                          </button>
                        </div>
                      )}

                      {isUnlocked && (
                        <div className="mt-8 p-6 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-green-500" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-green-500">Autonomous mode active</div>
                            <div className="text-xs text-green-500/80">Agent operating with full system privileges.</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
                  </div>

                  <div className="p-8 rounded-3xl border border-white/5 bg-primary/10 flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">Available Credits</span>
                    <span className="text-5xl font-black tracking-tighter">£24.50</span>
                    <button 
                      onClick={() => setActiveTab('billing')}
                      className="mt-6 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                    >
                      Top Up Balance
                    </button>
                  </div>
                </div>

                <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl">
                  <ActivityTimeline />
                </div>
              </>
            )}
            
            {activeTab === 'activity' && (
              <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl">
                <ActivityTimeline />
              </div>
            )}

            {activeTab === 'billing' && (
              <BillingDashboard />
            )}

            {activeTab === 'settings' && (
              <Settings />
            )}

            {activeTab === 'boxes' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Boxes</h2>
                    <p className="text-muted-foreground">Manage your agent instances and environment configuration.</p>
                  </div>
                  <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                    <Box className="w-4 h-4" />
                    Create New Box
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {sandboxes.map((sb) => (
                    <div key={sb.id} className="p-6 rounded-3xl border border-white/5 bg-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          sb.status === 'active' ? "bg-green-500/10 text-green-500" : "bg-white/5 text-muted-foreground"
                        )}>
                          <Server className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight text-white">{sb.title || sb.id}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <Globe className="w-3 h-3" />
                              Cloudflare Sandbox
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(sb.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Usage</div>
                          <div className="text-sm font-bold text-primary">£2.10 this month</div>
                        </div>
                        {activeSandbox?.id === sb.id ? (
                          <div className="flex items-center gap-2">
                            <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </div>
                            <Button onClick={() => handleOpenBox(sb)} size="sm" className="gap-2">
                              <Play className="w-3 h-3" />
                              Open
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setActiveSandbox(sb)}>Select</Button>
                            <Button onClick={() => handleOpenBox(sb)} size="sm" className="gap-2">
                              <Play className="w-3 h-3" />
                              Open
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <AcceptanceModal 
        isOpen={isAcceptanceOpen}
        onClose={() => setIsAcceptanceOpen(false)}
        onAccept={handleAccept}
      />

      <CreateSandboxModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSandbox}
      />
    </Layout>
  )
}

export default App

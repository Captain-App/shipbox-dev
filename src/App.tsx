import { useState } from 'react'
import { Layout } from './components/Layout'
import { ActivityTimeline } from './components/ActivityTimeline'
import { AcceptanceModal } from './components/AcceptanceModal'
import { CapabilityMarketplace } from './components/CapabilityMarketplace'
import { SecretsVault } from './components/SecretsVault'
import { BillingDashboard } from './components/BillingDashboard'
import { Shield, Zap } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isAcceptanceOpen, setIsAcceptanceOpen] = useState(false)
  const [isKilled, setIsKilled] = useState(false)

  const handleAccept = () => {
    setIsUnlocked(true)
    setIsAcceptanceOpen(false)
  }

  const handleKill = () => {
    setIsKilled(true)
  }

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      onKill={handleKill}
      isKilled={isKilled}
    >
      <div className="space-y-8">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl col-span-2 relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Welcome Back</h1>
                  <p className="text-muted-foreground">Your Sandbox Box has been running for 4 days and 12 hours.</p>
                  
                  <div className="mt-8 flex gap-4">
                    <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tasks Completed</div>
                      <div className="text-2xl font-black">128</div>
                    </div>
                    <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Active Memory</div>
                      <div className="text-2xl font-black">2.4 GB</div>
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

        {activeTab === 'marketplace' && (
          <CapabilityMarketplace />
        )}

        {activeTab === 'secrets' && (
          <SecretsVault />
        )}

        {activeTab === 'billing' && (
          <BillingDashboard />
        )}

        {activeTab === 'settings' && (
          <div className="p-12 rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-xl text-center">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">Under Construction</h1>
            <p className="text-muted-foreground">The {activeTab} panel will be available in the next release.</p>
          </div>
        )}
      </div>

      <AcceptanceModal 
        isOpen={isAcceptanceOpen}
        onClose={() => setIsAcceptanceOpen(false)}
        onAccept={handleAccept}
      />
    </Layout>
  )
}

export default App

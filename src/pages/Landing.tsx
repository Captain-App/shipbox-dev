import { Shield, Zap, Box, Play, ArrowRight, Cpu, Lock, Terminal } from 'lucide-react'
import { Button } from '../components/ui/Button'

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black uppercase tracking-tighter">Shipbox</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://docs.shipbox.dev" className="text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-white transition-colors">Docs</a>
            <Button variant="primary" size="sm" onClick={onGetStarted}>Sign In</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="max-w-3xl space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Zap className="w-3 h-3" />
              The Infrastructure for AI Agents
            </div>
            <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              Your Agents.<br />
              <span className="text-primary">Their Own Box.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Shipbox provides secure, isolated, and persistent Cloudflare sandboxes for AI agents. 
              Give your agents a real environment to code, test, and deploy—without the infra overhead.
            </p>
            <div className="flex flex-wrap gap-4 pt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <Button size="lg" onClick={onGetStarted} className="h-16 px-10 text-lg gap-3">
                Get Started
                <ArrowRight className="w-6 h-6" />
              </Button>
              <Button variant="secondary" size="lg" className="h-16 px-10 text-lg border-white/10 hover:bg-white/5" onClick={() => window.open('https://docs.shipbox.dev')}>
                Read Documentation
              </Button>
            </div>
          </div>
        </div>
        
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -mr-[300px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </section>

      {/* Features Grid */}
      <section className="py-32 border-t border-white/5 relative bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-[2.5rem] border border-white/5 bg-white/5 space-y-6 hover:border-primary/20 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Box className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Isolated Sandboxes</h3>
                <p className="text-muted-foreground">Every agent gets a dedicated Cloudflare container with a full Linux-like environment and persistent storage.</p>
              </div>
            </div>
            <div className="p-8 rounded-[2.5rem] border border-white/5 bg-white/5 space-y-6 hover:border-primary/20 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Terminal className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">MCP Protocol</h3>
                <p className="text-muted-foreground">Native support for Model Context Protocol. Use Shipbox as a tool for Claude, ChatGPT, or your own custom agents.</p>
              </div>
            </div>
            <div className="p-8 rounded-[2.5rem] border border-white/5 bg-white/5 space-y-6 hover:border-primary/20 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight">Zero-Trust Security</h3>
                <p className="text-muted-foreground">Internal API keys and GitHub tokens are injected via a secure proxy. Credentials never live inside the sandbox.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-32 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-5xl font-black uppercase tracking-tighter">Credits-First Billing</h2>
            <p className="text-muted-foreground text-lg">No monthly subscriptions. Pay only for the compute and tokens your agents actually use. Top up whenever you need.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8 text-left">
            <div className="p-10 rounded-[3rem] border border-white/5 bg-white/5 space-y-6 relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary">Standard Tier</div>
                <div className="text-4xl font-black tracking-tighter">£1.00 <span className="text-xl font-medium text-muted-foreground">/ 100 Credits</span></div>
                <ul className="space-y-3 pt-6">
                  <li className="flex items-center gap-3 text-sm font-medium"><Play className="w-4 h-4 text-primary" /> 1 Credit = 1 Minute Sandbox Uptime</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><Play className="w-4 h-4 text-primary" /> Variable AI Token Pricing</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><Play className="w-4 h-4 text-primary" /> 100 Free Starter Credits</li>
                </ul>
              </div>
              <div className="absolute bottom-0 right-0 p-8 opacity-10">
                <Cpu className="w-32 h-32" />
              </div>
            </div>
            <div className="p-10 rounded-[3rem] border border-primary/20 bg-primary/5 space-y-6 relative overflow-hidden">
              <div className="space-y-2 relative z-10">
                <div className="text-[10px] font-black uppercase tracking-widest text-primary">BYOK (Bring Your Own Key)</div>
                <div className="text-4xl font-black tracking-tighter">Free <span className="text-xl font-medium text-muted-foreground">compute-only</span></div>
                <ul className="space-y-3 pt-6">
                  <li className="flex items-center gap-3 text-sm font-medium"><Play className="w-4 h-4 text-primary" /> Use your own Anthropic API Key</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><Play className="w-4 h-4 text-primary" /> Only pay for sandbox compute</li>
                  <li className="flex items-center gap-3 text-sm font-medium"><Play className="w-4 h-4 text-primary" /> Custom rate limits and models</li>
                </ul>
              </div>
              <div className="absolute bottom-0 right-0 p-8 opacity-10">
                <Lock className="w-32 h-32" />
              </div>
            </div>
          </div>
          <div className="pt-8">
            <Button size="lg" onClick={onGetStarted} className="h-16 px-10 text-lg gap-3">
              Initialise Your First Box
              <Zap className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white/40" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter opacity-40">Shipbox</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            © 2026 Captain App Ltd. Built on Cloudflare.
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

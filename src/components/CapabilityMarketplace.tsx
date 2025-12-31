import { Store, Download, Check, Sparkles, Code, Globe, MessageSquare } from "lucide-react"
import { Button } from "./ui/Button"
import { cn } from "../lib/utils"

interface Capability {
  id: string
  name: string
  description: string
  icon: any
  price: string
  isInstalled: boolean
  category: string
}

const capabilities: Capability[] = [
  {
    id: '1',
    name: 'RepoSwarm',
    description: 'Continuously regenerates AI-readable architecture knowledge from source code across multiple repositories.',
    icon: Code,
    price: 'Free',
    isInstalled: true,
    category: 'Documentation'
  },
  {
    id: '2',
    name: 'Competitor Scraper',
    description: 'Automated monitoring of competitor pricing pages and feature releases with daily summaries.',
    icon: Globe,
    price: '£5/mo',
    isInstalled: false,
    category: 'Intelligence'
  },
  {
    id: '3',
    name: 'Voice Agent (Marvin)',
    description: 'Enable voice-to-voice interaction with your agent using ultra-low latency xAI Realtime API.',
    icon: MessageSquare,
    price: '£10/mo',
    isInstalled: false,
    category: 'Interface'
  },
  {
    id: '4',
    name: 'Invoice Automator',
    description: 'Connects to your bank and accounting API to automatically reconcile invoices and payments.',
    icon: Sparkles,
    price: 'Free',
    isInstalled: false,
    category: 'Productivity'
  }
]

export function CapabilityMarketplace() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Capabilities</h2>
          <p className="text-muted-foreground">Pre-built skills and toolchains to extend your agent's powers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">Publish Pack</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {capabilities.map((cap) => (
          <div 
            key={cap.id}
            className="group p-6 rounded-[2rem] border border-white/5 bg-white/5 hover:bg-white/10 transition-all flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-6">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                cap.isInstalled ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
              )}>
                <cap.icon className="w-8 h-8" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{cap.category}</span>
                <span className="text-xs font-bold text-primary">{cap.price}</span>
              </div>
            </div>

            <h3 className="text-xl font-black mb-2">{cap.name}</h3>
            <p className="text-sm text-muted-foreground mb-8 flex-1 leading-relaxed">
              {cap.description}
            </p>

            <Button 
              variant={cap.isInstalled ? "secondary" : "primary"}
              className="w-full gap-2"
              disabled={cap.isInstalled}
            >
              {cap.isInstalled ? (
                <>
                  <Check className="w-4 h-4" />
                  Installed
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install Capability
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}


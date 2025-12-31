import { 
  LayoutDashboard, 
  Terminal, 
  Store, 
  Key, 
  CreditCard, 
  Settings,
  Zap
} from "lucide-react"
import { cn } from "../lib/utils"

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', icon: Terminal },
  { id: 'marketplace', label: 'Capabilities', icon: Store },
  { id: 'secrets', label: 'Secrets', icon: Key },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (id: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 border-r border-white/5 bg-background flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-black tracking-tighter uppercase">
          Sandbox Box
        </span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              activeTab === item.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>Credits</span>
            <span className="text-primary">£24.50</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}


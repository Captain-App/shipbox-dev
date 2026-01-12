import { 
  LayoutDashboard, 
  Terminal, 
  Box,
  CreditCard, 
  Settings as SettingsIcon,
  Zap,
  LogOut,
  X
} from "lucide-react"
import { cn } from "../lib/utils"
import { useAuth } from "../contexts/AuthContext"

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'boxes', label: 'Boxes', icon: Box },
  { id: 'activity', label: 'Activity', icon: Terminal },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

interface SidebarProps {
  activeTab: string
  onTabChange: (id: string) => void
  balance?: number
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ activeTab, onTabChange, balance, isOpen, onClose }: SidebarProps) {
  const { signOut } = useAuth()

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-white/5 bg-background flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase text-white">
              Shipbox
            </span>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-white md:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id)
                onClose?.()
              }}
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

        <div className="p-4 space-y-4">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all mt-auto"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>

          <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Credits</span>
              <span className="text-primary">£{((balance || 0) / 100).toFixed(2)}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (balance || 0) / 50)}%` }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

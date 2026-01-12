import React, { useState } from "react"
import { Sidebar } from "./Sidebar"
import { AuditBadge } from "./AuditBadge"
import { Power, Menu } from "lucide-react"
import { Button } from "./ui/Button"
import { cn } from "../lib/utils"
import { SandboxSelector } from "./SandboxSelector"
import type { Sandbox } from "../lib/api"

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  onTabChange: (id: string) => void
  onKill: () => void
  isKilled: boolean
  activeSandbox: Sandbox | null
  sandboxes: Sandbox[]
  balance?: number
  onSelectSandbox: (sandbox: Sandbox) => void
  onCreateSandbox: () => void
}

export function Layout({ 
  children, 
  activeTab, 
  onTabChange, 
  onKill, 
  isKilled,
  activeSandbox,
  sandboxes,
  balance,
  onSelectSandbox,
  onCreateSandbox
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className={cn(
      "flex h-screen text-foreground overflow-hidden transition-colors duration-1000",
      isKilled ? "bg-red-950/20" : "bg-background"
    )}>
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
        balance={balance} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-background/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2 md:gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-muted-foreground hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {activeSandbox && (
              <SandboxSelector 
                activeSandbox={activeSandbox} 
                sandboxes={sandboxes}
                onSelect={onSelectSandbox} 
                onCreateNew={onCreateSandbox} 
              />
            )}
            <div className="h-8 w-px bg-white/10 hidden md:block" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground hidden md:block">
              {activeTab}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {!isKilled ? (
              <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 hidden sm:inline">Agent Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 hidden sm:inline">Sandbox Killed</span>
              </div>
            )}
            
            <Button 
              variant="danger" 
              size="sm" 
              className="gap-2 group px-2 md:px-4"
              onClick={onKill}
              disabled={isKilled}
            >
              <Power className="w-4 h-4 group-hover:animate-pulse" />
              <span className="hidden sm:inline">{isKilled ? "Terminated" : "Kill Sandbox"}</span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-y-auto p-4 md:p-8 relative transition-opacity duration-500",
          isKilled ? "opacity-50 grayscale" : "opacity-100"
        )}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
          {isKilled && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="p-8 rounded-3xl bg-slate-950 border border-red-500/30 text-center space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.2)] mx-4">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-red-500">Emergency Stop Triggered</h3>
                <p className="text-muted-foreground max-w-xs">All compute and network access has been instantly terminated.</p>
                <Button variant="secondary" onClick={() => window.location.reload()}>Restart Environment</Button>
              </div>
            </div>
          )}
        </main>
      </div>

      <AuditBadge />
    </div>
  )
}

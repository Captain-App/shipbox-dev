import React, { useState } from "react"
import { Sidebar } from "./Sidebar"
import { AuditBadge } from "./AuditBadge"
import { Power } from "lucide-react"
import { Button } from "./ui/Button"

interface LayoutProps {
  children: React.ReactNode
  activeTab: string
  onTabChange: (id: string) => void
  onKill: () => void
  isKilled: boolean
}

export function Layout({ children, activeTab, onTabChange, onKill, isKilled }: LayoutProps) {
  return (
    <div className={cn(
      "flex h-screen text-foreground overflow-hidden transition-colors duration-1000",
      isKilled ? "bg-red-950/20" : "bg-background"
    )}>
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-background/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {activeTab}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            {!isKilled ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">Agent Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Sandbox Killed</span>
              </div>
            )}
            
            <Button 
              variant="danger" 
              size="sm" 
              className="gap-2 group"
              onClick={onKill}
              disabled={isKilled}
            >
              <Power className="w-4 h-4 group-hover:animate-pulse" />
              {isKilled ? "Terminated" : "Kill Sandbox"}
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-y-auto p-8 relative transition-opacity duration-500",
          isKilled ? "opacity-50 grayscale" : "opacity-100"
        )}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
          {isKilled && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="p-8 rounded-3xl bg-slate-950 border border-red-500/30 text-center space-y-4 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
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


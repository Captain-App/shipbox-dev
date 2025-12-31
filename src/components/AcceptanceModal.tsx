import React, { useState } from "react"
import { ShieldAlert, X } from "lucide-react"
import { Button } from "./ui/Button"
import { cn } from "../lib/utils"

interface AcceptanceModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => void
}

export function AcceptanceModal({ isOpen, onClose, onAccept }: AcceptanceModalProps) {
  const [inputValue, setInputValue] = useState("")
  const targetPhrase = "I ACCEPT RESPONSIBILITY"
  const isCorrect = inputValue.toUpperCase() === targetPhrase

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl p-8 rounded-[2rem] border border-red-500/20 bg-slate-950 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Enter Unlocked Mode</h2>
            <p className="text-muted-foreground max-w-md">
              You are about to grant this agent full autonomous access to your computer environment, network, and credentials. This is a power tool with best-effort safety.
            </p>
          </div>

          <div className="w-full p-6 rounded-2xl bg-white/5 border border-white/5 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-1 h-1 rounded-full bg-red-500 mt-2 flex-shrink-0" />
              <p className="text-sm text-red-200/80">The agent may execute unpredictable commands.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1 h-1 rounded-full bg-red-500 mt-2 flex-shrink-0" />
              <p className="text-sm text-red-200/80">You are responsible for any external API costs or data changes.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1 h-1 rounded-full bg-red-500 mt-2 flex-shrink-0" />
              <p className="text-sm text-red-200/80">Ensure you have revoked or limited any production secrets.</p>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Type "{targetPhrase}" to proceed
              </label>
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type here..."
                className={cn(
                  "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center font-black tracking-widest uppercase transition-all focus:outline-none focus:ring-2",
                  isCorrect ? "focus:ring-green-500 border-green-500/50 text-green-500" : "focus:ring-primary border-white/10"
                )}
              />
            </div>

            <Button 
              variant={isCorrect ? "danger" : "secondary"}
              disabled={!isCorrect}
              onClick={onAccept}
              className="w-full py-6 text-lg uppercase tracking-widest"
            >
              Enable Autonomous Mode
            </Button>
            
            <button 
              onClick={onClose}
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


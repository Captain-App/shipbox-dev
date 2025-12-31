import { ShieldAlert } from "lucide-react"

export function AuditBadge() {
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md animate-pulse">
        <ShieldAlert className="w-4 h-4 text-red-500" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">
            Unlocked Mode Active
          </span>
          <span className="text-[8px] font-medium text-red-500/80 uppercase tracking-tight">
            Explicit Risk Accepted
          </span>
        </div>
      </div>
    </div>
  )
}


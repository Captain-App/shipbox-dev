import { 
  Terminal, 
  Globe, 
  GitBranch, 
  CloudUpload, 
  Clock,
  ChevronRight
} from "lucide-react"
import { cn } from "../lib/utils"

type EventType = 'bash' | 'network' | 'git' | 'deploy'

interface TimelineEvent {
  id: string
  type: EventType
  title: string
  detail: string
  timestamp: string
  status: 'success' | 'running' | 'failed'
}

const mockEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'deploy',
    title: 'Deployment to Production',
    detail: 'Successfully deployed version v2.4.0 to Cloudflare Workers.',
    timestamp: '2 mins ago',
    status: 'success'
  },
  {
    id: '2',
    type: 'bash',
    title: 'Build Process',
    detail: 'npm run build',
    timestamp: '5 mins ago',
    status: 'success'
  },
  {
    id: '3',
    type: 'git',
    title: 'Commit Changes',
    detail: 'feat: add secret vault with auto-redaction',
    timestamp: '12 mins ago',
    status: 'success'
  },
  {
    id: '4',
    type: 'network',
    title: 'External API Call',
    detail: 'POST https://api.openai.com/v1/chat/completions',
    timestamp: '15 mins ago',
    status: 'success'
  },
  {
    id: '5',
    type: 'bash',
    title: 'Tests Running',
    detail: 'vitest run',
    timestamp: '20 mins ago',
    status: 'running'
  }
]

const icons = {
  bash: Terminal,
  network: Globe,
  git: GitBranch,
  deploy: CloudUpload
}

const colors = {
  bash: 'text-blue-400 bg-blue-400/10',
  network: 'text-purple-400 bg-purple-400/10',
  git: 'text-orange-400 bg-orange-400/10',
  deploy: 'text-green-400 bg-green-400/10'
}

export function ActivityTimeline() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tight">Recent Activity</h2>
        <div className="flex gap-2">
          {['All', 'Commands', 'Network', 'Deployments'].map((filter) => (
            <button
              key={filter}
              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {mockEvents.map((event, i) => {
          const Icon = icons[event.type]
          return (
            <div 
              key={event.id}
              className="group relative flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              {/* Connector line */}
              {i !== mockEvents.length - 1 && (
                <div className="absolute left-[34px] top-[56px] w-[1px] h-[calc(100%-16px)] bg-white/5 group-hover:bg-white/10" />
              )}

              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", colors[event.type])}>
                <Icon className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">{event.title}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    <Clock className="w-3 h-3" />
                    {event.timestamp}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-mono bg-black/20 p-2 rounded-lg mt-2">
                  {event.detail}
                </p>
              </div>

              <div className="flex items-center pl-2">
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40" />
              </div>
            </div>
          )
        })}
      </div>
      
      <button className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors border-t border-white/5">
        View Full Audit Log
      </button>
    </div>
  )
}


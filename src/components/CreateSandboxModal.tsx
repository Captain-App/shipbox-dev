import { useState, useEffect, useRef } from "react"
import { Box, X, Github, Zap, Loader2, Search, Check } from "lucide-react"
import { Button } from "./ui/Button"
import { cn } from "../lib/utils"
import { api } from "../lib/api"

interface CreateSandboxModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, region: string, repository?: string) => void
}

const regions = [
  { id: 'lhr', name: 'London (LHR)', icon: '🇬🇧' },
  { id: 'jfk', name: 'New York (JFK)', icon: '🇺🇸' },
  { id: 'nrt', name: 'Tokyo (NRT)', icon: '🇯🇵' },
  { id: 'fra', name: 'Frankfurt (FRA)', icon: '🇩🇪' },
]

export function CreateSandboxModal({ isOpen, onClose, onCreate }: CreateSandboxModalProps) {
  // Use refs for uncontrolled inputs - more AI/automation friendly
  const nameRef = useRef<HTMLInputElement>(null)
  const repoRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  
  const [name, setName] = useState("") // Keep name state for UI feedback (disabling button)
  const [selectedRegion, setSelectedRegion] = useState("lhr")
  const [selectedRepo, setSelectedRepo] = useState("")
  const [githubRepos, setGithubRepos] = useState<any[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [showRepoPicker, setShowRepoPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (isOpen) {
      setLoadingRepos(true)
      api.getGitHubRepos()
        .then(repos => setGithubRepos(repos))
        .catch(() => setGithubRepos([]))
        .finally(() => setLoadingRepos(false))
    }
  }, [isOpen])

  const filteredRepos = githubRepos.filter(r => 
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-xl p-6 md:p-8 rounded-[2.5rem] border border-white/10 bg-slate-950 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/5 text-muted-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6 md:space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Box className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white">New Sandbox Box</h2>
              <p className="text-muted-foreground text-xs md:text-sm">Spin up a fresh persistent agent environment.</p>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <label htmlFor="sandbox-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Box Name</label>
              <input
                ref={nameRef}
                id="sandbox-name"
                name="sandbox-name"
                type="text"
                placeholder="e.g. My New Agent"
                aria-label="Sandbox name"
                aria-required="true"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Deploy Region</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                      selectedRegion === region.id 
                        ? "bg-primary/10 border-primary text-primary" 
                        : "bg-white/5 border-white/5 hover:border-white/10 text-muted-foreground"
                    )}
                  >
                    <span className="text-lg">{region.icon}</span>
                    <span className="text-xs font-bold">{region.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Initial Repository (Optional)</label>
              
              {githubRepos.length > 0 ? (
                <div className="relative">
                  <button
                    onClick={() => setShowRepoPicker(!showRepoPicker)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-left text-white flex items-center justify-between hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Github className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{selectedRepo || "Select from GitHub..."}</span>
                    </div>
                    {loadingRepos ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Search className="w-4 h-4 shrink-0" />}
                  </button>

                  {showRepoPicker && (
                    <div className="absolute z-10 left-0 right-0 mt-2 p-2 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-h-64 overflow-y-auto" role="listbox" aria-label="Repository list">
                      <input
                        ref={searchRef}
                        id="repo-search"
                        name="repo-search"
                        type="text"
                        placeholder="Search repositories..."
                        aria-label="Search repositories"
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="space-y-1">
                        {filteredRepos.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setSelectedRepo(r.html_url);
                              if (!name) setName(r.name);
                              if (nameRef.current && !nameRef.current.value) {
                                nameRef.current.value = r.name;
                              }
                              setShowRepoPicker(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-left text-xs transition-all"
                          >
                            <div className="flex flex-col overflow-hidden">
                              <span className="font-bold text-white truncate">{r.name}</span>
                              <span className="text-[10px] text-muted-foreground truncate">{r.full_name}</span>
                            </div>
                            {selectedRepo === r.html_url && <Check className="w-3 h-3 text-primary shrink-0" />}
                          </button>
                        ))}
                        {filteredRepos.length === 0 && (
                          <div className="py-4 text-center text-[10px] text-muted-foreground">No repositories found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    ref={repoRef}
                    id="repo-url"
                    name="repo-url"
                    type="text"
                    placeholder="https://github.com/..."
                    aria-label="Repository URL"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-4">
            <Button 
              className="w-full py-6 text-lg uppercase tracking-widest gap-3"
              disabled={!name}
              onClick={() => {
                const finalName = name || nameRef.current?.value || '';
                const finalRepo = selectedRepo || repoRef.current?.value || '';
                if (finalName) onCreate(finalName, selectedRegion, finalRepo);
              }}
              aria-label="Create new sandbox"
            >
              <Zap className="w-5 h-5" />
              Initialise Sandbox
            </Button>
            <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase tracking-widest">
              Standard compute rates apply: approx. £0.01 / hour idle
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

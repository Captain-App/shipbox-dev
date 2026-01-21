import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Send,
  Bot,
  ExternalLink,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Loader2,
  Sparkles,
  Terminal,
  FileEdit,
  Code2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { cn } from "../lib/utils";
import { Button } from "./ui/Button";
import { api, type Sandbox } from "../lib/api";
import { useRealtime, type RealtimeEvent } from "../lib/realtime";

interface AgentMonologueProps {
  sandbox: Sandbox;
  plan: string;
  isWorking: boolean;
  currentRunId: string | null;
  events: RealtimeEvent[];
  onSend: (task: string) => void;
}

export function AgentMonologue({
  sandbox,
  plan,
  isWorking,
  currentRunId: _currentRunId,
  events,
  onSend,
}: AgentMonologueProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [plan, isWorking, events]);

  const handleSend = () => {
    if (!input.trim() || isWorking) return;
    onSend(input);
    setInput("");
  };

  // Accumulate streaming text from events
  const streamingText = useMemo(() => {
    const textParts: string[] = [];
    for (const event of events) {
      if (
        event.type === "text" ||
        event.type === "reasoning" ||
        event.type === "message.part.updated"
      ) {
        const text = event.data?.text || event.data?.content || "";
        if (text) textParts.push(text);
      }
    }
    return textParts.join("");
  }, [events]);

  // Filter non-text events for the activity feed
  const activityEvents = useMemo(() => {
    return events.filter(
      (e) =>
        e.type !== "text" &&
        e.type !== "reasoning" &&
        e.type !== "message.part.updated",
    );
  }, [events]);

  const renderEvent = (event: RealtimeEvent) => {
    switch (event.type) {
      case "step-start":
        return (
          <div
            key={event.seq}
            className="flex items-start gap-2 mb-3 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="mt-1 p-1 rounded bg-blue-500/10 border border-blue-500/20">
              <Sparkles className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-400/70">
                Thinking
              </div>
              <div className="text-xs text-blue-100/80">
                {event.data.name || "Considering next steps..."}
              </div>
            </div>
          </div>
        );
      case "command.executed":
        return (
          <div
            key={event.seq}
            className="flex items-start gap-2 mb-3 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="mt-1 p-1 rounded bg-green-500/10 border border-green-500/20">
              <Terminal className="w-3 h-3 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-green-400/70">
                Command
              </div>
              <div className="text-xs font-mono text-green-100/80 bg-black/30 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-full">
                {event.data.command}
              </div>
            </div>
          </div>
        );
      case "file.edited":
        return (
          <div
            key={event.seq}
            className="flex items-start gap-2 mb-3 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="mt-1 p-1 rounded bg-amber-500/10 border border-amber-500/20">
              <FileEdit className="w-3 h-3 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400/70">
                Edit
              </div>
              <div className="text-xs text-amber-100/80">
                Modified{" "}
                <span className="font-mono text-[10px] bg-white/5 px-1 rounded">
                  {event.data.path}
                </span>
              </div>
            </div>
          </div>
        );
      case "tool":
        return (
          <div
            key={event.seq}
            className="flex items-start gap-2 mb-3 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="mt-1 p-1 rounded bg-purple-500/10 border border-purple-500/20">
              <Code2 className="w-3 h-3 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-purple-400/70">
                Tool Call
              </div>
              <div className="text-xs text-purple-100/80">
                Using{" "}
                <span className="font-mono text-[10px] bg-white/5 px-1 rounded">
                  {event.data.name}
                </span>
              </div>
            </div>
          </div>
        );
      case "session.error":
        return (
          <div
            key={event.seq}
            className="flex items-start gap-2 mb-3 animate-in fade-in slide-in-from-left-2 duration-300"
          >
            <div className="mt-1 p-1 rounded bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-3 h-3 text-red-400" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black uppercase tracking-widest text-red-400/70">
                Error
              </div>
              <div className="text-xs text-red-400/90">
                {event.data.message || "An unexpected error occurred"}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const emptyPlan = `# Getting Started

Give your agent a task below. They will maintain a live \`PLAN.md\` here while they work.

### Try asking for:
- "Build a basic landing page with Tailwind"
- "Create a counter component in React"
`;

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold truncate max-w-[120px]">
              {sandbox.title || sandbox.id}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Agent Chat
            </div>
          </div>
        </div>
        {isWorking && (
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Working
            </span>
          </div>
        )}
      </div>

      {/* Monologue / Plan Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scroll-smooth">
        {/* Show plan when not actively streaming */}
        {!streamingText && (
          <div className="prose prose-invert prose-xs max-w-none prose-headings:tracking-tight prose-headings:uppercase prose-headings:text-primary prose-a:text-primary hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 mb-8">
            <Streamdown isAnimating={false}>{plan || emptyPlan}</Streamdown>
          </div>
        )}

        {/* Streaming AI response */}
        {streamingText && (
          <div className="flex items-start gap-2 mb-4">
            <div className="mt-1 p-1.5 rounded bg-primary/10 border border-primary/20 shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 prose prose-invert prose-xs max-w-none prose-headings:text-primary prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
              <Streamdown isAnimating={isWorking}>{streamingText}</Streamdown>
            </div>
          </div>
        )}

        {/* Real-time Activity Events */}
        <div className="space-y-1">{activityEvents.map(renderEvent)}</div>

        {isWorking && !streamingText && activityEvents.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center text-center space-y-4 py-12 opacity-50">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-xs font-medium">Thinking...</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-slate-950">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 focus-within:border-primary/50 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={isWorking}
            placeholder={isWorking ? "Agent is busy..." : "Ask your agent..."}
            className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50 px-2"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isWorking}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {isWorking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BoxWorkspaceProps {
  sandbox: Sandbox | null;
  onClose: () => void;
}

export function BoxWorkspace({
  sandbox: initialSandbox,
  onClose,
}: BoxWorkspaceProps) {
  const { sessionId: urlSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sandbox, setSandbox] = useState<Sandbox | null>(initialSandbox);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeRightView, setActiveRightView] = useState<"preview" | "plan">(
    "preview",
  );
  const [activeMobileTab, setActiveMobileTab] = useState<
    "chat" | "preview" | "plan"
  >("chat");
  const [previewLoaded, setPreviewLoaded] = useState(false);

  const [plan, setPlan] = useState<string>("");
  const [isWorking, setIsWorking] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  const sessionId = sandbox?.sessionId || sandbox?.id || urlSessionId;

  // Fetch sandbox if not provided OR if we need a fresh realtimeToken
  // Only use urlSessionId in dependencies to avoid infinite loops
  useEffect(() => {
    if (!urlSessionId) return;

    // Always fetch fresh session data to ensure we have a valid realtimeToken
    console.log('[BoxWorkspace] Fetching session data for:', urlSessionId);
    api
      .getSession(urlSessionId)
      .then((data) => {
        console.log('[BoxWorkspace] Got session data, hasRealtimeToken:', !!data.realtimeToken);
        setSandbox(data);
      })
      .catch((err) => {
        console.error('[BoxWorkspace] Failed to fetch session:', err);
        navigate("/");
      });
  }, [urlSessionId, navigate]);

  const deployedUrl = `https://engine.shipbox.dev/site/${sessionId}/`;
  const iframeUrl = deployedUrl;

  // WebSocket hook
  const { events, clearEvents } = useRealtime(
    sessionId || null,
    sandbox?.realtimeToken || null,
  );

  // Debug logging
  useEffect(() => {
    console.log("[BoxWorkspace] Sandbox data", {
      sessionId: sandbox?.sessionId,
      hasRealtimeToken: !!sandbox?.realtimeToken,
      realtimeTokenPreview: sandbox?.realtimeToken?.slice(0, 20) + "...",
      eventsCount: events.length,
    });
  }, [sandbox, events]);

  // Initial fetch of the plan
  useEffect(() => {
    if (!sessionId) return;
    const fetchInitialPlan = async () => {
      try {
        const result = await api.getPlan(sessionId);
        if (result.content) setPlan(result.content);
      } catch (e) {}
    };
    fetchInitialPlan();
  }, [sessionId]);

  // Poll for plan updates while working
  useEffect(() => {
    if (!isWorking || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const result = await api.getPlan(sessionId);
        if (result.content) setPlan(result.content);
      } catch (e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [isWorking, sessionId]);

  // Poll for run status
  useEffect(() => {
    if (!currentRunId || !sessionId) return;
    const interval = setInterval(async () => {
      try {
        const result = await api.getRunStatus(sessionId, currentRunId);
        if (result.status === "completed" || result.status === "failed") {
          setIsWorking(false);
          setCurrentRunId(null);
          const finalPlan = await api.getPlan(sessionId);
          if (finalPlan.content) setPlan(finalPlan.content);
        }
      } catch (e) {
        setIsWorking(false);
        setCurrentRunId(null);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [currentRunId, sessionId]);

  const handleSendTask = async (taskText: string) => {
    if (!sessionId) return;
    setIsWorking(true);
    clearEvents();
    try {
      const result = await api.sendTask(sessionId, taskText);
      setCurrentRunId(result.runId);
    } catch (e) {
      setIsWorking(false);
    }
  };

  // Show loading state while fetching sandbox
  if (!sandbox) {
    return (
      <div className="fixed inset-0 z-[80] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col">
      {/* Toolbar */}
      <div className="h-12 md:h-14 bg-slate-950 border-b border-white/5 flex items-center justify-between px-2 md:px-4">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest hidden sm:inline">
              Back
            </span>
          </button>
          <div className="h-4 w-px bg-white/10 shrink-0" />
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-sm font-bold truncate">
              {sandbox.title || sandbox.id}
            </span>
          </div>
        </div>

        {/* Desktop View Toggle */}
        <div className="hidden md:flex items-center bg-white/5 rounded-lg p-1">
          <button
            onClick={() => setActiveRightView("preview")}
            className={cn(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
              activeRightView === "preview"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-white/70",
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveRightView("plan")}
            className={cn(
              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
              activeRightView === "plan"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-white/70",
            )}
          >
            Plan
          </button>
        </div>

        {/* Mobile Tab Toggle */}
        <div className="flex items-center bg-white/5 rounded-lg p-1 md:hidden">
          <button
            onClick={() => setActiveMobileTab("chat")}
            className={cn(
              "px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
              activeMobileTab === "chat"
                ? "bg-primary text-white"
                : "text-muted-foreground",
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveMobileTab("preview")}
            className={cn(
              "px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
              activeMobileTab === "preview"
                ? "bg-primary text-white"
                : "text-muted-foreground",
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveMobileTab("plan")}
            className={cn(
              "px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
              activeMobileTab === "plan"
                ? "bg-primary text-white"
                : "text-muted-foreground",
            )}
          >
            Plan
          </button>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 hidden sm:flex"
            onClick={() => window.open(iframeUrl, "_blank")}
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-widest">
              Open Tab
            </span>
          </Button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden md:block"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Chat (Desktop) */}
        {!isFullscreen && (
          <div className="hidden md:block w-[320px] lg:w-[380px] flex-shrink-0 border-r border-white/5">
            <AgentMonologue
              sandbox={sandbox}
              plan={plan}
              isWorking={isWorking}
              currentRunId={currentRunId}
              events={events}
              onSend={handleSendTask}
            />
          </div>
        )}

        {/* Main Area / Right Pane */}
        <div className="flex-1 relative bg-slate-950">
          {/* Mobile Chat View */}
          <div
            className={cn(
              "md:hidden absolute inset-0 z-20 bg-background transition-transform duration-300",
              activeMobileTab === "chat"
                ? "translate-x-0"
                : "-translate-x-full",
            )}
          >
            <AgentMonologue
              sandbox={sandbox}
              plan={plan}
              isWorking={isWorking}
              currentRunId={currentRunId}
              events={events}
              onSend={handleSendTask}
            />
          </div>

          {/* Plan View (Right Side) */}
          {(activeRightView === "plan" || activeMobileTab === "plan") && (
            <div
              className={cn(
                "absolute inset-0 z-10 overflow-y-auto p-8 lg:p-12 bg-slate-950 scroll-smooth",
                activeMobileTab === "plan" ? "block" : "hidden md:block",
              )}
            >
              <div className="max-w-4xl mx-auto">
                <div className="prose prose-invert prose-sm lg:prose-base max-w-none prose-headings:tracking-tight prose-headings:uppercase prose-headings:text-primary prose-a:text-primary hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                  <Streamdown isAnimating={isWorking}>
                    {plan ||
                      "# No Plan Found\nYour agent hasn't created a plan for this session yet."}
                  </Streamdown>
                </div>
              </div>
            </div>
          )}

          {/* Preview View (Right Side) */}
          {(activeRightView === "preview" || activeMobileTab === "preview") && (
            <div
              className={cn(
                "absolute inset-0 bg-white",
                activeMobileTab === "preview" ? "block" : "hidden md:block",
              )}
            >
              <iframe
                src={iframeUrl}
                className={cn(
                  "w-full h-full border-0",
                  previewLoaded ? "z-10 relative" : "",
                )}
                title={`${sandbox.title || sandbox.id} Preview`}
                onLoad={() => setPreviewLoaded(true)}
              />

              {!previewLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  <div className="text-center space-y-4 md:space-y-6 max-w-lg px-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 mx-auto rounded-3xl bg-primary/20 flex items-center justify-center">
                      <Bot className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase text-white">
                      {sandbox.title || sandbox.id}
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      This is your box's hosted preview.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

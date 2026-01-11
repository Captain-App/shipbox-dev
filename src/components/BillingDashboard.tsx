import { CreditCard, ArrowUpRight, Zap, TrendingUp, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "./ui/Button"
import { cn } from "../lib/utils"
import { api } from "../lib/api"

export function BillingDashboard() {
  const [balance, setBalance] = useState<{ balanceCredits: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBalance()
      .then(data => setBalance(data))
      .catch(err => console.error("Failed to fetch balance:", err))
      .finally(() => setLoading(false));
  }, []);

  const balanceAmount = balance ? (balance.balanceCredits / 100).toFixed(2) : "0.00";

  const handleTopUp = async () => {
    try {
      const { url } = await api.createCheckoutSession(1000); // Default to £10.00
      window.location.href = url;
    } catch (err) {
      alert("Failed to initiate top-up");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Billing</h2>
          <p className="text-muted-foreground">Credits-first metering. No surprises, no runaway costs.</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleTopUp} className="gap-2">
          <ArrowUpRight className="w-4 h-4" />
          Top Up £10.00
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Balance</span>
          </div>
          {loading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <div className="text-4xl font-black tracking-tighter">£{balanceAmount}</div>
          )}
          <p className="text-xs text-muted-foreground">Approx. {(balance?.balanceCredits || 0)} minutes of compute remaining.</p>
        </div>

        <div className="p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Consumption</span>
          </div>
          <div className="text-4xl font-black tracking-tighter">£4.12</div>
          <p className="text-xs text-muted-foreground">Total spent this month across all agent activity.</p>
        </div>

        <div className="p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Efficiency</span>
          </div>
          <div className="text-4xl font-black tracking-tighter">94%</div>
          <p className="text-xs text-muted-foreground">Resource utilisation vs idle time for this sandbox.</p>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <p className="text-sm text-amber-200/80">
          Your balance is below £25. Enable auto-recharge to ensure your agent doesn't pause during long-running tasks.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-black uppercase tracking-tight">Recent Transactions</h3>
        <div className="rounded-3xl border border-white/5 bg-white/5 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { desc: 'Compute Usage (Session 822)', date: 'Today, 14:22', amount: '-£0.42' },
                { desc: 'Credit Top-up (Stripe)', date: 'Yesterday, 09:15', amount: '+£50.00' },
                { desc: 'Capability Purchase: RepoSwarm Premium', date: 'Dec 28, 2025', amount: '-£12.00' },
                { desc: 'Deployment Credits Pack', date: 'Dec 20, 2025', amount: '-£5.00' },
              ].map((tx, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">{tx.desc}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">{tx.date}</td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-bold text-right font-mono",
                    tx.amount.startsWith('+') ? 'text-green-500' : 'text-foreground'
                  )}>
                    {tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


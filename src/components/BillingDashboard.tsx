import { CreditCard, ArrowUpRight, Zap, TrendingUp, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "./ui/Button"
import { cn } from "../lib/utils"
import { api } from "../lib/api"

interface Transaction {
  id: string
  amountCredits: number
  type: string
  description?: string
  createdAt: number
}

export function BillingDashboard() {
  const [balance, setBalance] = useState<{ balanceCredits: number } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [consumption, setConsumption] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getBalance(),
      api.getTransactions(10),
      api.getConsumption()
    ])
      .then(([balanceData, txData, consumptionData]) => {
        setBalance(balanceData);
        setTransactions(txData);
        setConsumption(consumptionData.consumptionCredits);
      })
      .catch(err => console.error("Failed to fetch billing data:", err))
      .finally(() => setLoading(false));
  }, []);

  const balanceAmount = balance ? (balance.balanceCredits / 100).toFixed(2) : "0.00";
  const consumptionAmount = (consumption / 100).toFixed(2);

  const handleTopUp = async () => {
    try {
      const { url } = await api.createCheckoutSession(1000); // Default to £10.00
      window.location.href = url;
    } catch (err) {
      alert("Failed to initiate top-up");
    }
  };

  const handleManageBilling = async () => {
    try {
      const { url } = await api.createPortalSession();
      window.location.href = url;
    } catch (err: any) {
      alert(err.message || "Failed to open billing portal");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Billing</h2>
          <p className="text-muted-foreground">Credits-first metering. No surprises, no runaway costs.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={handleManageBilling} className="gap-2">
            Manage Payments
          </Button>
          <Button variant="primary" size="sm" onClick={handleTopUp} className="gap-2">
            <ArrowUpRight className="w-4 h-4" />
            Top Up £10.00
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Balance</span>
          </div>
          {loading ? (
            <div role="status">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
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
          {loading ? (
            <div role="status">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="text-4xl font-black tracking-tighter">£{consumptionAmount}</div>
          )}
          <p className="text-xs text-muted-foreground">Total spent this month across all agent activity.</p>
        </div>

        <div className="p-8 rounded-[2rem] border border-white/5 bg-white/5 space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Efficiency</span>
          </div>
          <div className="text-4xl font-black tracking-tighter text-muted-foreground/50">--%</div>
          <p className="text-xs text-muted-foreground">Efficiency metrics coming soon with session analytics.</p>
        </div>
      </div>

      {balance && balance.balanceCredits < 2500 && (
        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-sm text-amber-200/80">
            Your balance is below £25. Enable auto-recharge to ensure your agent doesn't pause during long-running tasks.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-black uppercase tracking-tight">Recent Transactions</h3>
        <div className="rounded-3xl border border-white/5 bg-white/5 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No transactions found.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">{tx.description || tx.type}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(tx.createdAt)}</td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right font-mono",
                      tx.amountCredits > 0 ? 'text-green-500' : 'text-foreground'
                    )}>
                      {tx.amountCredits > 0 ? '+' : ''}£{(tx.amountCredits / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

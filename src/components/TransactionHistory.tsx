import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserTransactions, Transaction } from '../services/transactionService';
import { History, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export function TransactionHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getUserTransactions(user.id);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-emerald-400 bg-emerald-500/10';
      case 'declined': return 'text-red-400 bg-red-500/10';
      case 'pending': return 'text-yellow-400 bg-yellow-500/10';
      default: return 'text-slate-400 bg-slate-700';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const totalAmount = transactions
    .filter(t => t.status === 'approved')
    .reduce((sum, t) => sum + t.amount, 0);

  const todayAmount = transactions
    .filter(t => {
      const transactionDate = new Date(t.createdAt);
      const today = new Date();
      return transactionDate.toDateString() === today.toDateString() && t.status === 'approved';
    })
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-bold text-white">Transaction History</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Total Approved</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">${totalAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{transactions.filter(t => t.status === 'approved').length} transactions</p>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Today's Total</p>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">${todayAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">of ${user?.dailyLimit || 1000} limit</p>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Declined</p>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-white">{transactions.filter(t => t.status === 'declined').length}</p>
          <p className="text-xs text-slate-400 mt-1">Total declined</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 mt-2">Loading transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-white">{transaction.merchantName}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">
                    ${transaction.amount.toFixed(2)}
                  </p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-600">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400">
                    Risk Score: <span className={`font-medium ${getRiskColor(transaction.riskScore)}`}>
                      {transaction.riskScore}
                    </span>
                  </span>
                  <span className="text-slate-400">
                    ID: {transaction.id.slice(0, 8)}
                  </span>
                </div>
                {transaction.declineReason && (
                  <span className="text-xs text-red-400">{transaction.declineReason}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

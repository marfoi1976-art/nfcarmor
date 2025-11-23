import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';
import { NFCPayment } from './NFCPayment';
import { TransactionHistory } from './TransactionHistory';
import { SecurityDashboard } from './SecurityDashboard';
import { DeviceManagement } from './DeviceManagement';
import { Shield, CreditCard, History, Smartphone, LogOut } from 'lucide-react';

type TabType = 'payment' | 'history' | 'security' | 'devices';

export function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('payment');
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'payment' as TabType, label: 'NFC Payment', icon: CreditCard },
    { id: 'history' as TabType, label: 'History', icon: History },
    { id: 'security' as TabType, label: 'Security', icon: Shield },
    { id: 'devices' as TabType, label: 'Devices', icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Secure NFC Pay</h1>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6">
          {activeTab === 'payment' && <NFCPayment />}
          {activeTab === 'history' && <TransactionHistory />}
          {activeTab === 'security' && <SecurityDashboard />}
          {activeTab === 'devices' && <DeviceManagement />}
        </div>
      </div>
    </div>
  );
}

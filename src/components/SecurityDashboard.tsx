import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSecurityLogs, getAccountSecurityStatus, SecurityLog } from '../services/securityService';
import { Shield, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export function SecurityDashboard() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, [user]);

  const loadSecurityData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [logsData, statusData] = await Promise.all([
        getSecurityLogs(user.id),
        getAccountSecurityStatus(user.id),
      ]);
      setLogs(logsData);
      setSecurityStatus(statusData);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      default: return 'text-blue-400 bg-blue-500/10';
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-bold text-white">Security Dashboard</h2>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 mt-2">Loading security data...</p>
        </div>
      ) : (
        <>
          {securityStatus && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">Security Score</p>
                <p className={`text-3xl font-bold ${getSecurityScoreColor(securityStatus.securityScore)}`}>
                  {securityStatus.securityScore}
                </p>
                <p className="text-xs text-slate-400 mt-1">out of 100</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">Account Status</p>
                <p className={`text-lg font-bold ${
                  securityStatus.accountStatus === 'active' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {securityStatus.accountStatus.toUpperCase()}
                </p>
                <p className="text-xs text-slate-400 mt-1">Current status</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">Failed Auth</p>
                <p className={`text-3xl font-bold ${
                  securityStatus.failedAuthAttempts > 3 ? 'text-red-400' : 'text-slate-300'
                }`}>
                  {securityStatus.failedAuthAttempts}
                </p>
                <p className="text-xs text-slate-400 mt-1">of 5 max</p>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-2">Critical Events</p>
                <p className={`text-3xl font-bold ${
                  securityStatus.recentCriticalEvents > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {securityStatus.recentCriticalEvents}
                </p>
                <p className="text-xs text-slate-400 mt-1">last 24 hours</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-3">Security Event Log</h3>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No security events logged</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getSeverityIcon(log.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <p className="font-medium text-white">{log.description}</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{log.eventType}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

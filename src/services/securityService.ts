import { supabase } from '../lib/supabase';

export interface SecurityLog {
  id: string;
  userId: string;
  eventType: string;
  severity: string;
  description: string;
  createdAt: string;
}

export async function getSecurityLogs(userId: string): Promise<SecurityLog[]> {
  const { data, error } = await supabase
    .from('security_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return data.map(log => ({
    id: log.id,
    userId: log.user_id,
    eventType: log.event_type,
    severity: log.severity,
    description: log.description,
    createdAt: log.created_at,
  }));
}

export async function logSecurityEvent(
  userId: string,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  metadata?: Record<string, any>
) {
  await supabase
    .from('security_logs')
    .insert({
      user_id: userId,
      event_type: eventType,
      severity,
      description,
      metadata: metadata || {},
    });
}

export async function getAccountSecurityStatus(userId: string) {
  const { data: userData } = await supabase
    .from('users')
    .select('status, failed_auth_attempts, last_failed_auth')
    .eq('id', userId)
    .maybeSingle();

  const recentLogs = await getRecentSecurityLogs(userId, 24);

  const criticalEvents = recentLogs.filter(log => log.severity === 'critical').length;
  const highEvents = recentLogs.filter(log => log.severity === 'high').length;

  return {
    accountStatus: userData?.status || 'unknown',
    failedAuthAttempts: userData?.failed_auth_attempts || 0,
    lastFailedAuth: userData?.last_failed_auth,
    recentCriticalEvents: criticalEvents,
    recentHighEvents: highEvents,
    totalRecentEvents: recentLogs.length,
    securityScore: calculateSecurityScore(
      userData?.failed_auth_attempts || 0,
      criticalEvents,
      highEvents
    ),
  };
}

function calculateSecurityScore(
  failedAttempts: number,
  criticalEvents: number,
  highEvents: number
): number {
  let score = 100;

  score -= failedAttempts * 10;
  score -= criticalEvents * 20;
  score -= highEvents * 10;

  return Math.max(0, score);
}

async function getRecentSecurityLogs(userId: string, hours: number) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('security_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoff.toISOString());

  if (error) return [];
  return data;
}

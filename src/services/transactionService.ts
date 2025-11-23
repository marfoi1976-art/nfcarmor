import { supabase } from '../lib/supabase';
import { generateTransactionSignature } from '../lib/crypto';

export interface Transaction {
  id: string;
  userId: string;
  deviceId: string;
  amount: number;
  currency: string;
  merchantId: string;
  merchantName: string;
  status: string;
  riskScore: number;
  declineReason?: string;
  createdAt: string;
}

export interface TransactionRequest {
  userId: string;
  deviceId: string;
  amount: number;
  merchantId: string;
  merchantName: string;
  currency?: string;
}

export async function processTransaction(
  request: TransactionRequest
): Promise<Transaction> {
  const timestamp = new Date().toISOString();
  const signature = await generateTransactionSignature(
    request.userId,
    request.amount,
    request.merchantId,
    timestamp
  );

  const riskScore = await calculateRiskScore(request);

  await checkAccountStatus(request.userId);

  await checkDailyLimit(request.userId, request.amount);

  const status = determineTransactionStatus(riskScore);

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: request.userId,
      device_id: request.deviceId,
      amount: request.amount,
      currency: request.currency || 'USD',
      merchant_id: request.merchantId,
      merchant_name: request.merchantName,
      status,
      risk_score: riskScore,
      signature,
      decline_reason: status === 'declined' ? 'High risk score' : null,
    })
    .select()
    .single();

  if (error) throw error;

  await logSecurityEvent(
    request.userId,
    'transaction_processed',
    riskScore > 70 ? 'high' : 'low',
    `Transaction ${status}: $${request.amount} at ${request.merchantName}`
  );

  if (status === 'approved') {
    await updateDeviceLastUsed(request.deviceId);
  }

  return {
    id: data.id,
    userId: data.user_id,
    deviceId: data.device_id,
    amount: data.amount,
    currency: data.currency,
    merchantId: data.merchant_id,
    merchantName: data.merchant_name,
    status: data.status,
    riskScore: data.risk_score,
    declineReason: data.decline_reason,
    createdAt: data.created_at,
  };
}

async function calculateRiskScore(request: TransactionRequest): Promise<number> {
  let score = 0;

  const recentTransactions = await getRecentTransactions(request.userId, 5);

  if (request.amount > 500) {
    score += 30;
  }

  if (recentTransactions.length >= 3) {
    score += 40;
  }

  const dailyTotal = await getDailyTransactionTotal(request.userId);
  if (dailyTotal + request.amount > 1000) {
    score += 50;
  }

  const isDuplicate = recentTransactions.some(
    t => t.merchant_id === request.merchantId &&
         Math.abs(t.amount - request.amount) < 0.01 &&
         Date.now() - new Date(t.created_at).getTime() < 60000
  );

  if (isDuplicate) {
    score += 70;
  }

  return Math.min(score, 100);
}

function determineTransactionStatus(riskScore: number): string {
  if (riskScore >= 80) return 'declined';
  if (riskScore >= 50) return 'pending';
  return 'approved';
}

async function checkAccountStatus(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.status !== 'active') {
    throw new Error('Account is not active');
  }
}

async function checkDailyLimit(userId: string, amount: number) {
  const { data } = await supabase
    .from('users')
    .select('daily_limit')
    .eq('id', userId)
    .maybeSingle();

  const dailyLimit = data?.daily_limit || 1000;
  const dailyTotal = await getDailyTransactionTotal(userId);

  if (dailyTotal + amount > dailyLimit) {
    throw new Error('Daily transaction limit exceeded');
  }
}

async function getDailyTransactionTotal(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .gte('created_at', today.toISOString());

  if (error) return 0;

  return data.reduce((sum, t) => sum + Number(t.amount), 0);
}

async function getRecentTransactions(userId: string, minutes: number) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return data.map(t => ({
    id: t.id,
    userId: t.user_id,
    deviceId: t.device_id,
    amount: t.amount,
    currency: t.currency,
    merchantId: t.merchant_id,
    merchantName: t.merchant_name,
    status: t.status,
    riskScore: t.risk_score,
    declineReason: t.decline_reason,
    createdAt: t.created_at,
  }));
}

async function updateDeviceLastUsed(deviceId: string) {
  await supabase
    .from('nfc_devices')
    .update({ last_used: new Date().toISOString() })
    .eq('id', deviceId);
}

async function logSecurityEvent(
  userId: string,
  eventType: string,
  severity: string,
  description: string
) {
  await supabase
    .from('security_logs')
    .insert({
      user_id: userId,
      event_type: eventType,
      severity,
      description,
      metadata: {},
    });
}

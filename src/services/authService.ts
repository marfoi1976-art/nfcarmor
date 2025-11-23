import { supabase } from '../lib/supabase';
import { hashPin } from '../lib/crypto';

export interface AuthUser {
  id: string;
  email: string;
  dailyLimit: number;
  status: string;
}

export async function signUp(email: string, password: string, pin: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  const pinHash = await hashPin(pin);

  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      pin_hash: pinHash,
      daily_limit: 1000.00,
      status: 'active',
    });

  if (profileError) throw profileError;

  await logSecurityEvent(
    authData.user.id,
    'user_signup',
    'low',
    'New user account created'
  );

  return authData;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (data?.user?.id) {
      await incrementFailedAuthAttempts(data.user.id);
    }
    throw error;
  }

  if (data.user) {
    await resetFailedAuthAttempts(data.user.id);
    await logSecurityEvent(
      data.user.id,
      'user_signin',
      'low',
      'User signed in successfully'
    );
  }

  return data;
}

export async function signOut() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await logSecurityEvent(
      user.id,
      'user_signout',
      'low',
      'User signed out'
    );
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, daily_limit, status')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    dailyLimit: data.daily_limit,
    status: data.status,
  };
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const pinHash = await hashPin(pin);

  const { data, error } = await supabase
    .from('users')
    .select('pin_hash')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    await logSecurityEvent(
      userId,
      'pin_verification_failed',
      'medium',
      'PIN verification failed'
    );
    return false;
  }

  const isValid = data.pin_hash === pinHash;

  if (!isValid) {
    await incrementFailedAuthAttempts(userId);
    await logSecurityEvent(
      userId,
      'invalid_pin',
      'high',
      'Invalid PIN entered'
    );
  }

  return isValid;
}

async function incrementFailedAuthAttempts(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('failed_auth_attempts')
    .eq('id', userId)
    .maybeSingle();

  const attempts = (data?.failed_auth_attempts || 0) + 1;

  await supabase
    .from('users')
    .update({
      failed_auth_attempts: attempts,
      last_failed_auth: new Date().toISOString(),
      status: attempts >= 5 ? 'locked' : 'active',
    })
    .eq('id', userId);

  if (attempts >= 5) {
    await logSecurityEvent(
      userId,
      'account_locked',
      'critical',
      `Account locked after ${attempts} failed attempts`
    );
  }
}

async function resetFailedAuthAttempts(userId: string) {
  await supabase
    .from('users')
    .update({
      failed_auth_attempts: 0,
      last_failed_auth: null,
    })
    .eq('id', userId);
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
      ip_address: null,
      metadata: {},
    });
}

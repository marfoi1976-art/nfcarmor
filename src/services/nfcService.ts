import { supabase } from '../lib/supabase';

export interface NFCDevice {
  id: string;
  userId: string;
  deviceUid: string;
  deviceName: string;
  isActive: boolean;
  lastUsed: string | null;
}

export async function checkNFCSupport(): Promise<boolean> {
  if (!('NDEFReader' in window)) {
    return false;
  }
  return true;
}

export async function registerNFCDevice(
  userId: string,
  deviceUid: string,
  deviceName: string
): Promise<NFCDevice> {
  const { data, error } = await supabase
    .from('nfc_devices')
    .insert({
      user_id: userId,
      device_uid: deviceUid,
      device_name: deviceName,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  await logSecurityEvent(
    userId,
    'nfc_device_registered',
    'low',
    `NFC device registered: ${deviceName}`
  );

  return {
    id: data.id,
    userId: data.user_id,
    deviceUid: data.device_uid,
    deviceName: data.device_name,
    isActive: data.is_active,
    lastUsed: data.last_used,
  };
}

export async function getUserDevices(userId: string): Promise<NFCDevice[]> {
  const { data, error } = await supabase
    .from('nfc_devices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(d => ({
    id: d.id,
    userId: d.user_id,
    deviceUid: d.device_uid,
    deviceName: d.device_name,
    isActive: d.is_active,
    lastUsed: d.last_used,
  }));
}

export async function verifyDeviceOwnership(
  deviceUid: string,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('nfc_devices')
    .select('user_id, is_active')
    .eq('device_uid', deviceUid)
    .maybeSingle();

  if (error || !data) return false;

  return data.user_id === userId && data.is_active;
}

export async function updateDeviceLastUsed(deviceId: string) {
  await supabase
    .from('nfc_devices')
    .update({ last_used: new Date().toISOString() })
    .eq('id', deviceId);
}

export async function deactivateDevice(deviceId: string, userId: string) {
  const { error } = await supabase
    .from('nfc_devices')
    .update({ is_active: false })
    .eq('id', deviceId)
    .eq('user_id', userId);

  if (error) throw error;

  await logSecurityEvent(
    userId,
    'nfc_device_deactivated',
    'medium',
    `NFC device deactivated: ${deviceId}`
  );
}

export async function readNFCTag(): Promise<string> {
  if (!('NDEFReader' in window)) {
    throw new Error('NFC not supported on this device');
  }

  const ndef = new (window as any).NDEFReader();

  try {
    await ndef.scan();

    return new Promise((resolve, reject) => {
      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        resolve(serialNumber);
      });

      ndef.addEventListener('error', () => {
        reject(new Error('Failed to read NFC tag'));
      });

      setTimeout(() => {
        reject(new Error('NFC read timeout'));
      }, 10000);
    });
  } catch (error) {
    throw new Error('NFC scan failed: ' + (error as Error).message);
  }
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

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateTransactionSignature(
  userId: string,
  amount: number,
  merchantId: string,
  timestamp: string
): Promise<string> {
  const data = `${userId}:${amount}:${merchantId}:${timestamp}`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyTransactionSignature(
  signature: string,
  userId: string,
  amount: number,
  merchantId: string,
  timestamp: string
): Promise<boolean> {
  const expectedSignature = await generateTransactionSignature(
    userId,
    amount,
    merchantId,
    timestamp
  );
  return signature === expectedSignature;
}

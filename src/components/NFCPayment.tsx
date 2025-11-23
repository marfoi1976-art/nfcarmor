import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkNFCSupport, readNFCTag, getUserDevices, registerNFCDevice } from '../services/nfcService';
import { processTransaction } from '../services/transactionService';
import { verifyPin } from '../services/authService';
import { Smartphone, AlertCircle, CheckCircle, Lock } from 'lucide-react';

export function NFCPayment() {
  const { user } = useAuth();
  const [nfcSupported, setNfcSupported] = useState(false);
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    checkNFC();
    loadDevices();
  }, []);

  const checkNFC = async () => {
    const supported = await checkNFCSupport();
    setNfcSupported(supported);
  };

  const loadDevices = async () => {
    if (!user) return;
    try {
      const userDevices = await getUserDevices(user.id);
      setDevices(userDevices);
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const pinValid = await verifyPin(user.id, pin);
      if (!pinValid) {
        throw new Error('Invalid PIN');
      }

      setScanning(true);
      setMessage('Tap your NFC device now...');

      const deviceUid = await readNFCTag();
      setScanning(false);

      let device = devices.find(d => d.deviceUid === deviceUid);

      if (!device) {
        const deviceName = `Device ${devices.length + 1}`;
        device = await registerNFCDevice(user.id, deviceUid, deviceName);
        setDevices([...devices, device]);
      }

      const transaction = await processTransaction({
        userId: user.id,
        deviceId: device.id,
        amount: parseFloat(amount),
        merchantId: `MERCH_${Date.now()}`,
        merchantName,
        currency: 'USD',
      });

      if (transaction.status === 'approved') {
        setMessageType('success');
        setMessage(`✓ Payment approved: $${amount} to ${merchantName}`);
        setAmount('');
        setMerchantName('');
        setPin('');
      } else if (transaction.status === 'declined') {
        setMessageType('error');
        setMessage(`✗ Payment declined: ${transaction.declineReason || 'High risk'}`);
      } else {
        setMessageType('error');
        setMessage(`Payment pending review (Risk Score: ${transaction.riskScore})`);
      }
    } catch (error) {
      setScanning(false);
      setMessageType('error');
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Smartphone className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-bold text-white">NFC Payment</h2>
      </div>

      {!nfcSupported && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">NFC Not Supported</p>
            <p className="text-yellow-400/80 text-sm mt-1">
              Your browser doesn't support Web NFC API. Use Chrome on Android or enable experimental features.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handlePayment} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Amount (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="0.00"
            required
          />
          <p className="mt-1 text-xs text-slate-400">
            Daily limit: ${user?.dailyLimit || 1000}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Merchant Name
          </label>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g., Coffee Shop"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Lock className="w-4 h-4 inline mr-2" />
            Transaction PIN
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="••••"
            required
            minLength={4}
            maxLength={6}
          />
        </div>

        {message && (
          <div className={`p-4 rounded-lg border flex items-start gap-3 ${
            messageType === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/50'
              : 'bg-red-500/10 border-red-500/50'
          }`}>
            {messageType === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p className={messageType === 'success' ? 'text-emerald-400' : 'text-red-400'}>
              {message}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !nfcSupported || scanning}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? 'Waiting for NFC tap...' : loading ? 'Processing...' : 'Process Payment'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-700">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Security Features</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400">Encryption</p>
            <p className="text-sm font-medium text-white">AES-256</p>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400">Fraud Detection</p>
            <p className="text-sm font-medium text-white">Real-time</p>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400">PIN Verification</p>
            <p className="text-sm font-medium text-white">Required</p>
          </div>
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400">Devices Registered</p>
            <p className="text-sm font-medium text-white">{devices.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

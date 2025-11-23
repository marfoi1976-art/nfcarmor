import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserDevices, deactivateDevice, NFCDevice } from '../services/nfcService';
import { Smartphone, Power, Clock } from 'lucide-react';

export function DeviceManagement() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<NFCDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDevices();
  }, [user]);

  const loadDevices = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await getUserDevices(user.id);
      setDevices(data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (deviceId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to deactivate this device?')) return;

    try {
      await deactivateDevice(deviceId, user.id);
      await loadDevices();
    } catch (error) {
      console.error('Failed to deactivate device:', error);
      alert('Failed to deactivate device');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Smartphone className="w-6 h-6 text-emerald-500" />
        <h2 className="text-2xl font-bold text-white">Device Management</h2>
      </div>

      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
        <p className="text-sm text-blue-400">
          Devices are automatically registered when you make your first NFC payment. You can deactivate devices at any time for security.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <p className="text-slate-400 mt-2">Loading devices...</p>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12">
          <Smartphone className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No devices registered yet</p>
          <p className="text-sm text-slate-500 mt-2">Make your first NFC payment to register a device</p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${device.isActive ? 'bg-emerald-500/20' : 'bg-slate-600'}`}>
                    <Smartphone className={`w-5 h-5 ${device.isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{device.deviceName}</h3>
                    <p className="text-xs text-slate-400 mt-1">UID: {device.deviceUid}</p>
                  </div>
                </div>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  device.isActive
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-400 bg-slate-600'
                }`}>
                  {device.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-600">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>
                    Last used: {device.lastUsed
                      ? new Date(device.lastUsed).toLocaleString()
                      : 'Never'}
                  </span>
                </div>

                {device.isActive && (
                  <button
                    onClick={() => handleDeactivate(device.id)}
                    className="flex items-center gap-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors"
                  >
                    <Power className="w-3 h-3" />
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { orderService } from '../utils/db';

interface CancelOrderModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CancelOrderModal = ({
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: CancelOrderModalProps) => {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const cancelReasons = [
    'Changed my mind',
    'Found better price elsewhere',
    'No longer needed',
    'Want to modify order',
    'Delivery time too long',
    'Other reason',
  ];

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Please select or enter a reason for cancellation');
      return;
    }

    setIsLoading(true);
    try {
      const success = await orderService.cancelOrder(orderId, reason);
      if (success) {
        toast.success('Order cancelled successfully.');
        setReason('');
        onClose();
        onSuccess();
      } else {
        toast.error('Failed to cancel order');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-2xl font-black">Cancel Order</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-700 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-800 font-medium">
              ⚠️ Cancel your order before it ships.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-900 uppercase tracking-widest">
              Reason for Cancellation *
            </label>
            <div className="space-y-2">
              {cancelReasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition font-medium text-sm ${
                    reason === r
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-red-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {reason === 'Other reason' && (
            <textarea
              value={reason === 'Other reason' ? '' : reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain your reason..."
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 resize-none"
              rows={4}
            />
          )}

          {reason && reason !== 'Other reason' && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
              <strong>Selected reason:</strong> {reason}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading || !reason}
            className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : 'Submit Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

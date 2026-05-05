import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  type?: 'danger' | 'warning' | 'info';
  cancelColor?: 'gray' | 'green';
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isLoading = false,
  type = 'danger',
  cancelColor = 'gray'
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-8">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
              type === 'danger' ? 'bg-red-50 text-red-600' : 
              type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
            }`}>
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-500 font-medium leading-relaxed">{message}</p>
            
            <div className="mt-8 flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className={`flex-1 px-6 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 ${
                  cancelColor === 'green' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-6 py-4 text-white rounded-2xl font-black transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 ${
                  type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 
                  type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

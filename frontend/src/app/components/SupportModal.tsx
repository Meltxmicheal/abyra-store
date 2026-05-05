import { useState } from 'react';
import { X, Upload, CheckCircle2, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthContext } from './Providers';
import { supportService } from '../utils/db';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { CustomDropdown } from './CustomDropdown';

interface SupportModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ISSUE_TYPES = [
  "Order not delivered",
  "Wrong product received",
  "Damaged product",
  "Want to cancel order",
  "Payment issue",
  "Other"
];

export const SupportModal = ({ orderId, isOpen, onClose }: SupportModalProps) => {
  const { user } = useAuthContext();
  const [issueType, setIssueType] = useState('');
  const [message, setMessage] = useState('');
  const [imageProof, setImageProof] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!issueType) {
      toast.error('Please select an issue type');
      return;
    }
    if (!message.trim()) {
      toast.error('Please describe your issue');
      return;
    }

    setIsLoading(true);

    try {
      const result = await supportService.create({
        orderId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        issueType,
        message,
        imageProof: imageProof || undefined
      });

      if (!result) {
        toast.error('Failed to submit request. Please try again.');
        return;
      }

      setIsSuccess(true);
      toast.success('Support request submitted!');
    } catch (error) {
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const issueOptions = ISSUE_TYPES.map(type => ({ id: type, name: type }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight">Need Help?</h3>
                <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Support Ticket</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-8">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h4 className="text-2xl font-black text-gray-900 mb-4">Request Submitted!</h4>
                <p className="text-gray-600 font-medium mb-8">
                  Your request has been submitted. Our team will contact you at <span className="font-bold text-gray-900">{user?.email}</span> soon.
                </p>
                <button
                  onClick={onClose}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:shadow-xl transition-all"
                >
                  Close
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order ID Display */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Order ID</label>
                  <div className="px-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 font-bold flex items-center justify-between">
                    <span>{orderId}</span>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                </div>

                {/* Issue Type */}
                <CustomDropdown
                  label="Select Issue Type"
                  options={issueOptions}
                  value={issueType}
                  onChange={(val) => setIssueType(val)}
                  placeholder="What happened?"
                  required
                  searchable={false}
                />

                {/* Message */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Describe Your Issue</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 font-medium focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all resize-none placeholder:text-gray-400"
                    placeholder="Provide as much detail as possible..."
                  />
                </div>

                {/* Optional Image Proof for Damage */}
                {issueType === "Damaged product" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Upload Proof (Optional)</label>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full px-4 py-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:border-purple-300 group-hover:text-purple-500 transition-all">
                        {imageProof ? (
                          <div className="relative w-full h-20 flex items-center justify-center">
                            <img src={imageProof} alt="Proof" className="h-full rounded-lg object-cover shadow-sm" />
                            <p className="ml-4 text-xs font-bold text-gray-900">Image selected</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2" />
                            <span className="text-xs font-bold">Tap to upload photo of damaged item</span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Footer Actions */}
                <div className="pt-4 flex items-center space-x-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-purple-700 disabled:opacity-50 transition-all shadow-xl shadow-purple-100 flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Request</span>
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-gray-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Average response time: 2-4 hours</span>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

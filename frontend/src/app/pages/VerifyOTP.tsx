import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { ShieldCheck, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const PRIMARY_COLOR = '#4A2C5A';

export const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      try {
        // Decode the "protected" OTP from the URL
        const decoded = atob(code);
        setOtp(decoded);
      } catch {
        setOtp('INVALID');
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#fdfafc] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-purple-50 p-8 md:p-12 text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center border border-purple-100 shadow-inner">
            <ShieldCheck className="w-10 h-10" style={{ color: PRIMARY_COLOR }} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight" style={{ color: PRIMARY_COLOR }}>Secure Verification</h1>
        <p className="text-gray-500 font-medium mb-10 leading-relaxed text-sm">
          For your protection, we've hidden your verification code. Click below to reveal it and access your account.
        </p>

        <div className="bg-purple-50 rounded-3xl p-8 mb-8 border border-purple-100 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {isRevealed ? (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center items-center space-x-4"
            >
              {otp?.split('').map((char, i) => (
                <span key={i} className="text-5xl font-black tracking-tighter" style={{ color: PRIMARY_COLOR }}>
                  {char}
                </span>
              ))}
            </motion.div>
          ) : (
            <button 
              onClick={() => setIsRevealed(true)}
              className="flex flex-col items-center space-y-3 mx-auto group"
            >
              <Lock className="w-8 h-8 text-purple-200 group-hover:text-purple-400 transition-colors" />
              <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">Click to Reveal Code</span>
            </button>
          )}
        </div>

        {isRevealed ? (
          <button 
            onClick={() => navigate('/login')}
            className="w-full text-white py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center space-x-3 group active:scale-95"
            style={{ backgroundColor: PRIMARY_COLOR, boxShadow: `0 10px 20px -10px ${PRIMARY_COLOR}66` }}
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <div className="flex items-center justify-center space-x-2 text-purple-200">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

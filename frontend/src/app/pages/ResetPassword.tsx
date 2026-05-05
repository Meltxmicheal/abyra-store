import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Eye, EyeOff, CheckCircle2, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import logo from '@/imports/1000182129.jpg';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthContext } from '../components/Providers';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase';
import { BACKEND_URL } from '../utils/api';

// ─── Local Storage Keys ─────────────────────────────────────────────────────
const LS_SESSION_KEY = 'abyra_recoverySession';
const LS_EXPIRY_KEY  = 'abyra_recoveryExpiry';

function saveRecoverySession(sessionData: any) {
  localStorage.setItem(LS_SESSION_KEY, JSON.stringify(sessionData));
  localStorage.setItem(LS_EXPIRY_KEY, String(Date.now() + 5 * 60 * 1000)); // 5 mins
}

function getRecoverySession() {
  try {
    const sessionStr = localStorage.getItem(LS_SESSION_KEY);
    const expiryStr = localStorage.getItem(LS_EXPIRY_KEY);
    return {
      session: sessionStr ? JSON.parse(sessionStr) : null,
      expiry: expiryStr ? Number(expiryStr) : 0
    };
  } catch {
    return { session: null, expiry: 0 };
  }
}

function clearRecoverySession() {
  localStorage.removeItem(LS_SESSION_KEY);
  localStorage.removeItem(LS_EXPIRY_KEY);
}

// ─── Password Strength Helpers ──────────────────────────────────────────────
function hasMinLength(p: string)  { return p.length >= 8; }
function hasSymbol(p: string)     { return /[^A-Za-z0-9]/.test(p); }

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const { setGlobalLoading } = useAuthContext();

  const [step, setStep] = useState<'otp' | 'password'>('otp');

  // OTP State
  const [otpValues, setOtpValues]   = useState(['', '', '', '', '', '']);
  const [otpStatus, setOtpStatus]   = useState<'neutral' | 'success' | 'error'>('neutral');
  const [otpError,  setOtpError]    = useState<string | null>(null);
  const [isShaking, setIsShaking]   = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password State
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);
  const [pwdError,        setPwdError]        = useState<string | null>(null);

  useEffect(() => {
    if (!emailFromUrl) navigate('/forgot-password');
  }, [emailFromUrl, navigate]);

  // Initial load check if we are returning to password step
  useEffect(() => {
    if (step === 'password') {
      const { session, expiry } = getRecoverySession();
      console.log("Session:", session);
      console.log("Expiry:", expiry);
      
      if (!session || Date.now() > expiry) {
        clearRecoverySession();
        toast.error('Session expired — please request a new code');
        navigate('/forgot-password');
      }
    }
  }, [step, navigate]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next   = [...otpValues];
      digits.forEach((d, i) => { if (index + i < 6) next[index + i] = d; });
      setOtpValues(next);
      const focusIdx = Math.min(index + digits.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }
    const cleaned = value.replace(/\D/g, '');
    const next    = [...otpValues];
    next[index]   = cleaned;
    setOtpValues(next);
    setOtpError(null);
    setOtpStatus('neutral');
    if (cleaned && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const fullOtp = otpValues.join('');
    if (fullOtp.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setGlobalLoading(true);
    setOtpError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailFromUrl, otp: fullOtp }),
      });
      const data = await res.json();

      if (res.ok) {
        // Save the recovery session config
        saveRecoverySession({ email: emailFromUrl, otp: fullOtp });
        setOtpStatus('success');
        setTimeout(() => setStep('password'), 600);
      } else {
        setOtpStatus('error');
        setIsShaking(true);
        setOtpError(data.error || 'Invalid or expired code. Please try again.');
        setTimeout(() => setIsShaking(false), 500);
      }
    } catch {
      setOtpError('Connection error. Please try again.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);

    // Frontend validations before API call
    if (!hasMinLength(password)) {
      setPwdError('Password must be at least 8 characters');
      return;
    }
    if (!hasSymbol(password)) {
      setPwdError('Password must include at least one symbol');
      return;
    }
    if (password !== confirmPassword) {
      setPwdError('Passwords do not match');
      return;
    }

    // Expiry check ONLY on submit, not on typing
    const { session, expiry } = getRecoverySession();
    console.log("Submit Session check:", session);
    console.log("Submit Expiry check:", expiry);

    if (!session || Date.now() > expiry) {
      clearRecoverySession();
      toast.error('Session expired — please request a new code');
      navigate('/forgot-password');
      return;
    }

    setGlobalLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password-final`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email, otp: session.otp, newPassword: password }),
      });
      const data = await res.json();
      console.log("[ResetPassword] Reset final response:", data);

      if (res.ok) {
        clearRecoverySession();

        // Clear the stale Supabase session so login starts clean.
        // We do NOT await this because it can hang if network is flaky.
        supabase.auth.signOut().catch(() => {});
        
        if (typeof window !== 'undefined') {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
              localStorage.removeItem(key);
            }
          });
        }

        toast.success('Password updated! Please log in with your new password.');
        setTimeout(() => {
          console.log("[ResetPassword] Navigating to login...");
          navigate('/login');
        }, 1500);
      } else {
        setPwdError(data.error || 'Failed to reset password');
      }

    } catch (err) {
      console.error("[ResetPassword] Reset final exception:", err);
      setPwdError('An error occurred. Please try again.');
    } finally {
      console.log("[ResetPassword] Resetting loading state");
      setGlobalLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all placeholder:text-gray-400';
  const focusRing = 'focus:ring-purple-600'; // Match login page exactly

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-10">
            <div className="relative inline-block">
              <img src={logo} alt="ABYRA" className="h-20 w-20 rounded-full object-cover mx-auto mb-4 shadow-md" />
              {otpStatus === 'success' && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-1 -bottom-1 bg-green-500 text-white rounded-full p-1 border-2 border-white">
                  <CheckCircle2 className="w-4 h-4" />
                </motion.div>
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {step === 'otp' ? 'Verify Your Code' : 'Set New Password'}
            </h2>
            <p className="text-gray-500 mt-2 text-sm">
              {step === 'otp' ? `We sent a 6-digit code to ${emailFromUrl}` : 'Choose a strong password for your account'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 'otp' && (
              <motion.form key="otp-form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Verification Code</label>
                    <span className="text-xs text-gray-400">Valid for 5 minutes</span>
                  </div>
                  <div className={`flex justify-between gap-2 ${isShaking ? 'animate-shake' : ''}`}>
                    {otpValues.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        autoFocus={i === 0}
                        className={[
                          'w-12 h-14 md:w-14 md:h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all outline-none',
                          otpStatus === 'error' ? 'border-red-400 bg-red-50 text-red-600' : 
                          otpStatus === 'success' ? 'border-green-500 bg-green-50 text-green-700' : 
                          'border-gray-300 bg-white text-gray-900 focus:border-purple-600'
                        ].join(' ')}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-center mt-2 h-5">
                    {otpStatus === 'error' && <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><XCircle className="w-4 h-4" />{otpError}</span>}
                    {otpStatus === 'success' && <span className="flex items-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle2 className="w-4 h-4" />Code verified!</span>}
                  </div>
                  {otpStatus === 'neutral' && otpError && (
                    <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-center text-xs font-semibold text-red-500 mt-1">
                      {otpError}
                    </motion.p>
                  )}
                </div>
                <button type="submit" disabled={otpValues.some(v => !v)} className="w-full bg-purple-600 text-white py-3.5 rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  Verify Code
                </button>
                <button type="button" onClick={() => navigate('/forgot-password')} className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium">
                  <ArrowLeft className="w-4 h-4" /> Request a new code
                </button>
              </motion.form>
            )}

            {step === 'password' && (
              <motion.form key="password-form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPwdError(null); }}
                      className={`${inputCls} ${focusRing} pr-12 hide-native-eye`}
                      placeholder="Enter new password"
                      required
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 space-y-1">
                      <p className={`text-xs flex items-center gap-1 ${hasMinLength(password) ? 'text-green-600' : 'text-gray-400'}`}>
                        <CheckCircle2 className="w-3 h-3" /> Minimum 8 characters
                      </p>
                      <p className={`text-xs flex items-center gap-1 ${hasSymbol(password) ? 'text-green-600' : 'text-gray-400'}`}>
                        <CheckCircle2 className="w-3 h-3" /> Includes a symbol (e.g. ! @ # $)
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPwdError(null); }}
                      className={`${inputCls} ${focusRing} pr-12 hide-native-eye`}
                      placeholder="Re-enter new password"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showConfirmPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {pwdError && (
                  <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-red-500">
                    {pwdError}
                  </motion.p>
                )}

                <button type="submit" className="w-full bg-purple-600 text-white py-3.5 rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">
                  Update Password
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="text-center mt-8">
            <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> End-to-end encrypted reset
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-6px); }
          40%  { transform: translateX(6px); }
          60%  { transform: translateX(-4px); }
          80%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        
        /* Remove default browser eye icons for passwords */
        .hide-native-eye::-ms-reveal,
        .hide-native-eye::-ms-clear {
          display: none !important;
        }
        .hide-native-eye::-webkit-credentials-auto-fill-button {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

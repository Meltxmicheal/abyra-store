import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { toast } from 'sonner';
import { Eye, EyeOff, RefreshCw, Shield, Smartphone, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '@/imports/1000182129.jpg';
import { supabase } from '../utils/supabase';
import { supabaseAuthService } from '../utils/supabaseAuth';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, login: contextLogin } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setError] = useState('');

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'choice' | 'email_otp' | 'authenticator' | 'admin_email_otp'>('credentials');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [twoFactorOTP, setTwoFactorOTP] = useState(['', '', '', '', '', '']);
  const [is2FAVerifying, setIs2FAVerifying] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(30);

  const from = (location.state as any)?.from || '/';

  useEffect(() => {
    if (isAuthenticated && user && !show2FAModal) {
      if (user.isAdmin) {
        navigate('/admin');
      } else {
        navigate(from);
      }
    }
  }, [isAuthenticated, user, navigate, from, show2FAModal]);

  useEffect(() => {
    let interval: any;
    if ((loginStep === 'email_otp' || loginStep === 'admin_email_otp') && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loginStep, resendTimer]);

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setIs2FAVerifying(true);
    setTwoFactorError('');
    try {
      const deviceToken = localStorage.getItem('abyra_admin_device_token');
      const startRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/admin/login-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUser.email, password: tempUser.password, deviceToken })
      });
      const startData = await startRes.json();
      
      if (!startRes.ok) {
        setTwoFactorError(startData.error || 'Failed to resend OTP');
        return;
      }
      
      toast.success('OTP resent successfully');
      setResendTimer(30);
    } catch (err) {
      setTwoFactorError('Failed to resend OTP');
    } finally {
      setIs2FAVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. First, check credentials with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (authError) {
        setError(authError.message);
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      // 2. Check 2FA Status and Admin status in one go (or separate calls)
      const statusRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/2fa/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const statusData = await statusRes.json();

      const deviceToken = localStorage.getItem('abyra_admin_device_token');
      const startRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/admin/login-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword, deviceToken })
      });
      const startData = await startRes.json();

      setTempUser({ email: cleanEmail, password: cleanPassword });

      // 3. Logic for 2FA
      // If admin AND 2FA is forced/enabled
      if (startData.isAdmin && !startData.skip2FA) {
        setLoginStep('choice');
        setShow2FAModal(true);
      } 
      // If regular user AND 2FA is enabled
      else if (!startData.isAdmin && statusData.enabled) {
        setLoginStep('choice');
        setShow2FAModal(true);
      }
      // Otherwise, proceed
      else {
        await proceedWithLocalLogin(cleanEmail, cleanPassword);
      }
    } catch (err: any) {
      console.error('[Auth] Login check error:', err);
      setError('Unexpected error. Please try again.');
      toast.error('Unexpected error. Please try again.');
    } finally {
      if (!show2FAModal) setLoading(false);
    }
  };

  const proceedWithLocalLogin = async (emailToUse: string, passwordToUse: string) => {
    console.log('[Auth] Proceeding with local login...');
    const result = await contextLogin(emailToUse, passwordToUse);
    if (!result.success) {
      setError(result.error || 'Login failed');
      toast.error(result.error || 'Login failed');
      return;
    }
    toast.success('Welcome back!');
  };

  const handleSendFallbackOtp = async () => {
    setIs2FAVerifying(true);
    setTwoFactorError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/2fa/send-fallback-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUser.email })
      });
      const data = await response.json();
      if (data.success) {
        setLoginStep('email_otp');
        setResendTimer(30);
        toast.success('Code sent to your email');
      } else {
        setTwoFactorError(data.error || 'Failed to send code');
      }
    } catch (error) {
      setTwoFactorError('Network error. Please try again.');
    } finally {
      setIs2FAVerifying(false);
    }
  };

  const handleVerifyAdminEmailOtp = async () => {
    const otp = emailOtp.join('');
    if (otp.length < 6) return;

    setIs2FAVerifying(true);
    setTwoFactorError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/admin/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUser.email, otp })
      });
      const data = await response.json();
      if (data.success) {
        setLoginStep('authenticator');
      } else {
        setTwoFactorError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setTwoFactorError('Failed to verify code');
    } finally {
      setIs2FAVerifying(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const otp = emailOtp.join('');
    if (otp.length < 6) return;

    setIs2FAVerifying(true);
    setTwoFactorError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/2fa/verify-fallback-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUser.email, otp })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Verification successful');
        setShow2FAModal(false);
        await proceedWithLocalLogin(tempUser.email, tempUser.password);
      } else {
        setTwoFactorError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setTwoFactorError('Failed to verify code');
    } finally {
      setIs2FAVerifying(false);
    }
  };

  const handleVerify2FA = async () => {
    const otp = twoFactorOTP.join('');
    if (otp.length < 6) return;

    setIs2FAVerifying(true);
    setTwoFactorError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/2fa/login-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempUser.email, otp })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('abyra_admin_device_token', data.deviceToken);
        toast.success('Verification successful');
        setShow2FAModal(false);
        await proceedWithLocalLogin(tempUser.email, tempUser.password);
      } else {
        setTwoFactorError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      setTwoFactorError('Failed to verify code');
    } finally {
      setIs2FAVerifying(false);
    }
  };

  const handleEmailOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...emailOtp];
    newOtp[index] = value;
    setEmailOtp(newOtp);

    if (value && index < 5) {
      const id = loginStep === 'admin_email_otp' || loginStep === 'email_otp' ? `login-email-otp-${index + 1}` : `login-email-otp-${index + 1}`;
      document.getElementById(id)?.focus();
    }
  };

  const handle2FAOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...twoFactorOTP];
    newOtp[index] = value;
    setTwoFactorOTP(newOtp);

    if (value && index < 5) {
      document.getElementById(`login-auth-otp-${index + 1}`)?.focus();
    }
  };

  const handleCancel2FA = async () => {
    setShow2FAModal(false);
    setTwoFactorOTP(['', '', '', '', '', '']);
    setEmailOtp(['', '', '', '', '', '']);
    setTempUser(null);
    setLoginStep('credentials');
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Logo */}
          <div className="text-center mb-10">
            <img
              src={logo}
              alt="ABYRA"
              className="h-20 w-20 rounded-full object-cover mx-auto mb-4 shadow-md"
            />
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 mt-2">Sign in to your ABYRA account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all placeholder:text-gray-400"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all placeholder:text-gray-400"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-purple-600 text-white py-3.5 rounded-lg font-semibold hover:bg-purple-700 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-purple-200 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-10">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-purple-600 hover:text-purple-700 font-bold">
                Sign Up Free
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* 2FA Verification Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-50 rounded-xl">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900">2-Step Verify</h3>
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">Extra Security Layer</p>
                  </div>
                </div>
                <button onClick={handleCancel2FA} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-gray-600 font-bold">
                    {loginStep === 'choice'
                      ? 'Choose your verification method'
                      : loginStep === 'admin_email_otp' || loginStep === 'email_otp'
                      ? 'Please enter the 6-digit code sent to your email.'
                      : 'Please enter the 6-digit code from your Google Authenticator app.'}
                  </p>
                </div>

                {loginStep === 'choice' ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setLoginStep('authenticator')}
                      className="w-full flex items-center p-4 bg-purple-50 rounded-2xl border-2 border-transparent hover:border-purple-600 transition-all text-left"
                    >
                      <div className="p-3 bg-white rounded-xl mr-4 shadow-sm">
                        <Smartphone className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">Google Authenticator</p>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Recommended</p>
                      </div>
                    </button>
                    <button
                      onClick={handleSendFallbackOtp}
                      disabled={is2FAVerifying}
                      className="w-full flex items-center p-4 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-purple-600 transition-all text-left"
                    >
                      <div className="p-3 bg-white rounded-xl mr-4 shadow-sm">
                        <Loader2 className={`w-6 h-6 text-purple-600 ${is2FAVerifying ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">Email OTP</p>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Fallback Method</p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center gap-2">
                    {loginStep === 'admin_email_otp' || loginStep === 'email_otp' ? (
                      emailOtp.map((digit, idx) => (
                        <input
                          key={`email-${idx}`}
                          id={`login-email-otp-${idx}`}
                          type="text"
                          value={digit}
                          onChange={(e) => handleEmailOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !emailOtp[idx] && idx > 0) {
                              document.getElementById(`login-email-otp-${idx - 1}`)?.focus();
                            }
                          }}
                          className={`w-12 h-16 text-center text-2xl font-black rounded-2xl border-2 transition-all outline-none ${
                            twoFactorError ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 bg-gray-50 focus:border-purple-600 focus:bg-white text-purple-600'
                          }`}
                        />
                      ))
                    ) : (
                      twoFactorOTP.map((digit, idx) => (
                        <input
                          key={`auth-${idx}`}
                          id={`login-auth-otp-${idx}`}
                          type="text"
                          value={digit}
                          onChange={(e) => handle2FAOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !twoFactorOTP[idx] && idx > 0) {
                              document.getElementById(`login-auth-otp-${idx - 1}`)?.focus();
                            }
                          }}
                          className={`w-12 h-16 text-center text-2xl font-black rounded-2xl border-2 transition-all outline-none ${
                            twoFactorError ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 bg-gray-50 focus:border-purple-600 focus:bg-white text-purple-600'
                          }`}
                        />
                      ))
                    )}
                  </div>
                )}

                {twoFactorError && (
                  <motion.div
                    initial={{ x: -10 }}
                    animate={{ x: [0, -10, 10, -10, 10, 0] }}
                    className="flex items-center justify-center text-red-500 space-x-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">{twoFactorError}</span>
                  </motion.div>
                )}

                <div className="space-y-4">
                  {loginStep === 'choice' ? null : loginStep === 'admin_email_otp' || loginStep === 'email_otp' ? (
                    <div className="space-y-4">
                      <button
                        onClick={loginStep === 'admin_email_otp' ? handleVerifyAdminEmailOtp : handleVerifyEmailOtp}
                        disabled={is2FAVerifying || emailOtp.join('').length < 6}
                        className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 disabled:opacity-50 flex items-center justify-center"
                      >
                        {is2FAVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify Email Code</span>}
                      </button>
                      <button
                        onClick={loginStep === 'admin_email_otp' ? handleResendOtp : handleSendFallbackOtp}
                        disabled={resendTimer > 0 || is2FAVerifying}
                        className="w-full text-sm font-bold text-purple-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleVerify2FA}
                      disabled={is2FAVerifying || twoFactorOTP.join('').length < 6}
                      className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 disabled:opacity-50 flex items-center justify-center"
                    >
                      {is2FAVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify Authenticator</span>}
                    </button>
                  )}
                  <button
                    onClick={handleCancel2FA}
                    className="w-full text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600"
                  >
                    Cancel & Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
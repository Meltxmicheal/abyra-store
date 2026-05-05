import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { toast } from 'sonner';
import { User as UserIcon, Mail, Phone, ShoppingBag, MapPin, LogOut, Key, RefreshCw, X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Shield, Smartphone, Lock } from 'lucide-react';
import { User } from '../utils/supabaseAuth';
import { Avatar } from '../components/Avatar';
import { CustomDropdown } from '../components/CustomDropdown';
import { motion, AnimatePresence } from 'framer-motion';

export const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, updateProfile, logout, changePassword } = useAuthContext();
  
  const [name, setName] = useState('');
  const [gender, setGender] = useState<User['gender']>('prefer_not_to_say');
  const [phone, setPhone] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { setGlobalLoading } = useAuthContext();

  const genderOptions = [
    { id: 'male', name: 'Male' },
    { id: 'female', name: 'Female' },
    { id: 'other', name: 'Other' },
    { id: 'prefer_not_to_say', name: 'Prefer not to say' }
  ];

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'INITIAL' | 'OTP_SENT' | 'OTP_VERIFIED'>('INITIAL');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'SETUP' | 'VERIFY'>('SETUP');
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [twoFactorOTP, setTwoFactorOTP] = useState(['', '', '', '', '', '']);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showEnable2FAPasswordModal, setShowEnable2FAPasswordModal] = useState(false);
  const [enable2FAPassword, setEnable2FAPassword] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      console.log('[Profile] Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (user) {
      setName(user.name);
      setGender(user.gender || 'prefer_not_to_say');
      setPhone(user.phoneNumber || '');
    }
  }, [user, isAuthenticated, isLoading, navigate]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    
    setGlobalLoading(true);
    try {
      const updated = await updateProfile({ name, gender, phone });
      if (updated) {
        setIsEditing(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setIsSending(true);
    try {
      const { data: { session } } = await (await import('../utils/supabase')).supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ email: user?.email }),
      });
      const data = await response.json();
      if (data.success) {
        setPasswordStep('OTP_SENT');
        toast.success('Verification code sent to your email');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) return;
    
    setIsVerifying(true);
    setOtpError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, otp: otpString }),
      });
      const data = await response.json();
      if (data.success) {
        setPasswordStep('OTP_VERIFIED');
      } else {
        setOtpError(data.error || 'Invalid code');
      }
    } catch (error) {
      setOtpError('Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (newPassword.length < 8 || !hasSymbol) {
      setPasswordError('Password must be at least 8 characters with 1 symbol');
      return;
    }

    setGlobalLoading(true);
    try {
      const { data: { session } } = await (await import('../utils/supabase')).supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          email: user?.email, 
          otp: otp.join(''), 
          newPassword 
        }),
      });
      const data = await response.json();
      console.log("[Profile] Update password response:", data);

      if (data.success) {
        toast.success('Password updated successfully');
        setShowPasswordModal(false);
        setPasswordStep('INITIAL');
        setOtp(['', '', '', '', '', '']);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'Failed to update password');
      }
    } catch (error) {
      console.error("[Profile] Update password exception:", error);
      setPasswordError('Update failed');
    } finally {
      console.log("[Profile] Resetting loading state");
      setGlobalLoading(false);
    }
  };

  const handleSetup2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!enable2FAPassword) return;

    console.log("[2FA SETUP] Starting 2FA setup flow...");
    setIs2FALoading(true);
    try {
      const { data: { session } } = await (await import('../utils/supabase')).supabase.auth.getSession();
      console.log("[2FA SETUP] Session retrieved, calling setup API...");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ password: enable2FAPassword }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("[2FA SETUP] API Response Status:", response.status);

      const data = await response.json();
      console.log("[2FA SETUP] API Response Data:", data);

      if (data.success) {
        setTwoFactorSecret(data.secret);
        setQrCode(data.qrCode);
        setTwoFactorStep('SETUP');
        setShowEnable2FAPasswordModal(false);
        setEnable2FAPassword('');
        setShow2FAModal(true);
        toast.success('Authentication secret generated. Please scan the QR code.');
      } else {
        console.error("[2FA SETUP] API Error:", data.error);
        toast.error(data.error || 'Failed to initialize 2FA setup');
      }
    } catch (error: any) {
      console.error("[2FA SETUP] Catch Error:", error);
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Connection error during 2FA setup');
      }
    } finally {
      console.log("[2FA SETUP] Flow complete, resetting loader");
      setIs2FALoading(false);
    }
  };

  const handleVerify2FA = async () => {
    const otp = twoFactorOTP.join('');
    if (otp.length < 6) return;

    console.log("[2FA VERIFY] Starting verification...");
    setIs2FALoading(true);
    try {
      const { data: { session } } = await (await import('../utils/supabase')).supabase.auth.getSession();
      console.log("[2FA VERIFY] Session retrieved, calling verify API...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ otp, secret: twoFactorSecret }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("[2FA VERIFY] API Response Status:", response.status);

      const data = await response.json();
      console.log("[2FA VERIFY] API Response Data:", data);

      if (data.success) {
        toast.success('Two-step verification enabled successfully');
        setShow2FAModal(false);
        setTwoFactorOTP(['', '', '', '', '', '']);
        // Refresh profile to reflect changes
        window.location.reload();
      } else {
        console.error("[2FA VERIFY] API Error:", data.error);
        toast.error(data.error || 'Invalid verification code');
      }
    } catch (error: any) {
      console.error("[2FA VERIFY] Catch Error:", error);
      if (error.name === 'AbortError') {
        toast.error('Verification timed out. Please try again.');
      } else {
        toast.error('Failed to verify 2FA code');
      }
    } finally {
      console.log("[2FA VERIFY] Flow complete, resetting loader");
      setIs2FALoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    console.log("[2FA DISABLE] Starting deactivation flow...");
    setIs2FALoading(true);
    try {
      const { data: { session } } = await (await import('../utils/supabase')).supabase.auth.getSession();
      console.log("[2FA DISABLE] Session retrieved, calling disable API...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ password: disablePassword }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("[2FA DISABLE] API Response Status:", response.status);

      const data = await response.json();
      console.log("[2FA DISABLE] API Response Data:", data);

      if (data.success) {
        toast.success('Two-step verification disabled');
        setShowDisable2FAModal(false);
        setDisablePassword('');
        // Refresh profile
        window.location.reload();
      } else {
        console.error("[2FA DISABLE] API Error:", data.error);
        toast.error(data.error || 'Incorrect password');
      }
    } catch (error: any) {
      console.error("[2FA DISABLE] Catch Error:", error);
      if (error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Failed to disable 2FA');
      }
    } finally {
      console.log("[2FA DISABLE] Flow complete, resetting loader");
      setIs2FALoading(false);
    }
  };

  const handleTwoFactorOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...twoFactorOTP];
    newOtp[index] = value;
    setTwoFactorOTP(newOtp);

    if (value && index < 5) {
      document.getElementById(`2fa-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  if (!user) return null;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2 px-2">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">My Profile</h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Manage Your Account</p>
          </div>
          {user.isAdmin && (
            <span className="bg-purple-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-100">
              Admin
            </span>
          )}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-50 overflow-hidden transition-all hover:shadow-purple-50 hover:shadow-2xl">
          {/* Header/Banner */}
          <div className="h-32 bg-purple-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent animate-pulse" />
          </div>

          <div className="px-8 pb-8">
            {/* Profile Avatar */}
            <div className="relative -mt-16 mb-8 flex justify-start pl-4">
              <div className="p-2 bg-white rounded-full shadow-2xl group cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <Avatar name={user.name} size="xl" className="border-4 border-white shadow-inner" />
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Your name"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 disabled:bg-transparent disabled:border-transparent font-bold text-gray-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">
                    Email Address
                  </label>
                  <div className="flex items-center space-x-3 px-5 py-4 bg-gray-50/50 border border-transparent rounded-2xl">
                    <Mail className="w-5 h-5 text-purple-400" />
                    <span className="text-gray-500 font-bold">{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditing}
                      placeholder="9876543210"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 disabled:bg-transparent disabled:border-transparent font-bold text-gray-900 transition-all outline-none"
                    />
                    {!isEditing && <Phone className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-200" />}
                  </div>
                </div>

                <div className={!isEditing ? 'pointer-events-none' : ''}>
                  <CustomDropdown
                    label="Gender"
                    options={genderOptions}
                    value={genderOptions.find(o => o.id === gender)?.name || 'Prefer not to say'}
                    onChange={(val) => setGender(genderOptions.find(o => o.name === val)?.id as User['gender'])}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-wrap gap-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition flex items-center justify-center"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(user.name);
                      setGender(user.gender || 'prefer_not_to_say');
                      setPhone(user.phoneNumber || '');
                    }}
                    className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-100"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-6 border border-purple-100 text-purple-600 py-2.5 rounded-lg font-bold hover:bg-purple-50 transition flex items-center space-x-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>Change Password</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication Section (Admin Only) */}
        {user.isAdmin && (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-50 overflow-hidden p-8 transition-all hover:shadow-purple-50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-2xl ${user.twoFactorEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900">Two-Step Verification</h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {user.twoFactorEnabled ? 'Enabled and Protecting' : 'Recommended for Security'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <button
                  onClick={() => user.twoFactorEnabled ? setShowDisable2FAModal(true) : setShowEnable2FAPasswordModal(true)}
                  disabled={is2FALoading}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${user.twoFactorEnabled ? 'bg-green-500' : 'bg-gray-200'} ${is2FALoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${user.twoFactorEnabled ? 'translate-x-8' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
              <div className="flex items-start space-x-3 text-sm text-gray-600 font-bold leading-relaxed">
                <Smartphone className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <span>Add an extra layer of security to your account. Once enabled, you'll need to enter a 6-digit code from your authenticator app each time you sign in.</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex items-start space-x-4"
          >
            <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">My Orders</h3>
              <p className="text-sm text-gray-500 mt-1">Check your order history</p>
            </div>
          </button>
          
          <button
            onClick={() => navigate('/addresses')}
            className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left flex items-start space-x-4"
          >
            <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
              <MapPin className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">My Addresses</h3>
              <p className="text-sm text-gray-500 mt-1">Manage delivery locations</p>
            </div>
          </button>
        </div>

        {/* Logout Button */}
        <div className="pt-8 flex justify-center">
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-8 py-3 bg-white/50 backdrop-blur-md border border-red-50 text-red-500 rounded-full hover:bg-red-50 transition-all font-bold text-sm shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout from ABYRA</span>
          </button>
        </div>
      </div>
    </div>

    {/* Change Password Modal (Admin Version) */}
    <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Secure Reset</h3>
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">
                    {passwordStep === 'INITIAL' && 'Identity Verification'}
                    {passwordStep === 'OTP_SENT' && 'Enter Verification Code'}
                    {passwordStep === 'OTP_VERIFIED' && 'Set New Credentials'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordStep('INITIAL');
                    setOtp(['', '', '', '', '', '']);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8">
                {passwordStep === 'INITIAL' && (
                  <div className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Key className="w-10 h-10 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-gray-500 font-bold mb-1">A verification code will be sent to:</p>
                      <p className="text-purple-600 font-black text-lg">{user.email}</p>
                    </div>
                    <button
                      onClick={handleSendOTP}
                      disabled={isSending}
                      className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 flex items-center justify-center space-x-2"
                    >
                      {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Send OTP Code</span>}
                    </button>
                  </div>
                )}

                {passwordStep === 'OTP_SENT' && (
                  <div className="space-y-8">
                    <div className="flex justify-center gap-2">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className={`w-12 h-16 text-center text-2xl font-black rounded-2xl border-2 transition-all outline-none ${
                            otpError ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 bg-gray-50 focus:border-purple-600 focus:bg-white text-purple-600'
                          }`}
                        />
                      ))}
                    </div>

                    {otpError && (
                      <motion.div
                        initial={{ x: -10 }}
                        animate={{ x: [0, -10, 10, -10, 10, 0] }}
                        className="flex items-center justify-center text-red-500 space-x-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">{otpError}</span>
                      </motion.div>
                    )}

                    <div className="space-y-4">
                      <button
                        onClick={handleVerifyOTP}
                        disabled={isVerifying || otp.join('').length < 6}
                        className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 disabled:opacity-50 disabled:shadow-none flex items-center justify-center space-x-2"
                      >
                        {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Verify & Continue</span>}
                      </button>
                      <button
                        onClick={handleSendOTP}
                        className="w-full text-xs font-black text-purple-600 uppercase tracking-widest hover:text-purple-700"
                      >
                        Resend Code
                      </button>
                    </div>
                  </div>
                )}

                {passwordStep === 'OTP_VERIFIED' && (
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 font-bold text-gray-900 transition-all outline-none"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">Confirm New Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 font-bold text-gray-900 transition-all outline-none"
                          placeholder="••••••••"
                        />
                      </div>

                      {passwordError && (
                        <div className="flex items-center space-x-2 text-red-500 px-1">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-widest">{passwordError}</span>
                        </div>
                      )}

                      <div className="bg-purple-50 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
                          <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}>Min 8 Characters</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest">
                          <div className={`w-1.5 h-1.5 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>1 Special Symbol</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 flex items-center justify-center space-x-2"
                    >
                      <span>Finalize Reset</span>
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA Setup Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Setup 2FA</h3>
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">Google Authenticator</p>
                </div>
                <button onClick={() => setShow2FAModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8">
                {twoFactorStep === 'SETUP' ? (
                  <div className="space-y-6 text-center">
                    <p className="text-gray-600 font-bold">Scan this QR code with your authenticator app (like Google Authenticator or Authy)</p>
                    
                    <div className="bg-white p-4 rounded-3xl border-4 border-purple-50 inline-block">
                      {qrCode ? (
                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="bg-purple-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1">Manual Entry Key</p>
                      <p className="text-sm font-black text-gray-700 tracking-[0.2em]">{twoFactorSecret}</p>
                    </div>

                    <button
                      onClick={() => setTwoFactorStep('VERIFY')}
                      className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100"
                    >
                      I've Scanned the Code
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-center text-gray-600 font-bold">Enter the 6-digit code from your app to verify setup</p>
                    
                    <div className="flex justify-center gap-2">
                      {twoFactorOTP.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`2fa-otp-${idx}`}
                          type="text"
                          value={digit}
                          onChange={(e) => handleTwoFactorOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !twoFactorOTP[idx] && idx > 0) {
                              document.getElementById(`2fa-otp-${idx - 1}`)?.focus();
                            }
                          }}
                          className="w-12 h-16 text-center text-2xl font-black rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-purple-600 focus:bg-white text-purple-600 outline-none transition-all"
                        />
                      ))}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setTwoFactorStep('SETUP')}
                        className="flex-1 border border-gray-200 text-gray-600 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleVerify2FA}
                        disabled={is2FALoading || twoFactorOTP.join('').length < 6}
                        className="flex-[2] bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 disabled:opacity-50"
                      >
                        {is2FALoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Complete Setup'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disable 2FA Modal */}
      <AnimatePresence>
        {showDisable2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 text-red-600">Disable 2FA</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Security Action Required</p>
                </div>
                <button onClick={() => setShowDisable2FAModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleDisable2FA} className="p-8 space-y-6">
                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-800 leading-relaxed">
                    Disabling Two-Step Verification makes your account less secure. Please enter your password to confirm this action.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">Your Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 font-bold text-gray-900 transition-all outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={is2FALoading || !disablePassword}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100 disabled:opacity-50"
                >
                  {is2FALoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm & Disable'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enable 2FA Password Confirmation Modal */}
      <AnimatePresence>
        {showEnable2FAPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Enable 2FA</h3>
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mt-1">Identity Verification</p>
                </div>
                <button onClick={() => setShowEnable2FAPasswordModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSetup2FA} className="p-8 space-y-6">
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-purple-800 leading-relaxed">
                    Please enter your password to confirm and initialize the two-step verification setup.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest px-1">Your Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={enable2FAPassword}
                      onChange={(e) => setEnable2FAPassword(e.target.value)}
                      required
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-600 font-bold text-gray-900 transition-all outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={is2FALoading || !enable2FAPassword}
                  className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 disabled:opacity-50"
                >
                  {is2FALoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm & Continue'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
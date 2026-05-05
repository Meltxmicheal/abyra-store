import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { toast } from 'sonner';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import logo from '@/imports/1000182129.jpg';
import { User } from '../utils/supabaseAuth';
import { CustomDropdown } from '../components/CustomDropdown';

export const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isLoading } = useAuthContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<User['gender']>('prefer_not_to_say');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setError] = useState('');

  const passwordRequirements = {
    length: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name || !email || !phone || !gender || !password || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    // Step 10: Fail safe UI timer
    const timer = window.setTimeout(() => {
      toast.error('Registration is taking longer than expected. Please try again.', {
        duration: 5000,
        id: 'register-timeout'
      });
      setLoading(false);
    }, 5000); // 5 seconds for fail-safe

    try {
      console.log('Calling register function...');
      const result = await register(email, password, name, phone, gender);
      
      if (result.success) {
        console.log('Registration success');
        toast.success('Account created! Please verify your email.');
        navigate('/verify-email', { state: { email } });
      } else {
        console.error('Registration failed:', result.error);
        setError(result.error || 'Registration failed');
        toast.error(result.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Unexpected error during registration:', error);
      setError('An unexpected error occurred during registration');
      toast.error('An unexpected error occurred during registration');
    } finally {
      if (timer) clearTimeout(timer);
      setLoading(false);
    }
  };

  const genderOptions = [
    { id: 'male', name: 'Male' },
    { id: 'female', name: 'Female' },
    { id: 'other', name: 'Other' },
    { id: 'prefer_not_to_say', name: 'Prefer not to say' }
  ];

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
            <h2 className="text-3xl font-bold text-gray-900">Join ABYRA Family</h2>
            <p className="text-gray-500 mt-2">Premium Crochet & Accessories Store</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all placeholder:text-gray-400 font-normal text-gray-900"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all placeholder:text-gray-400 font-normal text-gray-900"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="flex items-center space-x-2">
                <div className="px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-medium text-sm">
                  +91
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(value);
                  }}
                  required
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all placeholder:text-gray-400 font-normal text-gray-900"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <CustomDropdown
              label="Gender"
              options={genderOptions}
              value={genderOptions.find(o => o.id === gender)?.name || 'Prefer not to say'}
              onChange={(val) => setGender(genderOptions.find(o => o.name === val)?.id as User['gender'])}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create Password
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all placeholder:text-gray-400 font-normal text-gray-900"
                  placeholder=" Set a password "
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Hints */}
              {password && (
                <div className="mt-3 grid grid-cols-2 gap-2 px-1">
                  <p className={`text-[10px] font-bold flex items-center space-x-1.5 ${passwordRequirements.length ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordRequirements.length ? 'bg-green-600' : 'bg-gray-300'}`} />
                    <span>8+ characters</span>
                  </p>
                  <p className={`text-[10px] font-bold flex items-center space-x-1.5 ${passwordRequirements.hasLetter ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordRequirements.hasLetter ? 'bg-green-600' : 'bg-gray-300'}`} />
                    <span>Letter</span>
                  </p>
                  <p className={`text-[10px] font-bold flex items-center space-x-1.5 ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordRequirements.hasNumber ? 'bg-green-600' : 'bg-gray-300'}`} />
                    <span>Number</span>
                  </p>
                  <p className={`text-[10px] font-bold flex items-center space-x-1.5 ${passwordRequirements.hasSymbol ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordRequirements.hasSymbol ? 'bg-green-600' : 'bg-gray-300'}`} />
                    <span>Symbol</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all placeholder:text-gray-400 font-normal text-gray-900"
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-[10px] font-bold text-red-500 px-1">Passwords do not match</p>
              )}
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-10">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-purple-600 hover:text-purple-700 font-bold">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
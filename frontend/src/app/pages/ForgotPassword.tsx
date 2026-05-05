import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { toast } from 'sonner';
import { KeyRound, ArrowLeft, Send, RefreshCw } from 'lucide-react';
import logo from '@/imports/1000182129.jpg';
import { BACKEND_URL } from '../utils/api';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuthContext();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      // Call our backend API directly
      const response = await fetch(`${BACKEND_URL}/api/email/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Verification code sent!');
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        toast.error(data.error || 'Failed to send reset code');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img 
              src={logo} 
              alt="ABYRA" 
              className="h-16 w-16 rounded-full object-cover mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
            <p className="text-gray-600 mt-2">No worries, we'll send you reset instructions.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-900 transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

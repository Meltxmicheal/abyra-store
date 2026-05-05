import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuthContext } from '../components/Providers';
import { toast } from 'sonner';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import logo from '../../imports/1000182129.jpg';

export const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resendVerification } = useAuthContext();
  const email = location.state?.email;
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error('Email not found. Please try logging in.');
      return;
    }

    setIsResending(true);
    try {
      const result = await resendVerification(email);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <img 
            src={logo} 
            alt="ABYRA" 
            className="h-20 w-20 rounded-full object-cover mx-auto mb-6"
          />
          
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
          <p className="text-gray-600 mb-8">
            A verification link has been sent to <span className="font-semibold">{email || 'your email'}</span>. 
            Please check your inbox and click the link to activate your account.
          </p>

          <div className="space-y-4">
            <button
              onClick={handleResend}
              disabled={isResending}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Resending...</span>
                </>
              ) : (
                <span>Resend Email</span>
              )}
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-900 transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

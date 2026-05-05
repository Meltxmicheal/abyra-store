import { Outlet, useLocation } from 'react-router';
import { useEffect } from 'react';
import { useAuthContext } from './Providers';
import { Navbar } from './Navbar';
import { Toaster } from './ui/sonner';
import { GlobalLoader } from './GlobalLoader';
import { AutoReviewPopup } from './AutoReviewPopup';
import { Instagram, PinIcon } from 'lucide-react';

export const Layout = () => {
  const location = useLocation();
  const { setGlobalLoading } = useAuthContext();

  useEffect(() => {
    // Reset global loading state on every navigation to prevent "stuck" states
    setGlobalLoading(false);
    window.scrollTo(0, 0);
  }, [location.pathname, setGlobalLoading]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">ABYRA</h3>
              <p className="text-gray-400 text-sm">
                Handcrafted with love. Each piece is made to last forever.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/products" className="hover:text-white">Shop</a></li>
                <li><a href="/about" className="hover:text-white">About Us</a></li>
                <li><a href="/orders" className="hover:text-white">My Orders</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Follow Us</h3>
              <div className="flex flex-col space-y-3">
                <a 
                  href="https://www.instagram.com/_abyra.in?igsh=MWxsbnVrY3ZrdHZzdg==" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center space-x-3 text-gray-400 hover:text-white transition-all group"
                >
                  <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-purple-600 transition-colors">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">Instagram</span>
                </a>
                <a 
                  href="https://pin.it/20NDpTmf0" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center space-x-3 text-gray-400 hover:text-white transition-all group"
                >
                  <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-purple-600 transition-colors">
                    <div className="w-5 h-5 flex items-center justify-center font-bold text-lg leading-none">P</div>
                  </div>
                  <span className="text-sm font-medium">Pinterest</span>
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Contact</h3>
              <p className="text-gray-400 text-sm">
                Email: <a href="mailto:abyra.com@gmail.com" className="hover:text-white transition-colors">abyra.com@gmail.com</a><br />
                Handmade with 💜 in India
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2026 ABYRA. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <GlobalLoader />
      <Toaster position="top-right" />
      <AutoReviewPopup />
    </div>
  );
};

import { Link, useNavigate } from 'react-router';
import { ShoppingCart, User, Search, Menu, X, LogOut, LayoutDashboard, UserCircle, Package, MapPin } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from './Providers';
import { useCartContext } from './Providers';
import logo from '@/imports/1000182129.jpg';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';

export const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { cartCount } = useCartContext();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <nav className="sticky top-0 z-40 bg-violet-50/80 backdrop-blur-md border-b border-violet-100/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95 shrink-0">
            <img 
              src={logo} 
              alt="ABYRA STORE Logo" 
              className="h-10 w-10 sm:h-14 sm:w-14 rounded-full object-cover shadow-sm group-hover:shadow-md transition-all"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-10">
            <Link to="/" className="text-[10px] lg:text-sm font-bold text-gray-600 hover:text-purple-600 transition-colors uppercase tracking-widest">
              Home
            </Link>
            <Link to="/products" className="text-sm font-bold text-gray-600 hover:text-purple-600 transition-colors uppercase tracking-widest">
              Shop
            </Link>
            <Link to="/about" className="text-sm font-bold text-gray-600 hover:text-purple-600 transition-colors uppercase tracking-widest">
              About
            </Link>
          </div>

          {/* Right Side Icons */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Search Icon */}
            <button 
              onClick={() => navigate('/products')}
              className="p-2.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all"
              title="Search Products"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            {user && !user.isAdmin && <NotificationBell />}

            {/* Cart Icon - Hidden for Admin */}
            {!user?.isAdmin && (
              <button
                onClick={() => navigate('/cart')}
                className="p-2.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all relative"
                title="Your Bag"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-purple-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center animate-in zoom-in">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`p-1.5 rounded-full transition-all flex items-center justify-center ${showUserMenu ? 'ring-2 ring-purple-600 ring-offset-2' : 'hover:bg-purple-50'}`}
              >
                {user ? (
                  <Avatar name={user.name} size="md" />
                ) : (
                  <div className="p-2 text-gray-500 hover:text-purple-600 transition-all">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 mt-3 w-64 bg-violet-50/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-violet-100/50 py-3 z-50 overflow-hidden origin-top-right"
                  >
                    {user ? (
                      <>
                        <div className="px-5 py-4 border-b border-violet-100/50 bg-violet-100/30 mb-1 flex items-center space-x-3">
                          <Avatar name={user.name} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs font-medium text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="px-2 space-y-1">
                          {user.isAdmin ? (
                            <Link
                              to="/admin"
                              className="flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                              onClick={() => setShowUserMenu(false)}
                            >
                              <LayoutDashboard className="w-4 h-4" />
                              <span>Admin Dashboard</span>
                            </Link>
                          ) : (
                            <>
                              <Link
                                to="/profile"
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <UserCircle className="w-4 h-4" />
                                <span>My Profile</span>
                              </Link>
                              <Link
                                to="/orders"
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <Package className="w-4 h-4" />
                                <span>My Orders</span>
                              </Link>
                              <Link
                                to="/addresses"
                                className="flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                onClick={() => setShowUserMenu(false)}
                              >
                                <MapPin className="w-4 h-4" />
                                <span>Addresses</span>
                              </Link>
                            </>
                          )}
                        </div>

                        <div className="px-2 mt-2 pt-2 border-t border-violet-100/50">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-2 space-y-1">
                        <Link
                          to="/login"
                          className="block px-4 py-3 text-sm font-bold text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Login to Account
                        </Link>
                        <Link
                          to="/register"
                          className="block px-4 py-3 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all text-center mx-2 my-1"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Join ABYRA
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-6 space-y-4 border-t border-violet-100/50">
                <Link
                  to="/"
                  className="block text-lg font-black text-gray-900 hover:text-purple-600 transition-colors px-2"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Home
                </Link>
                <Link
                  to="/products"
                  className="block text-lg font-black text-gray-900 hover:text-purple-600 transition-colors px-2"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Shop
                </Link>
                <Link
                  to="/about"
                  className="block text-lg font-black text-gray-900 hover:text-purple-600 transition-colors px-2"
                  onClick={() => setShowMobileMenu(false)}
                >
                  About
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
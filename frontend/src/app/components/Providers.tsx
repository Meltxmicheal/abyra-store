import { ReactNode, createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabaseAuthService, User } from '../utils/supabaseAuth';
import { cartService, CartItem } from '../utils/db';
import { supabase } from '../utils/supabase';

// ============================================================
// AUTH CONTEXT
// ============================================================
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (email: string, password: string, name: string, phoneNumber: string, gender: User['gender']) => Promise<{ success: boolean; user?: User; error?: string; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (updates: { name?: string; phone?: string; gender?: string }) => Promise<User | null>;
  resendVerification: (email: string) => Promise<{ success: boolean; message: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (current: string, next: string) => Promise<{ success: boolean; error?: string }>;
  setGlobalLoading: (isLoading: boolean) => void;
  globalLoading: boolean;
  refreshUser: () => Promise<void>;
}

// ============================================================
// CART CONTEXT
// ============================================================
interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: CartItem) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  refreshCart: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const CartContext = createContext<CartContextType | undefined>(undefined);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCartContext must be used within CartProvider');
  return context;
};

// ============================================================
// PROVIDERS
// ============================================================
export const Providers = ({ children }: { children: ReactNode }) => {
  // ---------- Auth State ----------
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);

  // ---------- Cart State (local, syncs to Supabase on auth) ----------
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);

  const isInitialized = useRef(false);
  useEffect(() => {
    let mounted = true;

    const handleSession = async (session: any, eventSource: string) => {
      if (!mounted) return;
      
      if (session?.user) {
        try {
          const currentUser = await supabaseAuthService.getCurrentUser();
          if (mounted) {
            setUser(currentUser);
            if (currentUser) {
              loadCartFromDB(currentUser.id);
            }
          }
        } catch (err) {
          console.error(`[Auth] Error fetching user profile (${eventSource}):`, err);
        }
      } else {
        setUser(null);
        setCart([]);
        setCartCount(0);
      }
      
      if (mounted) setIsLoading(false);
    };

    const initAuth = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleSession(session, 'INITIAL_GET_SESSION');
      } catch (err) {
        console.error('[Auth] Initial session error:', err);
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // Single source of truth for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await handleSession(session, `EVENT_${event}`);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCart([]);
        setCartCount(0);
        if (mounted) setIsLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // Handled by initAuth, but fallback here just in case initAuth fails to call it
        if (isLoading) {
          await handleSession(session, 'EVENT_INITIAL_SESSION');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // -------------------------------------------------------
  // Cart helpers
  // -------------------------------------------------------
  const loadCartFromDB = async (userId: string) => {
    try {
      const dbCart = await cartService.get(userId);
      setCart(dbCart);
      setCartCount(dbCart.reduce((sum, item) => sum + item.quantity, 0));
    } catch (err) {
      setCart([]);
      setCartCount(0);
    }
  };

  const saveCartToDB = useCallback(async (newCart: CartItem[]) => {
    if (user?.id) {
      console.log('[Cart] Saving to DB...');
      try {
        await cartService.save(user.id, newCart);
      } catch (err) {
        console.error('[Cart] Save failed:', err);
      }
    }
  }, [user?.id]);

  // -------------------------------------------------------
  // Auth actions
  // -------------------------------------------------------
  const login = async (email: string, password: string) => {
    console.log('[Auth] Provider login initiated for:', email);
    setGlobalLoading(true);
    try {
      const result = await supabaseAuthService.signIn(email, password);
      console.log('[Auth] Provider login result success:', result.success);
      return result;
    } catch (err) {
      console.error('[Auth] Provider login unexpected error:', err);
      return { success: false, error: 'Authentication failed' };
    } finally {
      setGlobalLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phoneNumber: string,
    gender: User['gender']
  ) => {
    setGlobalLoading(true);
    try {
      return await supabaseAuthService.signUp(email, password, name, phoneNumber, gender);
    } finally {
      setGlobalLoading(false);
    }
  };

  const logout = async () => {
    setGlobalLoading(true);
    try {
      await supabaseAuthService.signOut();
      setUser(null);
      setCart([]);
      setCartCount(0);
    } finally {
      setGlobalLoading(false);
    }
  };

  const updateProfile = async (updates: { name?: string; phone?: string; gender?: string }) => {
    if (!user) return null;
    setGlobalLoading(true);
    try {
      const result = await supabaseAuthService.updateProfile(user.id, updates);
      if (result.success && result.user) {
        setUser(result.user);
        return result.user;
      }
      return null;
    } finally {
      setGlobalLoading(false);
    }
  };

  const resendVerification = (email: string) => supabaseAuthService.resendVerification(email);
  const forgotPassword = (email: string) => supabaseAuthService.forgotPassword(email);
  const changePassword = async (_current: string, next: string) => supabaseAuthService.changePassword(next);

  const refreshUser = async () => {
    try {
      const currentUser = await supabaseAuthService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('[Auth] Error refreshing user:', err);
    }
  };

  // -------------------------------------------------------
  // Cart actions
  // -------------------------------------------------------
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(
        i => i.productId === item.productId && i.variantId === item.variantId
      );
      let newCart: CartItem[];
      if (existingIndex >= 0) {
        newCart = prev.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      } else {
        newCart = [...prev, item];
      }
      setCartCount(newCart.reduce((sum, i) => sum + i.quantity, 0));
      saveCartToDB(newCart);
      return newCart;
    });
  };

  const updateQuantity = (productId: string, variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCart(prev => {
      const newCart = prev.map(i =>
        i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
      );
      setCartCount(newCart.reduce((sum, i) => sum + i.quantity, 0));
      saveCartToDB(newCart);
      return newCart;
    });
  };

  const removeFromCart = (productId: string, variantId: string) => {
    setCart(prev => {
      const newCart = prev.filter(i => !(i.productId === productId && i.variantId === variantId));
      setCartCount(newCart.reduce((sum, i) => sum + i.quantity, 0));
      saveCartToDB(newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    setCartCount(0);
    if (user?.id) cartService.clear(user.id);
  };

  const getTotal = () => cartService.getTotal(cart);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
      resendVerification,
      forgotPassword,
      changePassword,
      setGlobalLoading,
      globalLoading,
      refreshUser,
    }}>
      <CartContext.Provider value={{
        cart,
        cartCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getTotal,
        refreshCart: () => user && loadCartFromDB(user.id),
      }}>
        {children}
      </CartContext.Provider>
    </AuthContext.Provider>
  );
};

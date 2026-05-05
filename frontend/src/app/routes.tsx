import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProductList } from './pages/ProductList';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Receipt } from './pages/Receipt';
import { OrderTracking } from './pages/OrderTracking';
import { Orders } from './pages/Orders';
import { Profile } from './pages/Profile';
import { Addresses } from './pages/Addresses';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Admin } from './pages/Admin';
import { About } from './pages/About';
import { VerifyOTP } from './pages/VerifyOTP';
import { ResetPassword } from './pages/ResetPassword';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'products', Component: ProductList },
      { path: 'product/:id', Component: ProductDetail },
      { path: 'cart', Component: Cart },
      { path: 'checkout', Component: Checkout },
      { path: 'receipt/:orderId', Component: Receipt },
      { path: 'order-tracking/:orderId', Component: OrderTracking },
      { path: 'orders', Component: Orders },
      { path: 'profile', Component: Profile },
      { path: 'addresses', Component: Addresses },
      { path: 'login', Component: Login },
      { path: 'register', Component: Register },
      { path: 'verify-email', lazy: () => import('./pages/VerifyEmail').then(m => ({ Component: m.VerifyEmail })) },
      { path: 'forgot-password', lazy: () => import('./pages/ForgotPassword').then(m => ({ Component: m.ForgotPassword })) },
      { path: 'admin', Component: Admin },
      { path: 'about', Component: About },
      { path: 'verify-otp', Component: VerifyOTP },
      { path: 'reset-password', Component: ResetPassword },

    ],
  },
]);

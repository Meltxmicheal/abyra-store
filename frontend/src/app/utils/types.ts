export interface Variant {
  id: string;
  name: string;
  price?: number;
  type?: string;
  image?: string;
  deliveryDays?: number; // e.g. 3 → "Delivery in 3 days"
  attributes?: Record<string, string>;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  productName?: string;
  rating: number;
  comment: string;
  date: string;
  adminReply?: string;
}

export interface Product {

  id: string;
  name: string;
  images: string[];
  description: string;
  category: string;
  variants: Variant[];
  basePrice: number;
  discountPrice?: number;
  discountEnabled?: boolean;
  productionTime: number;
  paymentMethods: string[];
  rating: number;
  reviews: Review[];
}

export interface Category {
  id: string;
  name: string;
  image: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  product: Product;
  variant: Variant;
}

export type OrderStatus = 'placed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  items: CartItem[];
  totalAmount: number;
  address: Address;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cod';
  status: OrderStatus;
  cancelReason?: string;
  adminFeedback?: string;
  receiptUrl?: string; // NEW
  reviewPending?: boolean; // NEW
  orderDate: string;
  estimatedDelivery: string;
  deliveredAt?: string;
}

export interface SupportRequest {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  issueType: string;
  message: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  imageProof?: string;
}

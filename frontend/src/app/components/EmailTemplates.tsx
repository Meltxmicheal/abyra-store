import logo from '../../imports/1000182206.png';

interface EmailProps {
  userName?: string;
  orderId?: string;
  orderDate?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  totalAmount?: number;
  trackingUrl?: string;
}

export const WelcomeEmail = ({ userName = 'Valued Customer' }: EmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <img src={logo} alt="ABYRA" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
    </div>
    <h1 style={{ color: '#4A2C5A', textAlign: 'center' }}>Welcome to ABYRA!</h1>
    <p>Dear {userName},</p>
    <p>Thank you for joining ABYRA, where every creation is handcrafted with love.</p>
    <p>We're excited to have you as part of our community. Browse our collection of unique, handmade products that are made to last forever.</p>
    <div style={{ textAlign: 'center', margin: '30px 0' }}>
      <a href="/" style={{ backgroundColor: '#4A2C5A', color: 'white', padding: '12px 30px', textDecoration: 'none', borderRadius: '8px', display: 'inline-block' }}>
        Start Shopping
      </a>
    </div>
    <p style={{ color: '#666', fontSize: '14px', marginTop: '40px' }}>
      With love,<br />
      The ABYRA Team
    </p>
  </div>
);

export const OrderConfirmationEmail = ({ userName = 'Customer', orderId, orderDate, items = [], totalAmount = 0 }: EmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <img src={logo} alt="ABYRA" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
    </div>
    <h1 style={{ color: '#4A2C5A', textAlign: 'center' }}>Order Confirmed!</h1>
    <p>Dear {userName},</p>
    <p>Thank you for your order! We've received it and our artisans are getting ready to craft your items with love.</p>
    
    <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
      <p style={{ margin: '0 0 10px 0' }}><strong>Order ID:</strong> {orderId}</p>
      <p style={{ margin: '0' }}><strong>Order Date:</strong> {orderDate}</p>
    </div>

    <h3 style={{ color: '#333' }}>Order Items:</h3>
    <div style={{ backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>{item.name} x {item.quantity}</span>
          <span>₹{item.price * item.quantity}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <span>Total</span>
          <span>₹{totalAmount}</span>
        </div>
      </div>
    </div>

    <div style={{ textAlign: 'center', margin: '30px 0' }}>
      <a href={`/order-tracking/${orderId}`} style={{ backgroundColor: '#4A2C5A', color: 'white', padding: '12px 30px', textDecoration: 'none', borderRadius: '8px', display: 'inline-block' }}>
        Track Your Order
      </a>
    </div>

    <p style={{ color: '#666', fontSize: '14px', marginTop: '40px' }}>
      With love,<br />
      The ABYRA Team
    </p>
  </div>
);

export const OrderTrackingEmail = ({ userName = 'Customer', orderId, trackingUrl }: EmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <img src={logo} alt="ABYRA" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
    </div>
    <h1 style={{ color: '#4A2C5A', textAlign: 'center' }}>Your Order is Being Crafted!</h1>
    <p>Dear {userName},</p>
    <p>Great news! Your order #{orderId} is now in production. Our skilled artisans are handcrafting your items with care.</p>
    <p>We'll keep you updated as your order progresses through each stage.</p>
    
    <div style={{ textAlign: 'center', margin: '30px 0' }}>
      <a href={trackingUrl} style={{ backgroundColor: '#4A2C5A', color: 'white', padding: '12px 30px', textDecoration: 'none', borderRadius: '8px', display: 'inline-block' }}>
        Track Your Order
      </a>
    </div>

    <p style={{ color: '#666', fontSize: '14px', marginTop: '40px' }}>
      With love,<br />
      The ABYRA Team
    </p>
  </div>
);

export const ThankYouEmail = ({ userName = 'Customer' }: EmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <img src={logo} alt="ABYRA" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
    </div>
    <h1 style={{ color: '#4A2C5A', textAlign: 'center' }}>Thank You!</h1>
    <p>Dear {userName},</p>
    <p>Your order has been delivered! We hope you love your handcrafted items as much as we loved making them for you.</p>
    <p>Each piece was crafted with care and attention to detail, and we're confident it will bring joy for years to come.</p>
    <p>If you have any questions or feedback, we'd love to hear from you!</p>
    
    <div style={{ textAlign: 'center', margin: '30px 0' }}>
      <a href="/products" style={{ backgroundColor: '#4A2C5A', color: 'white', padding: '12px 30px', textDecoration: 'none', borderRadius: '8px', display: 'inline-block' }}>
        Shop Again
      </a>
    </div>

    <p style={{ color: '#666', fontSize: '14px', marginTop: '40px' }}>
      With love,<br />
      The ABYRA Team
    </p>
  </div>
);

export const CartReminderEmail = ({ userName = 'Customer' }: EmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <img src={logo} alt="ABYRA" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
    </div>
    <h1 style={{ color: '#4A2C5A', textAlign: 'center' }}>You Left Something Behind!</h1>
    <p>Dear {userName},</p>
    <p>We noticed you have items waiting in your cart. These beautiful handcrafted pieces won't last long!</p>
    <p>Complete your purchase now and let our artisans create something special just for you.</p>
    
    <div style={{ textAlign: 'center', margin: '30px 0' }}>
      <a href="/cart" style={{ backgroundColor: '#4A2C5A', color: 'white', padding: '12px 30px', textDecoration: 'none', borderRadius: '8px', display: 'inline-block' }}>
        Complete Your Purchase
      </a>
    </div>

    <p style={{ color: '#666', fontSize: '14px', marginTop: '40px' }}>
      With love,<br />
      The ABYRA Team
    </p>
  </div>
);

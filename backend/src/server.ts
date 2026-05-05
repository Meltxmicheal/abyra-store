import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import { v2 as cloudinary } from 'cloudinary';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { createClient } from '@supabase/supabase-js';
import { generateBrandedEmail, generateOTPEmail, generateOrderConfirmationEmail, generatePasswordResetOTPEmail, generateVerificationEmail, generatePasswordUpdatedEmail } from './utils/emailTemplates';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { encrypt, decrypt } from './utils/twoFactor';
import { generateReceiptPDF, ReceiptData } from './utils/receiptGenerator';
import fs from 'fs';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
console.log(`[SYSTEM] Starting backend server... (Environment variables reloaded)`);

app.use(helmet()); // Secure HTTP headers
app.use(hpp()); // Prevent HTTP Parameter Pollution

// CORS — reads ALLOWED_ORIGINS env var (comma-separated) in production.
// Falls back to localhost origins for local development.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  console.error('[SECURITY] ALLOWED_ORIGINS must be set in production!');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from: ${origin}`);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiter to all API routes
app.use('/api/', limiter);

// Security Monitoring: Log unauthorized access attempts
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`[SECURITY WARNING] Unauthorized access attempt: ${req.method} ${req.url} | IP: ${req.ip} | Status: ${res.statusCode}`);
    }
  });
  next();
});

// Initialize Services
const resend = new Resend(process.env.RESEND_API_KEY);

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ==========================================
// 1. PAYMENT ROUTES
// ==========================================

// Create Razorpay Order
app.post('/api/payments/create-order', async (req: Request, res: Response) => {
  const { amount, currency = 'INR', receipt } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency,
      receipt,
    });
    res.json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify Payment Signature
app.post('/api/payments/verify', async (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id, email, amount } = req.body;
  
  try {
    console.log(`[PAYMENT] Verifying signature for Order ID: ${order_id}`);
    
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '');
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      console.warn(`[PAYMENT] Signature mismatch for Order ID: ${order_id}`);
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    console.log(`[PAYMENT] Success. Updating DB for Order ID: ${order_id}`);

    // 1. Update Payment Status in Supabase
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        razorpay_payment_id: razorpay_payment_id,
        order_status: 'placed'
      })
      .eq('id', order_id);

    if (dbError) {
      console.error(`[PAYMENT] DB Update Error:`, dbError);
      // Even if DB fails, we verified the payment, so we should try to recover
    }

    // 2. Trigger Receipt Generation (Async)
    // We don't await this to keep the response fast
    generateAndSendReceipt(order_id, email, amount).catch(err => {
      console.error(`[PAYMENT] Post-verification failure for ${order_id}:`, err);
    });

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error: any) {
    console.error(`[PAYMENT] Verification Exception:`, error.message);
    res.status(500).json({ success: false, error: 'Internal server error during verification' });
  }
});

// Helper for Post-Payment Flow
async function generateAndSendReceipt(orderId: string, email: string, amount: number) {
  try {
    console.log(`[FLOW] Starting post-payment flow for ${orderId}`);
    
    // 1. Generate Receipt (This also updates order with receipt_url)
    const response = await fetch(`${process.env.BACKEND_URL}/api/orders/${orderId}/receipt`, {
      method: 'POST'
    });
    
    const data = await response.json();
    const receiptUrl = data.receiptUrl;

    // 2. Send Confirmation Email
    console.log(`[FLOW] Sending confirmation email to ${email}`);
    const html = generateOrderConfirmationEmail(orderId, amount, receiptUrl);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <orders@yourdomain.com>',
      to: email,
      subject: `✅ Order Confirmed — ${orderId} | ABYRA Store`,
      html,
    });
    
    console.log(`[FLOW] Post-payment flow complete for ${orderId}`);
  } catch (error) {
    console.error(`[FLOW] Error in post-payment flow for ${orderId}:`, error);
  }
}

// ==========================================
// 2. EMAIL ROUTES
// ==========================================

app.post('/api/email/order-confirmation', async (req: Request, res: Response) => {
  const { to, orderId, totalAmount } = req.body;
  try {
    const html = generateOrderConfirmationEmail(orderId, totalAmount);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <orders@yourdomain.com>',
      to,
      subject: `✅ Order Confirmed — ${orderId} | ABYRA Store`,
      html,
    });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    console.error('Email Error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/email/welcome', async (req: Request, res: Response) => {
  const { to, name } = req.body;
  try {
    const html = generateBrandedEmail({
      title: `Welcome, ${name}! 🎉`,
      subtitle: 'Joined the Family',
      content: `We're so happy to have you here. ABYRA is a place where every piece is handcrafted with care and premium materials. We can't wait for you to explore our collection of crochet bouquets, bags, and more.`,
      buttonText: 'Start Shopping',
      actionLink: `${process.env.FRONTEND_URL}/products`
    });

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <onboarding@yourdomain.com>',
      to,
      subject: 'Welcome to ABYRA! 💜',
      html,
    });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

// NEW: OTP Security Email
app.post('/api/email/otp', async (req: Request, res: Response) => {
  const { to, otp } = req.body;
  try {
    const html = generateOTPEmail(otp);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <security@yourdomain.com>',
      to,
      subject: '🔐 Secure OTP for ABYRA',
      html,
    });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
});

// OTP-Based Password Reset Request
app.post('/api/email/reset-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    console.log(`[AUTH] --- Reset Request Start for: ${email} ---`);
    
    // 1. Check if user exists
    console.log('[AUTH] Verifying user existence in Auth...');
    const { error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (authError) {
      console.log(`[AUTH] User not found: ${authError.message}`);
      return res.status(404).json({ error: 'No account found with this email address.' });
    }
    console.log('[AUTH] User verified.');

    // 2. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    console.log(`[AUTH] Generated OTP: ${otp} (Expires: ${expiresAt})`);

    // 3. Database Sync
    console.log('[AUTH] Checking for existing reset records...');
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('password_resets')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('[AUTH] Database Fetch Error:', fetchError);
      throw fetchError;
    }

    let otpError;
    if (existing) {
      console.log('[AUTH] Updating existing reset record...');
      const { error } = await supabaseAdmin
        .from('password_resets')
        .update({ otp, expires_at: expiresAt })
        .eq('email', email);
      otpError = error;
    } else {
      console.log('[AUTH] Creating new reset record...');
      const { error } = await supabaseAdmin
        .from('password_resets')
        .insert({ email, otp, expires_at: expiresAt });
      otpError = error;
    }

    if (otpError) {
      console.error('[AUTH] OTP Storage Error:', otpError);
      return res.status(500).json({ error: 'Database error while saving reset code.' });
    }
    console.log('[AUTH] Database updated successfully.');

    // 4. Send Email
    console.log('[AUTH] Attempting to send email via Resend...');
    const html = generatePasswordResetOTPEmail(otp);
    const { data, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <security@yourdomain.com>',
      to: email,
      subject: '🔐 Password Reset OTP — ABYRA',
      html,
    });

    if (sendError) {
      console.error('[AUTH] Resend Email Error:', sendError);
      return res.status(400).json({ error: 'Email service failed. Please check your Resend configuration.' });
    }

    console.log('[AUTH] Reset email sent successfully:', data?.id);
    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (error: any) {
    console.error('[AUTH] Reset Request Exception:', error.message || error);
    res.status(500).json({ error: 'Internal server error during password reset request' });
  }
});

// NEW: Branded Signup Verification via Resend
app.post('/api/email/send-verification', async (req: Request, res: Response) => {
  const { email, name } = req.body;
  try {
    console.log(`[AUTH] Generating verification link for: ${email}`);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL}/verify-email`
      }
    });

    if (linkError) {
      console.error('[AUTH] generateLink Error:', linkError);
      return res.status(400).json({ error: linkError.message });
    }

    const html = generateVerificationEmail(name || 'Valued Customer', linkData.properties.action_link);
    
    const { data, error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <onboarding@yourdomain.com>',
      to: email,
      subject: 'Welcome to ABYRA! Please verify your email 💜',
      html,
    });

    if (sendError) {
      console.error('[AUTH] Resend Verification Error:', sendError);
      return res.status(400).json({ error: 'Failed to send verification email' });
    }

    res.json({ success: true, message: 'Verification email sent via Resend' });
  } catch (error) {
    console.error('[AUTH] Verification Exception:', error);
    res.status(500).json({ error: 'Failed to trigger verification email' });
  }
});

// Verify Password Reset OTP
app.post('/api/auth/verify-reset-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    res.json({ success: true, message: 'Code verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Final Password Reset
app.post('/api/auth/reset-password-final', async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  try {
    // 1. Double check OTP validity
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (otpError || !otpData) {
      return res.status(400).json({ error: 'Session expired. Please request a new code.' });
    }

    // 2. Get User ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 2.5 Check if new password is same as old password (Security best practice)
    try {
      const { data: authData } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password: newPassword,
      });

      if (authData.user) {
        return res.status(400).json({ error: 'New password must be different from previous password' });
      }
    } catch (err) {
      // If sign-in fails, it means the password is indeed new. This is what we want.
    }

    // 3. Update Password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userData.id, {
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    // 4. Cleanup OTP
    await supabaseAdmin.from('password_resets').delete().eq('email', email);

    // 5. Send Confirmation Email
    try {
      const html = generatePasswordUpdatedEmail();
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <security@yourdomain.com>',
        to: email,
        subject: '✅ Password Updated Successfully — ABYRA',
        html,
      });
    } catch (e) {
      console.warn('[AUTH] Failed to send password update confirmation:', e);
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('[AUTH] Reset Final Error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// NEW: Cart Abandonment Reminder
app.post('/api/email/cart-reminder', async (req: Request, res: Response) => {
  const { to, name } = req.body;
  try {
    const html = generateBrandedEmail({
      title: 'Wait, You Forgot Something! 🛒',
      subtitle: 'Your Cart is Waiting',
      content: `Hi ${name}, we noticed you left some beautiful handcrafted items in your cart. They are selling fast, so don't miss out on making them yours!`,
      buttonText: 'Complete Your Purchase',
      actionLink: `${process.env.FRONTEND_URL}/cart`
    });

    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <orders@yourdomain.com>',
      to,
      subject: 'Did you forget something? 💜',
      html,
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// NEW: New Product Launch
app.post('/api/email/new-product', async (req: Request, res: Response) => {
  const { users, productName, productDescription, productId } = req.body;
  try {
    const html = generateBrandedEmail({
      title: 'New Arrival! ✨',
      subtitle: productName,
      content: `Something special has just landed at ABYRA. ${productDescription}. Be the first to own this handcrafted masterpiece.`,
      buttonText: 'View New Product',
      actionLink: `${process.env.FRONTEND_URL}/product/${productId}`
    });

    // In production, use Batch sending for all users
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <updates@yourdomain.com>',
      to: users,
      subject: `✨ New Arrival: ${productName}`,
      html,
    });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send announcement' });
  }
});

// NEW: Receipt Download Email
app.post('/api/email/receipt', async (req: Request, res: Response) => {
  const { to, orderId } = req.body;
  try {
    const html = generateBrandedEmail({
      title: 'Your Receipt is Ready 📄',
      subtitle: `Invoice for #${orderId}`,
      content: `Thank you for your purchase. You can now download the formal receipt for your order using the secure link below.`,
      buttonText: 'Download Receipt (PDF)',
      actionLink: `${process.env.FRONTEND_URL}/receipt/${orderId}?download=true`
    });

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <billing@yourdomain.com>',
      to,
      subject: `Invoice for Order #${orderId}`,
      html,
    });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send receipt email' });
  }
});

// ==========================================
// 3. NOTIFICATION ROUTES
// ==========================================

app.post('/api/notifications', async (req: Request, res: Response) => {
  const { userId, type, message } = req.body;
  try {
    // This would typically use the Supabase Admin client (already initialized with SERVICE_ROLE_KEY)
    // For now, we simulate the DB insert via a direct API call or assume Supabase SDK is used
    res.json({ success: true, message: 'Notification created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// ==========================================
// 4. SECURITY & RATE LIMITING (SIMULATED)
// ==========================================

const emailRateLimit = new Map<string, number>();

function isRateLimited(email: string) {
  const now = Date.now();
  const lastSent = emailRateLimit.get(email) || 0;
  if (now - lastSent < 60000) return true; // 1 minute cooldown
  emailRateLimit.set(email, now);
  return false;
}

// ==========================================
// 5. RECEIPT / INVOICE GENERATION
// ==========================================

// ==========================================
// 5. RECEIPT / INVOICE GENERATION
// ==========================================

async function ensureReceiptsBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find(b => b.name === 'receipts')) {
    await supabaseAdmin.storage.createBucket('receipts', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
    });
  }
}

app.post('/api/orders/:orderId/receipt', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  try {
    console.log(`[RECEIPT] Generating receipt for order: ${orderId}`);
    
    // 1. Fetch Order Details from Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`*, order_items(*), users(name, email)`)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // 2. Prepare Data for PDF
    const address = order.address as any;
    const receiptData: ReceiptData = {
      orderId: order.id,
      customerName: address.name || order.users?.name || 'Valued Customer',
      email: order.users?.email || '',
      phone: address.phone || '',
      address: `${address.addressLine1}, ${address.addressLine2 ? address.addressLine2 + ', ' : ''}${address.city}, ${address.state} - ${address.pincode}`,
      date: new Date(order.created_at).toLocaleDateString('en-IN'),
      items: order.order_items.map((item: any) => ({
        name: item.product_snapshot?.name || 'Handcrafted Item',
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: order.total_amount,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status
    };

    // 3. Generate PDF Local File
    const filePath = await generateReceiptPDF(receiptData);
    const fileBuffer = fs.readFileSync(filePath);

    // 4. Upload to Supabase Storage
    await ensureReceiptsBucket();
    const storagePath = `invoices/${orderId}.pdf`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('receipts')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 5. Get Public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(storagePath);

    // 6. Update Order with Receipt URL
    await supabaseAdmin
      .from('orders')
      .update({ receipt_url: publicUrl })
      .eq('id', orderId);

    // 7. Cleanup Local File
    fs.unlinkSync(filePath);

    res.json({ success: true, receiptUrl: publicUrl });
  } catch (error: any) {
    console.error('[RECEIPT] Error:', error.message);
    res.status(500).json({ error: 'Failed to generate receipt' });
  }
});

app.get('/api/receipt/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('receipt_url')
      .eq('id', orderId)
      .single();

    if (error || !data?.receipt_url) {
      return res.redirect(`${process.env.FRONTEND_URL}/orders`);
    }

    res.redirect(data.receipt_url);
  } catch (error) {
    res.status(500).send('Error retrieving receipt');
  }
});

// ==========================================
// 6. CLOUDINARY SIGNED UPLOAD
// ==========================================

app.post('/api/upload/signature', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    // 1. Verify user with Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // 2. Check if admin
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (dbError || userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can upload images' });
    }

    // 3. Generate Signature
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'abyra_products';
    
    // Cloudinary expects parameters in alphabetical order for signing
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    res.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder
    });
  } catch (error: any) {
    console.error('Signature Error:', error);
    res.status(401).json({ error: error.message });
  }
});

// ==========================================
// 7. ADMIN SETUP (One-time endpoint)
// ==========================================

// POST /api/admin/setup
// Creates the admin user in auth.users via service role, then sets role in public.users.
// Only runs if admin does not already exist in auth.
app.post('/api/admin/setup', async (req: Request, res: Response) => {
  const { email, password, secret } = req.body;

  // Simple secret guard — only YOU should know this
  if (secret !== 'abyra_admin_setup_2024') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    console.log(`[ADMIN SETUP] Creating admin: ${email}`);

    // Step 1: Create in auth.users via service role (bypasses email verification)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Pre-confirm so admin can login immediately
    });

    if (authError) {
      // If user already exists in auth, that's fine — just sync the role
      if (!authError.message.includes('already been registered')) {
        console.error('[ADMIN SETUP] Auth error:', authError);
        return res.status(400).json({ error: authError.message });
      }
      console.warn('[ADMIN SETUP] User already in auth.users, syncing role...');
    }

    const adminId = authData?.user?.id;

    // Step 2: Upsert into public.users with admin role
    if (adminId) {
      const { error: dbError } = await supabaseAdmin.from('users').upsert({
        id: adminId,
        email,
        name: 'Admin ABI M',
        role: 'admin',
      }, { onConflict: 'id' });

      if (dbError) {
        console.error('[ADMIN SETUP] DB upsert error:', dbError);
        return res.status(500).json({ error: 'Auth user created but DB sync failed: ' + dbError.message });
      }
    } else {
      // Fallback: update by email if auth user already existed
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: 'admin', name: 'Admin ABI M' })
        .eq('email', email);

      if (updateError) {
        console.error('[ADMIN SETUP] Role update error:', updateError);
        return res.status(500).json({ error: 'Failed to set admin role: ' + updateError.message });
      }
    }

    console.log('[ADMIN SETUP] ✅ Admin setup complete');
    res.json({ success: true, message: 'Admin account created and synced. You can now login.' });
  } catch (error: any) {
    console.error('[ADMIN SETUP] Exception:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ==========================================
// 8. ADMIN OTP PASSWORD CHANGE
// ==========================================

// Step 3: Send OTP
app.post('/api/auth/send-otp', async (req: Request, res: Response) => {
  const { email } = req.body;
  const authHeader = req.headers.authorization;
  
  console.log(`[AUTH] send-otp request received for: ${email}`);
  
  if (!authHeader) {
    console.warn('[AUTH] Missing authorization header');
    return res.status(401).json({ error: 'No authorization header' });
  }
  if (!email) {
    console.warn('[AUTH] Missing email in request body');
    return res.status(400).json({ error: 'Email is required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Verify admin status
    console.log('[AUTH] Verifying token...');
    const authResponse = await supabaseAdmin.auth.getUser(token);
    const authUser = authResponse.data?.user;
    const authError = authResponse.error;

    if (authError || !authUser) {
      console.error('[AUTH] Token verification failed:', authError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log(`[AUTH] User verified: ${authUser.id}. Checking role...`);
    const { data: userData, error: userError } = await supabaseAdmin.from('users').select('role').eq('id', authUser.id).single();
    
    if (userError) {
      console.error('[AUTH] Role lookup error:', userError);
      return res.status(500).json({ error: 'Internal server error during role check' });
    }

    if (userData?.role !== 'admin') {
      console.warn(`[AUTH] Access denied. User ${authUser.id} is not an admin.`);
      return res.status(403).json({ error: 'Only admins can access this' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    console.log(`[AUTH] Storing OTP for ${cleanEmail}...`);
    // Store hashed OTP
    const { error: dbError } = await supabaseAdmin.from('otp_logs').insert({
      email: cleanEmail,
      otp: hashedOtp,
      type: 'admin_password_reset',
      expires_at: expiresAt
    });

    if (dbError) {
      console.error('[AUTH] OTP Insert Error:', dbError);
      return res.status(500).json({ error: 'Failed to store verification code', details: dbError });
    }

    console.log('[AUTH] Sending email via Resend...');
    // Send via email (Resend)
    try {
      const html = generatePasswordResetOTPEmail(otp);
      const { error: sendError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <security@yourdomain.com>',
        to: cleanEmail,
        subject: '🔐 Admin Password Reset OTP — ABYRA',
        html,
      });

      if (sendError) {
        console.error('[AUTH] Resend Send Error:', sendError);
        return res.status(500).json({ error: 'Failed to send email via Resend', details: sendError });
      }
    } catch (sendEx) {
      console.error('[AUTH] Resend Exception:', sendEx);
      return res.status(500).json({ error: 'Resend service failure' });
    }

    console.log('[AUTH] OTP process complete.');
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error: any) {
    console.error('[AUTH] Global send-otp error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Step 5: Verify OTP
app.post('/api/auth/verify-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // Fetch latest unused OTP for this email
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();
    console.log(`[AUTH] Verifying OTP for ${cleanEmail} at ${now}`);

    const { data, error } = await supabaseAdmin
      .from('otp_logs')
      .select('*')
      .eq('email', cleanEmail)
      .eq('type', 'admin_password_reset')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[AUTH] OTP Fetch Error:', error);
      return res.status(500).json({ error: 'Database error during verification' });
    }

    if (!data) {
      console.warn(`[AUTH] No unused OTP record found for ${cleanEmail}`);
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Check expiration in JS to avoid DB timezone/format issues
    if (new Date(data.expires_at) < new Date()) {
      console.warn(`[AUTH] OTP expired for ${cleanEmail}. Expired at: ${data.expires_at}, Now: ${now}`);
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Increment attempts (optional check)
    if (data.attempts !== undefined) {
      const newAttempts = (data.attempts || 0) + 1;
      if (newAttempts >= 3) {
        await supabaseAdmin.from('otp_logs').update({ used: true }).eq('id', data.id);
        return res.status(400).json({ error: 'Max attempts reached. Please request a new OTP.' });
      }
      await supabaseAdmin.from('otp_logs').update({ attempts: newAttempts }).eq('id', data.id);
    }

    if (data.otp !== hashedOtp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Step 7: Update Password
app.post('/api/auth/update-password', async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const cleanEmail = email.trim().toLowerCase();
    // 1. Verify OTP one last time (and mark as used)
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_logs')
      .select('*')
      .eq('email', cleanEmail)
      .eq('otp', hashedOtp)
      .eq('type', 'admin_password_reset')
      .eq('used', false)
      .maybeSingle();

    if (otpError || !otpData) {
      console.warn(`[AUTH] Final OTP verification failed for ${cleanEmail}`);
      return res.status(400).json({ error: 'Session expired or invalid' });
    }

    if (new Date(otpData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // 2. Update Password in Supabase Auth
    const authResponse = await supabaseAdmin.auth.getUser(token);
    const authUser = authResponse.data?.user;
    const authError = authResponse.error;

    if (authError || !authUser) {
      return res.status(401).json({ error: 'Unauthorized session' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: newPassword
    });

    if (updateError) throw updateError;

    // 3. Mark OTP as used
    await supabaseAdmin.from('otp_logs').update({ used: true }).eq('id', otpData.id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Forgot Password - Send OTP
app.post('/api/email/reset-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if user exists in our DB
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userError || !user) {
      // For security, don't reveal if user exists. Just say OTP sent.
      return res.json({ success: true, message: 'If this email exists, a code was sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP
    await supabaseAdmin.from('otp_logs').insert({
      email: cleanEmail,
      otp: hashedOtp,
      type: 'reset',
      expires_at: expiresAt
    });

    // Send Email
    const html = generatePasswordResetOTPEmail(otp);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <security@yourdomain.com>',
      to: cleanEmail,
      subject: '🔐 Password Reset Code — ABYRA',
      html,
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error: any) {
    console.error('[RESET] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Step 5: Verify RESET OTP (No Auth Header)
app.post('/api/auth/verify-reset-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const now = new Date().toISOString();

    console.log(`[RESET] Verifying OTP for ${cleanEmail}...`);
    const { data, error } = await supabaseAdmin
      .from('otp_logs')
      .select('*')
      .eq('email', cleanEmail)
      .eq('type', 'reset')
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn(`[RESET] OTP not found for ${cleanEmail}`);
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (new Date(data.expires_at) < new Date()) {
      console.warn(`[RESET] OTP expired for ${cleanEmail}`);
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    if (data.otp !== hashedOtp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Step 7: Final Password Reset (No Auth Header, verified by OTP)
app.post('/api/auth/reset-password-final', async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 1. Verify OTP one last time
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_logs')
      .select('*')
      .eq('email', cleanEmail)
      .eq('otp', hashedOtp)
      .eq('type', 'reset')
      .eq('used', false)
      .maybeSingle();

    if (otpError || !otpData) {
      return res.status(400).json({ error: 'Session expired or invalid' });
    }

    if (new Date(otpData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // 2. Find User in Auth
    const { data: userData, error: userLookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (userLookupError || !userData) {
      throw new Error('User not found');
    }

    // 3. Update Password via Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userData.id, {
      password: newPassword
    });

    if (updateError) throw updateError;

    // 4. Mark OTP as used
    await supabaseAdmin.from('otp_logs').update({ used: true }).eq('id', otpData.id);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('[RESET FINAL] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. TWO-FACTOR AUTHENTICATION (2FA)
// ==========================================

// Setup 2FA (Generate Secret & QR Code)
app.get('/api/auth/2fa/setup', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `ABYRA Store (${user.email})`,
      issuer: 'ABYRA Store'
    });

    // Generate QR Code data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error: any) {
    console.error('[2FA SETUP] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify & Enable 2FA
app.post('/api/auth/2fa/verify', async (req: Request, res: Response) => {
  const { otp, secret } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // Verify OTP
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: otp,
      window: 1 // allow 30s window
    });

    if (verified) {
      // Encrypt and save secret
      const encryptedSecret = encrypt(secret);
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .update({
          two_factor_enabled: true,
          two_factor_secret: encryptedSecret
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      res.json({ success: true, message: 'Two-step verification enabled successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
    }
  } catch (error: any) {
    console.error('[2FA VERIFY] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check 2FA Status (Public - used for login flow)
app.post('/api/auth/2fa/status', async (req: Request, res: Response) => {
  const { email } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('two_factor_enabled')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;

    res.json({
      success: true,
      enabled: data?.two_factor_enabled || false
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify 2FA during Login
app.post('/api/auth/2fa/login-verify', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, two_factor_secret, two_factor_enabled')
      .eq('email', email)
      .single();

    if (error || !data || !data.two_factor_enabled) {
      return res.status(400).json({ error: '2FA not enabled for this account' });
    }

    const decryptedSecret = decrypt(data.two_factor_secret);
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: otp,
      window: 1
    });

    if (verified) {
      res.json({ success: true, message: 'Verification successful' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid verification code' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Disable 2FA
app.post('/api/auth/2fa/disable', async (req: Request, res: Response) => {
  const { password } = req.body;
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1];
  try {
    // 1. Verify user session
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    // 2. Verify password (Supabase doesn't have a direct "verify password" admin method, 
    // but we can try to sign in with the current user's email and provided password)
    const { error: loginError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: password
    });

    if (loginError) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // 3. Disable 2FA
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null
      })
      .eq('id', user.id);

    if (dbError) throw dbError;

    res.json({ success: true, message: 'Two-step verification disabled' });
  } catch (error: any) {
    console.error('[2FA DISABLE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});
// ==========================================
// 10. ADMIN MULTI-STEP LOGIN
// ==========================================

app.post('/api/auth/admin/login-start', async (req: Request, res: Response) => {
  const { email, password, deviceToken } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (authError || !authData.user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userId = authData.user.id;

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, admin_device_token, admin_device_expiry')
      .eq('id', userId)
      .single();

    if (userError || userData.role !== 'admin') {
      return res.json({ success: true, isAdmin: false });
    }

    let skip2FA = false;
    if (deviceToken && userData.admin_device_token === deviceToken) {
      if (userData.admin_device_expiry && new Date(userData.admin_device_expiry) > new Date()) {
        skip2FA = true;
      }
    }

    if (skip2FA) {
      return res.json({ success: true, isAdmin: true, skip2FA: true });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from('users')
      .update({
        admin_login_otp: otp,
        admin_otp_expiry: expiresAt
      })
      .eq('id', userId);

    const html = generateOTPEmail(otp);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ABYRA Store <security@yourdomain.com>',
      to: cleanEmail,
      subject: '🔐 Admin Login OTP — ABYRA',
      html,
    });

    res.json({ success: true, isAdmin: true, skip2FA: false });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/admin/verify-email-otp', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, admin_login_otp, admin_otp_expiry')
      .eq('email', cleanEmail)
      .single();

    if (error || !user) return res.status(400).json({ error: 'User not found' });
    if (user.admin_login_otp !== otp) return res.status(400).json({ error: 'Invalid verification code' });
    if (new Date(user.admin_otp_expiry) < new Date()) return res.status(400).json({ error: 'Verification code has expired' });

    await supabaseAdmin
      .from('users')
      .update({
        admin_login_otp: null,
        admin_otp_expiry: null
      })
      .eq('id', user.id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/admin/verify-authenticator', async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  try {
    const cleanEmail = email.trim().toLowerCase();
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, two_factor_secret, two_factor_enabled')
      .eq('email', cleanEmail)
      .single();

    if (error || !user) return res.status(400).json({ error: 'User not found' });

    let verified = false;
    if (user.two_factor_enabled && user.two_factor_secret) {
      const decryptedSecret = decrypt(user.two_factor_secret);
      verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: otp,
        window: 1
      });
    } else {
      // For testing or if 2FA not set up properly, but requirement says strict 2FA
      return res.status(400).json({ error: '2FA is not enabled on this account' });
    }

    if (!verified) return res.status(400).json({ error: 'Invalid authenticator code' });

    const newDeviceToken = crypto.randomBytes(32).toString('hex');
    const deviceExpiry = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    await supabaseAdmin
      .from('users')
      .update({
        admin_device_token: newDeviceToken,
        admin_device_expiry: deviceExpiry
      })
      .eq('id', user.id);

    res.json({ success: true, deviceToken: newDeviceToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload/signature', async (req: Request, res: Response) => {
  console.log('[UPLOAD] Signature request received');
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'abyra_products';
    
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET!
    );

    res.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder
    });
  } catch (error: any) {
    console.error('Signature Error:', error);
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`[ABYRA BACKEND] Server running at http://0.0.0.0:${port}`);
});

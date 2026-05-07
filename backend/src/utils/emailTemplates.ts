 * Premium branded UI with soft violet aesthetics
 */
import { getFrontendUrl } from './urlHelper';

const LOGO_URL = 'https://res.cloudinary.com/dze1d3uen/image/upload/q_auto/f_auto/v1777728351/Picsart_26-05-02_18-44-52-685_wqgy9v.png';
const PRIMARY_COLOR = '#5b2c83'; // Deep Violet
const BG_COLOR = '#f6f3f9'; // Soft Violet Background

interface TemplateOptions {
  title: string;
  subtitle?: string;
  content: string;
  buttonText?: string;
  actionLink?: string;
}

/**
 * Generates the master HTML wrapper for all branding emails
 */
export function generateBrandedEmail(options: TemplateOptions): string {
  const { title, subtitle, content, buttonText, actionLink } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ABYRA</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: ${BG_COLOR};
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: ${BG_COLOR};
      padding: 40px 0;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(91, 44, 131, 0.08);
    }

    .header-strip {
      height: 6px;
      background: linear-gradient(90deg, #5b2c83, #9333ea, #5b2c83);
    }

    .content-area {
      padding: 48px 40px;
      text-align: center;
    }

    .logo-container {
      margin-bottom: 32px;
    }

    .logo {
      width: 120px;
      display: block;
      margin: 0 auto;
    }

    h1 {
      color: #1a1a1a;
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }

    .subtitle {
      color: #7c3aed;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .text-content {
      color: #4b5563;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 32px;
      text-align: left;
    }

    .cta-button {
      display: inline-block;
      background-color: ${PRIMARY_COLOR};
      color: #ffffff !important;
      padding: 16px 40px;
      border-radius: 14px;
      font-size: 16px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 14px rgba(91, 44, 131, 0.4);
    }

    .footer {
      padding: 32px 40px;
      text-align: center;
      background-color: #faf8ff;
      border-top: 1px solid #f3f0f7;
    }

    .footer p {
      color: #9ca3af;
      font-size: 13px;
      margin: 0 0 16px 0;
    }

    .social-links {
      margin-bottom: 16px;
    }

    .social-links a {
      color: ${PRIMARY_COLOR};
      text-decoration: none;
      margin: 0 10px;
      font-weight: 600;
      font-size: 13px;
    }

    @media screen and (max-width: 600px) {
      .content-area {
        padding: 32px 24px;
      }
      h1 {
        font-size: 24px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-strip"></div>
      
      <div class="content-area">
        <div class="logo-container">
          <img src="${LOGO_URL}" alt="ABYRA" class="logo">
        </div>

        <h1>${title}</h1>
        ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}

        <div class="text-content">
          ${content}
        </div>

        ${buttonText && actionLink ? `
          <a href="${actionLink}" class="cta-button">
            ${buttonText}
          </a>
        ` : ''}
      </div>

      <div class="footer">
        <div class="social-links">
          <a href="https://www.instagram.com/_abyra.in?igsh=MWxsbnVrY3ZrdHZzdg==">Instagram</a>
          <a href="https://pin.it/20NDpTmf0">Pinterest</a>
          <a href="mailto:abyra.com@gmail.com">Contact</a>
        </div>
        <p>© ${new Date().getFullYear()} ABYRA Store. All rights reserved.<br>
        Handcrafted with Love 💜</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Specific template for 2FA OTP
 */
export function generate2FAOTPEmail(otp: string): string {
  return generateBrandedEmail({
    title: '🔐 Your 2FA Login Code',
    subtitle: 'SECURITY VERIFICATION',
    content: `
      <p>A request was made to access your ABYRA account. For your security, please use the 6-digit verification code below to complete your login. This code is valid for 5 minutes.</p>
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f3f0f7; border-radius: 12px; border: 2px dashed #5b2c83;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #5b2c83;">${otp}</span>
      </div>
      <p style="text-align: center; color: #6b7280; font-size: 14px;">If you didn't attempt to login, please change your password immediately.</p>
    `
  });
}

/**
 * Specific template for OTP with "View OTP" button logic
 */
export function generateOTPEmail(otp: string): string {
  const baseUrl = getFrontendUrl();
  return generateBrandedEmail({
    title: 'Secure Access OTP',
    subtitle: 'Security Verification',
    content: `A request was made to access your ABYRA account. For your security, the OTP is protected. Click the button below to view your unique verification code on our secure page.`,
    buttonText: 'View Secure OTP',
    actionLink: `${baseUrl}/verify-otp?code=${Buffer.from(otp).toString('base64')}`
  });
}

/**
 * Order Confirmation Template
 */
export function generateOrderConfirmationEmail(orderId: string, total: number, receiptUrl?: string): string {
  const baseUrl = getFrontendUrl();
  let content = `<p>Thank you for shopping with ABYRA! We've received your order and are currently preparing your handcrafted pieces. Your total payment of ₹${total.toLocaleString('en-IN')} has been received successfully.</p>`;
  
  if (receiptUrl) {
    content += `<p>You can download your official receipt using the link below.</p>`;
  }

  return generateBrandedEmail({
    title: 'Order Confirmed! 🎉',
    subtitle: `Order #${orderId}`,
    content: content,
    buttonText: receiptUrl ? 'Download Receipt' : 'Continue Shopping',
    actionLink: receiptUrl || `${baseUrl}/products`
  });
}

/**
 * Password Updated Template
 */
export function generatePasswordUpdatedEmail(): string {
  const baseUrl = getFrontendUrl();
  return generateBrandedEmail({
    title: 'Password Updated! ✅',
    subtitle: 'SECURITY ALERT',
    content: `Your ABYRA account password has been successfully updated. If you did not make this change, please contact our support team immediately.`,
    buttonText: 'Go to My Account',
    actionLink: `${baseUrl}/profile`
  });
}

/**
 * Receipt Email Template
 */
export function generateReceiptEmail(orderId: string, receiptUrl: string): string {
  return generateBrandedEmail({
    title: 'Your Receipt is Ready 📄',
    subtitle: `INVOICE FOR #${orderId}`,
    content: `Thank you for your purchase. Your handcrafted items are being prepared. You can now download and save the official invoice for your records.`,
    buttonText: 'Download Invoice (PDF)',
    actionLink: receiptUrl
  });
}
/**
 * Password Reset Template (OTP Version)
 */
export function generatePasswordResetOTPEmail(otp: string): string {
  return generateBrandedEmail({
    title: 'Reset Your Password 🔐',
    subtitle: 'YOUR VERIFICATION CODE',
    content: `
      <p>We received a request to reset the password for your ABYRA account. Use the 6-digit verification code below to proceed with resetting your password. This code is valid for 5 minutes.</p>
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f3f0f7; border-radius: 12px; border: 2px dashed #5b2c83;">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #5b2c83;">${otp}</span>
      </div>
      <p style="text-align: center; color: #6b7280; font-size: 14px;">If you didn't make this request, you can safely ignore this email.</p>
    `
  });
}

/**
 * Account Verification Template
 */
export function generateVerificationEmail(name: string, verificationLink: string): string {
  // Ensure the link doesn't contain 'undefined' or localhost if it was generated with a broken env var
  const safeLink = verificationLink.replace(/https?:\/\/undefined/g, getFrontendUrl())
                                   .replace(/https?:\/\/localhost:\d+/g, getFrontendUrl());

  return generateBrandedEmail({
    title: 'Verify Your Email 📧',
    subtitle: 'ACTIVATE YOUR ACCOUNT',
    content: `
      <p>Hi ${name},</p>
      <p>Welcome to ABYRA! We're thrilled to have you on board. To start exploring our handcrafted collections and manage your orders, please verify your email address by clicking the button below.</p>
    `,
    buttonText: 'Verify My Email',
    actionLink: safeLink
  });
}

/**
 * Welcome Email Template
 */
export function generateWelcomeEmail(name: string): string {
  const baseUrl = getFrontendUrl();
  return generateBrandedEmail({
    title: 'Welcome to ABYRA 💜',
    subtitle: 'HANDCRAFTED WITH LOVE',
    content: `
      <p>Hi ${name},</p>
      <p>We're so happy to have you in our community! ABYRA is all about the art of crochet and the beauty of handmade gifts. We can't wait for you to see our latest collections.</p>
      <p>Start exploring our unique handcrafted bouquets and accessories today.</p>
    `,
    buttonText: 'Start Shopping',
    actionLink: `${baseUrl}/products`
  });
}

/**
 * Admin Alert Template
 */
export function generateAdminAlertEmail(subject: string, message: string): string {
  const baseUrl = getFrontendUrl();
  return generateBrandedEmail({
    title: '🚨 Admin Alert',
    subtitle: subject.toUpperCase(),
    content: `<p>${message}</p>`,
    buttonText: 'Open Dashboard',
    actionLink: `${baseUrl}/admin`
  });
}

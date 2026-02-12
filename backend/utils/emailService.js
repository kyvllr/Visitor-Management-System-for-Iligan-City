const nodemailer = require('nodemailer');
const path = require('path');
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const sendgridApiKey = process.env.SENDGRID_API_KEY;
const sendgridFrom = process.env.SENDGRID_FROM || process.env.EMAIL_USER || null;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

// Validate email configuration
if (!sendgridApiKey && !resendApiKey && (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
  console.warn('⚠️  WARNING: Email credentials not configured in .env file');
  console.warn('   Set SENDGRID_API_KEY (recommended), RESEND_API_KEY, or EMAIL_USER/EMAIL_PASSWORD');
}

let transporter = null;
if (!sendgridApiKey && !resendApiKey && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

// Verify transporter on startup (non-blocking with timeout)
const verifyEmailService = () => {
  if (sendgridApiKey) {
    console.log('✅ Email service configured for SendGrid');
    return;
  }

  if (resendApiKey) {
    console.log('✅ Email service configured for Resend');
    return;
  }

  if (!transporter) {
    console.warn('⚠️  Email service not configured');
    return;
  }

  const verifyTimeout = setTimeout(() => {
    console.warn('⚠️  Email verification timeout - proceeding without verification');
  }, 5000);

  transporter.verify(function(error, success) {
    clearTimeout(verifyTimeout);
    if (error) {
      console.error('❌ Email configuration error:', error.message);
      console.error('   Please check your EMAIL_USER and EMAIL_PASSWORD in .env file');
      if (error.message.includes('Application-specific password')) {
        console.error('   ⚠️  You need to use a Gmail App Password, not your regular password!');
        console.error('   📖 Follow the guide: https://support.google.com/accounts/answer/185833');
      }
    } else {
      console.log('✅ Email service is ready to send OTP emails');
    }
  });
};

verifyEmailService();

const getEmailHealth = () => {
  const provider = sendgridApiKey
    ? 'sendgrid'
    : (resendApiKey ? 'resend' : (transporter ? 'smtp' : 'none'));
  return {
    provider,
    configured: provider !== 'none',
    sendgridConfigured: Boolean(sendgridApiKey),
    resendConfigured: Boolean(resendApiKey),
    smtpConfigured: Boolean(transporter),
    fromAddress: sendgridApiKey
      ? sendgridFrom
      : (resendApiKey ? resendFrom : (process.env.EMAIL_USER || null))
  };
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, userName) => {
  try {
    const subject = 'Prison Management System - OTP Verification';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Welcome to Prison Management System</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Your account has been created. Please use the following OTP to complete your first-time login:</p>
            
            <div style="background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
              <h1 style="color: #007bff; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">This OTP will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">If you didn't request this, please contact your administrator immediately.</p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

    if (sendgridApiKey) {
      if (!sendgridFrom) {
        throw new Error('SENDGRID_FROM is required when using SendGrid');
      }

      await sgMail.send({
        to: email,
        from: sendgridFrom,
        subject,
        html
      });

      console.log('OTP email sent successfully (SendGrid)');
      return { success: true, messageId: 'sendgrid' };
    }

    if (resendClient) {
      const { data, error } = await resendClient.emails.send({
        from: resendFrom,
        to: email,
        subject,
        html
      });

      if (error) {
        throw new Error(error.message || 'Resend email failed');
      }

      console.log('OTP email sent successfully (Resend):', data?.id);
      return { success: true, messageId: data?.id };
    }

    if (!transporter) {
      throw new Error('Email service not configured');
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html
    });
    console.log('OTP email sent successfully (SMTP):', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

// Send Password Reset OTP email
const sendPasswordResetOTP = async (email, otp, userName) => {
  try {
    const subject = 'Prison Management System - Password Reset OTP';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hello ${userName},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Please use the following OTP to complete the password reset process:</p>
            
            <div style="background-color: #f8f9fa; border: 2px dashed #dc3545; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
              <h1 style="color: #dc3545; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">This OTP will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #dc3545; font-size: 14px; line-height: 1.6;"><strong>⚠️ If you didn't request this password reset, please ignore this email and contact your administrator immediately.</strong></p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </div>
      `;

    if (sendgridApiKey) {
      if (!sendgridFrom) {
        throw new Error('SENDGRID_FROM is required when using SendGrid');
      }

      await sgMail.send({
        to: email,
        from: sendgridFrom,
        subject,
        html
      });

      console.log('Password reset OTP email sent successfully (SendGrid)');
      return { success: true, messageId: 'sendgrid' };
    }

    if (resendClient) {
      const { data, error } = await resendClient.emails.send({
        from: resendFrom,
        to: email,
        subject,
        html
      });

      if (error) {
        throw new Error(error.message || 'Resend email failed');
      }

      console.log('Password reset OTP email sent successfully (Resend):', data?.id);
      return { success: true, messageId: data?.id };
    }

    if (!transporter) {
      throw new Error('Email service not configured');
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject,
      html
    });
    console.log('Password reset OTP email sent successfully (SMTP):', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset OTP email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendPasswordResetOTP,
  getEmailHealth
};

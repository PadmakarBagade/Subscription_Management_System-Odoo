import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.pass,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Dispatches an email notification via SMTP or console logger.
   */
  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; provider: string; messageId?: string }> {
    const { to, subject, html, text } = options;

    if (config.email.provider === 'smtp' && config.email.smtp.user) {
      try {
        const transporter = this.getTransporter();
        const info = await transporter.sendMail({
          from: config.email.from,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''),
        });
        logger.info({ to, subject, messageId: info.messageId }, '[EmailService] Email dispatched successfully via SMTP');
        return {
          success: true,
          provider: 'smtp',
          messageId: info.messageId,
        };
      } catch (err: any) {
        logger.error({ err: err.message, to, subject }, '[EmailService] Failed to send email via SMTP');
        return {
          success: false,
          provider: 'smtp_error',
        };
      }
    }

    logger.info(
      {
        to,
        subject,
        emailProvider: 'log_mode (development)',
        textSnippet: text ? text.substring(0, 120) : html.replace(/<[^>]*>?/gm, '').substring(0, 120),
      },
      '[EmailService] Notification logged to console (safe development mode)'
    );

    return {
      success: true,
      provider: 'log_mode (development)',
      messageId: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
  }

  // -------------------------------------------------------------
  // TEMPLATES
  // -------------------------------------------------------------

  static async sendWelcomeEmail(to: string, name: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Brightloop Software</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <h2>Welcome to Brightloop, ${name}!</h2>
          <p>Thank you for creating your account. You can now browse our subscription plans, track your active services, and manage your invoices from one intuitive portal.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${config.webAppUrl}/portal" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Customer Portal</a>
          </div>
          <p style="font-size: 14px; color: #64748b;">If you have any questions, feel free to reply to this email or visit our support center.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to Brightloop Software',
      html,
      text: `Welcome to Brightloop, ${name}! Log in at ${config.webAppUrl}/portal`,
    });
  }

  static async sendPasswordResetEmail(to: string, resetToken: string) {
    const resetUrl = `${config.webAppUrl}/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <div style="background-color: #4f46e5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Brightloop Software</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to choose a new password. This link is valid for 60 minutes.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #64748b; word-break: break-all;">Direct link: ${resetUrl}</p>
          <p style="font-size: 14px; color: #64748b;">If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Reset Your Brightloop Password',
      html,
      text: `Reset your Brightloop password by visiting: ${resetUrl}`,
    });
  }

  static async sendInvoiceEmail(to: string, invoiceNumber: string, amount: string, dueDate: string, invoiceUrl: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Brightloop Software</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <h2>New Invoice: ${invoiceNumber}</h2>
          <p>Your subscription invoice for <strong>${amount}</strong> has been generated.</p>
          <p><strong>Due Date:</strong> ${dueDate}</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${invoiceUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View & Pay Invoice</a>
          </div>
          <p style="font-size: 14px; color: #64748b;">Thank you for your business!</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Invoice ${invoiceNumber} from Brightloop Software`,
      html,
      text: `Invoice ${invoiceNumber} for ${amount} is due on ${dueDate}. View at: ${invoiceUrl}`,
    });
  }

  static async sendPaymentConfirmationEmail(to: string, paymentNumber: string, amount: string, invoiceNumber: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Payment Received</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
          <h2>Thank You For Your Payment</h2>
          <p>We successfully received your payment of <strong>${amount}</strong>.</p>
          <p><strong>Payment Reference:</strong> ${paymentNumber}</p>
          <p><strong>Applied to Invoice:</strong> ${invoiceNumber}</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${config.webAppUrl}/portal/invoices" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Download Receipt</a>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Payment Receipt: ${paymentNumber} for Invoice ${invoiceNumber}`,
      html,
      text: `Payment of ${amount} received for invoice ${invoiceNumber}. Ref: ${paymentNumber}`,
    });
  }
}

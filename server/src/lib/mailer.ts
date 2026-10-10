import nodemailer from "nodemailer";

const createTransport = () => {
  // If no SMTP config, use Ethereal (dev fake SMTP — emails logged to console)
  if (!process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: process.env.SMTP_USER ?? "dev@ethereal.email",
        pass: process.env.SMTP_PASS ?? "devpassword",
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
};

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const FROM = process.env.SMTP_FROM ?? "WealthMap <noreply@wealthmap.app>";

// ── Send email verification link ──────────────────────────────────────────────
export const sendVerificationEmail = async (email: string, name: string, token: string) => {
  const transporter = createTransport();
  const link = `${APP_URL}/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Verify your WealthMap email",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:2rem;background:#EEF2FF;border-radius:16px;">
        <h2 style="color:#1A1F36">Hi ${name} 👋</h2>
        <p style="color:#4A5578">Welcome to WealthMap! Click the button below to verify your email address.</p>
        <a href="${link}" style="display:inline-block;margin:1.5rem 0;padding:0.85rem 2rem;background:#7B8CDE;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#8892B0;font-size:0.8rem;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });

  // In dev without real SMTP, log the preview URL
  if (!process.env.SMTP_HOST) {
    console.log(`[Mailer] Verification email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
};

// ── Send password reset link ──────────────────────────────────────────────────
export const sendPasswordResetEmail = async (email: string, name: string, token: string) => {
  const transporter = createTransport();
  const link = `${APP_URL}/reset-password?token=${token}`;

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    subject: "Reset your WealthMap password",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:2rem;background:#EEF2FF;border-radius:16px;">
        <h2 style="color:#1A1F36">Hi ${name},</h2>
        <p style="color:#4A5578">We received a request to reset your WealthMap password. Click the button below to set a new password.</p>
        <a href="${link}" style="display:inline-block;margin:1.5rem 0;padding:0.85rem 2rem;background:#FF6B6B;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
        <p style="color:#8892B0;font-size:0.8rem;">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[Mailer] Password reset email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
};

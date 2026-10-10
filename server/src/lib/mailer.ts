import nodemailer from "nodemailer";

const createTransport = () => {
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

// ── Send OTP email ────────────────────────────────────────────────────────────
export const sendOtpEmail = async (email: string, name: string, otp: string) => {
  const transporter = createTransport();

  const info = await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `${otp} is your WealthMap OTP`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:auto;padding:2rem;background:#F5F8F7;border-radius:16px;border:1px solid #C5E9D9;">
        <h2 style="color:#182923">Hi ${name} 👋</h2>
        <p style="color:#53675F">Use the OTP below to complete your login. It expires in <strong>10 minutes</strong>.</p>
        <div style="margin:1.5rem 0;text-align:center;">
          <span style="display:inline-block;letter-spacing:0.5rem;font-size:2.5rem;font-weight:800;color:#218565;background:#E7F5EF;padding:1rem 2rem;border-radius:12px;border:2px solid #8BD0B2;">
            ${otp}
          </span>
        </div>
        <p style="color:#82928B;font-size:0.8rem;">This OTP expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        <p style="color:#82928B;font-size:0.8rem;">Never share this OTP with anyone.</p>
      </div>
    `,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`[Mailer] OTP email preview: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`[Mailer] 🔑 OTP for ${email}: ${otp}`);
  }
};

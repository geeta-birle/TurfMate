const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"TurfMate" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to TurfMate! 🏟️',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Welcome to TurfMate, ${name}! 🎉</h2>
        <p>You're all set to book turfs and join matches in your city.</p>
        <p>Start discovering open matches near you today!</p>
        <a href="${process.env.CLIENT_URL}/matches" 
           style="background: #16a34a; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Explore Matches
        </a>
      </div>
    `,
  }),

  bookingConfirmed: (name, turfName, date, time) => ({
    subject: 'Booking Confirmed ✅ — TurfMate',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Booking Confirmed!</h2>
        <p>Hi ${name}, your booking is confirmed.</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Turf:</strong> ${turfName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
        </div>
      </div>
    `,
  }),

  // Add inside emailTemplates object:

verifyEmail: (name, verifyUrl) => ({
  subject: 'Verify Your TurfMate Account 📧',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px;
      margin: 0 auto; padding: 20px;">
      <div style="background: #16a34a; padding: 30px; border-radius:
        12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TurfMate</h1>
        <p style="color: #bbf7d0; margin: 8px 0 0;">Community Sports Platform</p>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;
        border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #111827; margin-top: 0;">
          Hi ${name}! Verify your email 👋
        </h2>
        <p style="color: #6b7280; line-height: 1.6;">
          Thanks for joining TurfMate! Click the button below to verify
          your email address and activate your account.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}"
            style="background: #16a34a; color: white; padding: 14px 32px;
              text-decoration: none; border-radius: 8px; font-weight: bold;
              font-size: 16px; display: inline-block;">
            ✅ Verify Email Address
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">
          This link expires in <strong>24 hours</strong>.
          If you didn't create an account, ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb;
          margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          Or copy this link: <br/>
          <span style="color: #16a34a; word-break: break-all;">
            ${verifyUrl}
          </span>
        </p>
      </div>
    </div>
  `,
}),

resetPassword: (name, resetUrl) => ({
  subject: 'Reset Your TurfMate Password 🔒',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px;
      margin: 0 auto; padding: 20px;">
      <div style="background: #16a34a; padding: 30px; border-radius:
        12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">TurfMate</h1>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;
        border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #111827; margin-top: 0;">
          Password Reset Request 🔑
        </h2>
        <p style="color: #6b7280; line-height: 1.6;">
          Hi ${name}, we received a request to reset your TurfMate password.
          Click the button below to create a new password.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
            style="background: #16a34a; color: white; padding: 14px 32px;
              text-decoration: none; border-radius: 8px; font-weight: bold;
              font-size: 16px; display: inline-block;">
            🔒 Reset Password
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">
          This link expires in <strong>1 hour</strong>.
          If you didn't request this, ignore this email.
          Your password will remain unchanged.
        </p>
      </div>
    </div>
  `,
}),

  matchInvite: (name, matchTitle, inviteCode) => ({
    subject: `You're invited to join "${matchTitle}" — TurfMate`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Match Invite 🏆</h2>
        <p>Hi ${name}, you've been invited to join <strong>${matchTitle}</strong>.</p>
        <p>Use this code to join: <strong style="font-size: 24px; color: #16a34a;">${inviteCode}</strong></p>
        <a href="${process.env.CLIENT_URL}/matches/join/${inviteCode}"
           style="background: #16a34a; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">
          Join Match
        </a>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
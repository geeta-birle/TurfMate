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
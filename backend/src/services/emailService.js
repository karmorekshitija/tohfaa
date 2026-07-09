const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'admin@tohfa.in';

let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

/**
 * Sends a notification email about a raised problem report/ticket.
 */
async function sendProblemReportEmail({ ticketId, buyerId, category, description, relatedOrderId, relatedProductId }) {
  const subject = `[Tohfa Ticket #${ticketId}] New Problem Report Filed`;
  const bodyText = `
Hello Tohfa Admin/Seller,

A new support ticket has been registered via the chatbot:

Ticket Reference ID: #${ticketId}
Category: ${category}
Description:
${description}

Additional Context:
- Buyer ID: ${buyerId || 'Anonymous'}
- Related Order ID: ${relatedOrderId || 'Not specified'}
- Related Product ID: ${relatedProductId || 'Not specified'}

Please check the admin portal or query the problem_reports table to follow up on this ticket.

Warm regards,
Tohfa Marketplace Platform
  `;

  console.log(`\x1b[33m[EMAIL SIMULATOR] Sending Email Notification:\x1b[0m`);
  console.log(`\x1b[33mSubject:\x1b[0m ${subject}`);
  console.log(`\x1b[33mTo:\x1b[0m ${ADMIN_NOTIFY_EMAIL}`);
  console.log(`\x1b[33mBody:\x1b[0m\n${bodyText.trim()}`);

  if (!transporter) {
    console.log(`\x1b[33m[EMAIL SIMULATOR] SMTP not configured. Email logged to console only.\x1b[0m`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Tohfa Assistant" <${EMAIL_USER}>`,
      to: ADMIN_NOTIFY_EMAIL,
      subject: subject,
      text: bodyText
    });
    console.log(`Email successfully sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Nodemailer failed to send email notification:", err);
    throw err;
  }
}

/**
 * Sends a password reset email.
 */
async function sendPasswordResetEmail({ email, token }) {
  const frontendUrl = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/auth/reset-password.html?token=${token}`;
  const subject = `Reset Your Tohfa Hub Password`;
  const bodyText = `
Hello,

We received a request to reset the password for your Tohfa Hub account.

Please click the link below to set a new password:
${resetUrl}

This link is valid for 1 hour and can only be used once.

If you did not request a password reset, please ignore this email.

Warm regards,
Tohfa Marketplace Platform
  `;

  console.log(`[EMAIL SIMULATOR] Password reset email queued for ${email}`);

  if (!transporter) {
    console.log(`[EMAIL SIMULATOR] SMTP not configured. Password reset email simulated.`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Tohfa Assistant" <${EMAIL_USER}>`,
      to: email,
      subject: subject,
      text: bodyText
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("Nodemailer failed to send password reset email:", err);
    throw err;
  }
}

module.exports = {
  sendProblemReportEmail,
  sendPasswordResetEmail
};

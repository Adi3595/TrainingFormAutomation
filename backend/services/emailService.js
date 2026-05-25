// emailService.js
const nodemailer = require("nodemailer");
require("dotenv").config();

// ==============================
// 📧 Transporter - FIXED with IPv4 and better configuration
// ==============================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  },
  // CRITICAL FIX: Force IPv4
  family: 4,
  // Connection timeouts
  connectionTimeout: 30000, // 30 seconds
  greetingTimeout: 30000,
  socketTimeout: 30000,
  // Debug options (set to false in production)
  debug: process.env.NODE_ENV === 'development',
  logger: process.env.NODE_ENV === 'development',
  // Additional Gmail specific settings
  tls: {
    rejectUnauthorized: false // Only for testing, remove in production
  }
});

// Alternative configuration using service with IPv4 fix
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_APP_PASSWORD
//   },
//   family: 4, // This is the key fix for IPv6 issues
//   connectionTimeout: 30000,
//   socketTimeout: 30000,
// });

// ==============================
// ✅ Verify transporter with retry
// ==============================
let transporterVerified = false;

const verifyTransporter = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await transporter.verify();
      console.log("✅ Email server ready - Sending from:", process.env.EMAIL_USER);
      transporterVerified = true;
      return true;
    } catch (error) {
      console.error(`❌ Email server verification attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error("❌ Email server may not work properly");
      }
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
};

// Run verification
verifyTransporter();

// ==============================
// 📤 Common Send Function with Retry Logic
// ==============================
const sendEmail = async (to, subject, html, retries = 2) => {
  if (!to) throw new Error("Recipient email missing");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const mailOptions = {
        from: `"HR Training System" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to} (Attempt ${attempt})`);
      return info;
      
    } catch (error) {
      console.error(`❌ Send attempt ${attempt} failed for ${to}:`, error.message);
      
      // Don't retry certain errors
      if (error.code === 'ENETUNREACH' || error.code === 'ETIMEDOUT') {
        console.error(`Network error - consider checking IPv6 configuration`);
      }
      
      if (attempt === retries) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// ==============================
// 👨‍💼 EMPLOYEE TRAINING EMAIL
// ==============================
exports.sendEmployeeTrainingEmail = async (
  recipientEmail,
  employeeName,
  trainingName,
  formLink,
  senderUser = null
) => {
  if (!recipientEmail) throw new Error("Employee email missing");

  const senderName = senderUser?.name || "HR Training Team";
  const senderEmail = senderUser?.email || process.env.EMAIL_USER;

  const safeEmployeeName = employeeName || "Employee";
  const safeTrainingName = trainingName || "Training";

  const subject = `Training Feedback Required - ${safeTrainingName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f8f9fa; padding:24px;">
      <div style="max-width:600px; margin:auto; background:white; padding:24px; border-radius:10px; border:1px solid #e5e7eb;">
        
        <h2 style="color:#111827;">🎓 Training Feedback Required</h2>

        <p>Hello <strong>${safeEmployeeName}</strong>,</p>

        <p>
          You have been assigned for the training:
          <strong>${safeTrainingName}</strong>
        </p>

        <p>
          Please complete your employee feedback form using the button below.
        </p>

        <a href="${formLink}"
          style="display:inline-block;
                 background:#667eea;
                 color:white;
                 padding:12px 24px;
                 text-decoration:none;
                 border-radius:8px;
                 margin-top:12px;
                 font-weight:600;">
          Fill Feedback Form
        </a>

        <p style="margin-top: 20px; font-size: 13px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${formLink}" style="color:#667eea; word-break: break-all;">${formLink}</a>
        </p>

        <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />

        <p style="font-size:13px; color:#6b7280;">
          Requested by: <strong>${senderName}</strong><br/>
          Reply to:
          <a href="mailto:${senderEmail}" style="color:#667eea;">
            ${senderEmail}
          </a>
        </p>

        <p style="font-size:12px; color:#9ca3af;">
          Automated email from HR Training Management System.
        </p>

      </div>
    </div>
  `;

  return await sendEmail(recipientEmail, subject, html);
};

// ==============================
// 📊 MANAGER EMAIL
// ==============================
exports.sendManagerEmail = async (
  recipientEmail,
  formLink,
  employeeName,
  trainingName,
  emailType = "initial",
  senderUser = null
) => {
  if (!recipientEmail) throw new Error("Recipient email missing");
  if (!formLink) throw new Error("Manager form link missing");

  const senderName = senderUser?.name || "HR Training System";
  const senderEmail = senderUser?.email || process.env.EMAIL_USER;

  const safeEmployeeName = employeeName || "Employee";
  const safeTrainingName = trainingName || "Training";

  const isReminder = emailType === "reminder";

  const subject = isReminder
    ? `Reminder: Feedback Pending - ${safeTrainingName}`
    : `Manager Feedback Required - ${safeTrainingName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f8f9fa; padding:24px;">
      <div style="max-width:600px; margin:auto; background:white; padding:24px; border-radius:10px; border:1px solid #e5e7eb;">

        <h2 style="color:#111827;">
          ${isReminder ? "🔔 Reminder: Feedback Still Required" : "📊 Manager Feedback Required"}
        </h2>

        <p>
          ${isReminder
            ? `Reminder to submit feedback for ${safeEmployeeName}.`
            : `${safeEmployeeName} completed the training. Please submit feedback.`
          }
        </p>

        <p><b>Employee:</b> ${safeEmployeeName}</p>
        <p><b>Training:</b> ${safeTrainingName}</p>

        <a href="${formLink}"
          style="display:inline-block;
                 background:${isReminder ? "#dc3545" : "#28a745"};
                 color:white;
                 padding:12px 24px;
                 text-decoration:none;
                 border-radius:8px;
                 margin-top:12px;">
          Submit Feedback
        </a>

        <p style="margin-top: 20px; font-size: 13px;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${formLink}" style="color:#667eea; word-break: break-all;">${formLink}</a>
        </p>

        <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />

        <p style="font-size:13px; color:#6b7280;">
          Requested by: <strong>${senderName}</strong><br/>
          Reply to:
          <a href="mailto:${senderEmail}" style="color:#667eea;">
            ${senderEmail}
          </a>
        </p>

      </div>
    </div>
  `;

  return await sendEmail(recipientEmail, subject, html);
};

// emailService.js - Gmail with IPv4 Workarounds
const nodemailer = require("nodemailer");
const dns = require('dns');
require("dotenv").config();

// ==============================
// 🌐 Force IPv4 globally for all DNS lookups
// ==============================
dns.setDefaultResultOrder('ipv4first');

// ==============================
// 📧 Transporter - Multiple fallback configurations
// ==============================

// Configuration 1: Port 465 with SSL (Recommended for Render)
const createTransporter465 = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    family: 4, // Force IPv4
    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
    // Disable IPv6 lookup completely
    lookup: (hostname, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    }
  });
};

// Configuration 2: Port 587 with TLS (Fallback)
const createTransporter587 = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    family: 4,
    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
    requireTLS: true,
    lookup: (hostname, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    }
  });
};

// Configuration 3: Use IPv4 address directly (Last resort)
const createTransporterDirectIP = () => {
  return nodemailer.createTransport({
    host: "142.250.27.108", // smtp.gmail.com resolved to IPv4
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    family: 4,
    connectionTimeout: 60000,
    greetingTimeout: 60000,
    socketTimeout: 60000,
    // Skip TLS verification for direct IP (only if needed)
    tls: {
      rejectUnauthorized: false
    }
  });
};

// ==============================
// 🔄 Transporter with auto-fallback
// ==============================
let transporter = null;
let currentConfig = 1;

const getTransporter = () => {
  if (transporter) return transporter;
  
  try {
    console.log(`📧 Attempting to create transporter with config ${currentConfig}...`);
    
    if (currentConfig === 1) {
      transporter = createTransporter465();
    } else if (currentConfig === 2) {
      transporter = createTransporter587();
    } else {
      transporter = createTransporterDirectIP();
    }
    
    return transporter;
  } catch (error) {
    console.error(`❌ Failed to create transporter with config ${currentConfig}:`, error.message);
    return null;
  }
};

// ==============================
// ✅ Verify transporter with retry and fallback
// ==============================
let transporterVerified = false;

const verifyTransporter = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const currentTransporter = getTransporter();
    
    if (!currentTransporter) {
      console.log(`⚠️ No transporter available for attempt ${attempt}`);
      continue;
    }
    
    try {
      await currentTransporter.verify();
      console.log(`✅ Email server ready (Config ${currentConfig}) - Sending from:`, process.env.EMAIL_USER);
      transporterVerified = true;
      return true;
    } catch (error) {
      console.error(`❌ Email server verification attempt ${attempt} failed:`, error.message);
      
      // If verification fails, try next configuration
      if (attempt === retries && currentConfig < 3) {
        currentConfig++;
        transporter = null; // Reset transporter to try new config
        console.log(`🔄 Switching to configuration ${currentConfig}...`);
      } else if (attempt === retries && currentConfig >= 3) {
        console.error("❌ All email configurations failed. Email sending may not work.");
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
};

// Run verification (don't await - let it run in background)
verifyTransporter();

// ==============================
// 📤 Common Send Function with Retry Logic
// ==============================
const sendEmail = async (to, subject, html, retries = 3) => {
  if (!to) throw new Error("Recipient email missing");
  
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    throw new Error("Email credentials not configured. Please set EMAIL_USER and EMAIL_APP_PASSWORD");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const currentTransporter = getTransporter();
      
      if (!currentTransporter) {
        throw new Error("No transporter available");
      }
      
      const mailOptions = {
        from: `"HR Training System" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      };

      const info = await currentTransporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to} (Attempt ${attempt})`);
      return info;
      
    } catch (error) {
      console.error(`❌ Send attempt ${attempt} failed for ${to}:`, error.message);
      
      // If we get an IPv6 error, force switch to next config
      if (error.code === 'ENETUNREACH' || error.message.includes('ENETUNREACH') || 
          error.message.includes('IPv6') || error.message.includes('2404:')) {
        console.log(`🔄 IPv6 error detected. Switching to next configuration...`);
        if (currentConfig < 3) {
          currentConfig++;
          transporter = null; // Reset transporter for next attempt
          console.log(`📧 Switched to configuration ${currentConfig}`);
        }
      }
      
      // Don't retry certain errors
      if (error.code === 'EAUTH') {
        console.error(`❌ Authentication error - check EMAIL_USER and EMAIL_APP_PASSWORD`);
        throw error;
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
  if (!formLink) throw new Error("Employee form link missing");

  const senderName = senderUser?.name || "HR Training Team";
  const senderEmail = senderUser?.email || process.env.EMAIL_USER;

  const safeEmployeeName = employeeName || "Employee";
  const safeTrainingName = trainingName || "Training";

  const subject = `Training Feedback Required - ${safeTrainingName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background:#f8f9fa; padding:24px; margin:0;">
      <div style="max-width:600px; margin:auto; background:white; padding:24px; border-radius:10px; border:1px solid #e5e7eb; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        
        <div style="text-align:center; margin-bottom:24px;">
          <h2 style="color:#111827; margin:0;">🎓 Training Feedback Required</h2>
          <p style="color:#6b7280; margin-top:8px;">Please complete your feedback form</p>
        </div>

        <p style="color:#374151; line-height:1.5;">Hello <strong>${safeEmployeeName}</strong>,</p>

        <p style="color:#374151; line-height:1.5;">
          You have been assigned for the training:
          <strong style="color:#667eea;">${safeTrainingName}</strong>
        </p>

        <p style="color:#374151; line-height:1.5;">
          Please complete your employee feedback form using the button below.
          Your feedback is valuable for improving future training programs.
        </p>

        <div style="text-align:center; margin:32px 0;">
          <a href="${formLink}"
            style="display:inline-block;
                   background:#667eea;
                   color:white;
                   padding:14px 28px;
                   text-decoration:none;
                   border-radius:8px;
                   font-weight:600;
                   font-size:16px;
                   box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            📝 Fill Feedback Form
          </a>
        </div>

        <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin:24px 0;">
          <p style="margin:0 0 8px 0; font-size:13px; color:#6b7280;">
            <strong>🔗 Link not working?</strong><br/>
            Copy and paste this link into your browser:
          </p>
          <p style="margin:0; font-size:12px; word-break: break-all; color:#667eea;">
            ${formLink}
          </p>
        </div>

        <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />

        <p style="font-size:13px; color:#6b7280; margin:0;">
          Requested by: <strong>${senderName}</strong><br/>
          Reply to:
          <a href="mailto:${senderEmail}" style="color:#667eea; text-decoration:none;">
            ${senderEmail}
          </a>
        </p>

        <p style="font-size:12px; color:#9ca3af; margin-top:16px; margin-bottom:0;">
          ⚡ Automated email from HR Training Management System
        </p>

      </div>
    </body>
    </html>
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

  const buttonColor = isReminder ? "#dc3545" : "#28a745";
  const buttonText = isReminder ? "🔔 Submit Feedback Now" : "⭐ Submit Feedback";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background:#f8f9fa; padding:24px; margin:0;">
      <div style="max-width:600px; margin:auto; background:white; padding:24px; border-radius:10px; border:1px solid #e5e7eb; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        
        <div style="text-align:center; margin-bottom:24px;">
          <h2 style="color:#111827; margin:0;">
            ${isReminder ? "🔔 Reminder: Feedback Required" : "📊 Manager Feedback Required"}
          </h2>
          <p style="color:#6b7280; margin-top:8px;">
            ${isReminder ? "Please submit your pending feedback" : "Employee has completed the training"}
          </p>
        </div>

        <p style="color:#374151; line-height:1.5;">Dear <strong>Manager</strong>,</p>

        <p style="color:#374151; line-height:1.5;">
          ${isReminder
            ? `This is a reminder to submit feedback for the employee below.`
            : `The following employee has completed the training and requires your feedback.`
          }
        </p>

        <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin:24px 0;">
          <p style="margin:0 0 12px 0; font-weight:600; color:#374151;">📋 Details:</p>
          <p style="margin:0 0 8px 0; font-size:14px;">
            <strong>👤 Employee:</strong> ${safeEmployeeName}
          </p>
          <p style="margin:0; font-size:14px;">
            <strong>📚 Training:</strong> ${safeTrainingName}
          </p>
        </div>

        <div style="text-align:center; margin:32px 0;">
          <a href="${formLink}"
            style="display:inline-block;
                   background:${buttonColor};
                   color:white;
                   padding:14px 28px;
                   text-decoration:none;
                   border-radius:8px;
                   font-weight:600;
                   font-size:16px;
                   box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            ${buttonText}
          </a>
        </div>

        <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin:24px 0;">
          <p style="margin:0 0 8px 0; font-size:13px; color:#6b7280;">
            <strong>🔗 Link not working?</strong><br/>
            Copy and paste this link into your browser:
          </p>
          <p style="margin:0; font-size:12px; word-break: break-all; color:#667eea;">
            ${formLink}
          </p>
        </div>

        <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />

        <p style="font-size:13px; color:#6b7280; margin:0;">
          Requested by: <strong>${senderName}</strong><br/>
          Reply to:
          <a href="mailto:${senderEmail}" style="color:#667eea; text-decoration:none;">
            ${senderEmail}
          </a>
        </p>

        <p style="font-size:12px; color:#9ca3af; margin-top:16px; margin-bottom:0;">
          ⚡ Automated email from HR Training Management System
        </p>

      </div>
    </body>
    </html>
  `;

  return await sendEmail(recipientEmail, subject, html);
};

// ==============================
// 🔧 Test email configuration
// ==============================
exports.testEmailConfig = async (testEmail) => {
  try {
    const testResult = await sendEmail(
      testEmail || process.env.EMAIL_USER,
      "✅ Test Email from HR Training System",
      `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; padding:20px;">
        <div style="max-width:500px; margin:auto; background:#f8f9fa; padding:20px; border-radius:10px; text-align:center;">
          <h2 style="color:#28a745;">✅ Test Successful!</h2>
          <p>Your email configuration is working correctly.</p>
          <p style="color:#6b7280; font-size:12px;">Sent from HR Training Management System</p>
          <hr />
          <p style="font-size:11px; color:#999;">Configuration: ${currentConfig}</p>
        </div>
      </body>
      </html>
      `
    );
    console.log("✅ Test email sent successfully");
    return { success: true, messageId: testResult.messageId, config: currentConfig };
  } catch (error) {
    console.error("❌ Test email failed:", error.message);
    return { success: false, error: error.message };
  }
};

// ==============================
// 📊 Get current configuration status
// ==============================
exports.getEmailStatus = () => {
  return {
    configured: !!(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD),
    email_user: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 3)}...` : null,
    current_config: currentConfig,
    verified: transporterVerified,
    has_transporter: !!transporter
  };
};

// ==============================
// ✅ Initial log
// ==============================
console.log("🚀 Email Service (Gmail with IPv4 fixes) loaded");
console.log(`📧 Configured email: ${process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 3) + '...' : 'Not configured'}`);
console.log(`🔧 Starting with configuration ${currentConfig}`);
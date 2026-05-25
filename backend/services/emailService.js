// emailService.js
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first"); // 🔥 FIX IPv6 ERROR

const nodemailer = require("nodemailer");
require("dotenv").config();

// ==============================
// 📧 Transporter (FIXED)
// ==============================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

// ==============================
// ✅ Verify transporter
// ==============================
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email server error:", error.message);
  } else {
    console.log("✅ Email server ready - Sending from:", process.env.EMAIL_USER);
  }
});

// ==============================
// 📤 Common Send Function
// ==============================
const sendEmail = async (to, subject, html) => {
  if (!to) throw new Error("Recipient email missing");

  try {
    const mailOptions = {
      from: `"HR Training System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent to ${to}`);
    return info;

  } catch (error) {
    console.error("❌ Email send failed:", error.message);
    throw error;
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

  const subject = `Training Feedback Required - ${trainingName || "Training"}`;

  const html = `
    <div style="font-family: Arial; background:#f8f9fa; padding:24px;">
      <div style="max-width:600px; margin:auto; background:white; padding:24px; border-radius:10px;">

        <h2>🎓 Training Feedback Required</h2>

        <p>Hello <b>${employeeName || "Employee"}</b>,</p>

        <p>You have been assigned: <b>${trainingName || "Training"}</b></p>

        <a href="${formLink}"
          style="display:inline-block;background:#667eea;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Fill Feedback Form
        </a>

        <hr/>

        <p style="font-size:12px;color:#666;">
          Requested by: <b>${senderName}</b><br/>
          Reply: <a href="mailto:${senderEmail}">${senderEmail}</a>
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

  const isReminder = emailType === "reminder";

  const subject = isReminder
    ? `🔔 Reminder: Feedback Pending - ${trainingName}`
    : `📊 Manager Feedback Required - ${trainingName}`;

  const html = `
    <div style="font-family: Arial; background:#f8f9fa; padding:24px;">
      <div style="max-width:600px; margin:auto; background:white; padding:24px; border-radius:10px;">

        <h2>${isReminder ? "🔔 Reminder" : "📊 Manager Feedback Required"}</h2>

        <p>
          ${isReminder
            ? `Reminder: submit feedback for ${employeeName}`
            : `${employeeName} completed training. Please submit feedback.`}
        </p>

        <p><b>Employee:</b> ${employeeName}</p>
        <p><b>Training:</b> ${trainingName}</p>

        <a href="${formLink}"
          style="display:inline-block;background:${isReminder ? "#dc3545" : "#28a745"};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Submit Feedback
        </a>

        <hr/>

        <p style="font-size:12px;color:#666;">
          Requested by: <b>${senderName}</b><br/>
          Reply: <a href="mailto:${senderEmail}">${senderEmail}</a>
        </p>

      </div>
    </div>
  `;

  return await sendEmail(recipientEmail, subject, html);
};
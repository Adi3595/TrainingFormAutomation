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

// ==============================
// 📧 TRAINING CREATOR NOTIFICATION - Employee Feedback Submitted
// ==============================
exports.sendTrainingCreatorNotification = async (
  creatorEmail,
  creatorName,
  notifications
) => {
  if (!creatorEmail) throw new Error("Creator email missing");
  if (!notifications || notifications.length === 0) return;

  const isMultiple = notifications.length > 1;
  const firstNotification = notifications[0];

  // Group by training name
  const trainingGroups = {};
  notifications.forEach(notif => {
    if (!trainingGroups[notif.trainingName]) {
      trainingGroups[notif.trainingName] = [];
    }
    trainingGroups[notif.trainingName].push(notif);
  });

  const subject = isMultiple
    ? `📊 ${notifications.length} Employee Feedback Submissions for Your Training${Object.keys(trainingGroups).length > 1 ? 's' : ''}`
    : `📊 Employee Feedback Submitted - ${firstNotification.trainingName}`;

  function getRatingColor(rating) {
    if (rating >= 4) return '#28a745';
    if (rating >= 3) return '#ffc107';
    if (rating >= 2) return '#fd7e14';
    return '#dc3545';
  }

  // Build HTML for multiple notifications grouped by training
  let trainingSections = "";
  if (isMultiple) {
    for (const [trainingName, trainingNotifs] of Object.entries(trainingGroups)) {
      const avgRating = trainingNotifs.filter(n => n.rating).reduce((sum, n) => sum + n.rating, 0) / (trainingNotifs.filter(n => n.rating).length || 1);
      
      trainingSections += `
        <div style="margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <div style="background: #f3f4f6; padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="margin: 0; color: #111827;">📚 ${trainingName}</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">${trainingNotifs.length} submission${trainingNotifs.length !== 1 ? 's' : ''} | Avg Rating: ${avgRating.toFixed(1)}/5</p>
          </div>
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                <th style="padding: 10px; text-align: left;">Employee</th>
                <th style="padding: 10px; text-align: center;">Rating</th>
                <th style="padding: 10px; text-align: center;">Status</th>
                <th style="padding: 10px; text-align: left;">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              ${trainingNotifs.map(notif => `
                <tr style="border-bottom: 1px solid #f3f4f6;">
                  <td style="padding: 10px;">
                    ${notif.employeeName}<br/>
                    <small style="color:#6b7280;">${notif.employeeCode}</small>
                  </td>
                  <td style="padding: 10px; text-align: center;">
                    ${notif.rating ? `<span style="background: ${getRatingColor(notif.rating)}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${notif.rating}/5</span>` : '-'}
                   </td>
                  <td style="padding: 10px; text-align: center;">
                    <span style="background: ${notif.isUpdate ? '#ffc107' : '#28a745'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
                      ${notif.isUpdate ? 'Updated' : 'New'}
                    </span>
                   </td>
                  <td style="padding: 10px; font-size: 12px; color: #6b7280;">
                    ${new Date(notif.submittedAt).toLocaleString()}
                   </td>
                 </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; background:#f8f9fa; padding:24px; margin:0;">
      <div style="max-width:800px; margin:auto; background:white; padding:24px; border-radius:10px; border:1px solid #e5e7eb; box-shadow:0 4px 6px rgba(0,0,0,0.05);">
        
        <div style="text-align:center; margin-bottom:24px;">
          <div style="font-size:48px;">📊</div>
          <h2 style="color:#111827; margin:0;">Employee Feedback Received</h2>
          <p style="color:#6b7280; margin-top:8px;">
            ${isMultiple 
              ? `${notifications.length} employee${notifications.length !== 1 ? 's have' : ' has'} submitted feedback for your training${Object.keys(trainingGroups).length > 1 ? 's' : ''}`
              : `${firstNotification.employeeName} submitted feedback for "${firstNotification.trainingName}"`
            }
          </p>
        </div>

        <p style="color:#374151;">Hello <strong>${creatorName}</strong>,</p>

        <p style="color:#374151;">
          Good news! ${isMultiple 
            ? `Employee feedback has been submitted for the training program(s) you created.`
            : `An employee has submitted feedback for the training program you created.`
          }
        </p>

        ${isMultiple ? trainingSections : `
          <div style="background:#f3f4f6; padding:16px; border-radius:8px; margin:20px 0;">
            <p style="margin:0 0 12px 0; font-weight:600; color:#374151;">📋 Feedback Details:</p>
            <p style="margin:0 0 8px 0;"><strong>👤 Employee:</strong> ${firstNotification.employeeName} (${firstNotification.employeeCode})</p>
            <p style="margin:0 0 8px 0;"><strong>📚 Training:</strong> ${firstNotification.trainingName}</p>
            <p style="margin:0 0 8px 0;"><strong>⭐ Rating:</strong> 
              ${firstNotification.rating ? `<span style="background: ${getRatingColor(firstNotification.rating)}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${firstNotification.rating}/5</span>` : 'Not rated'}
            </p>
            <p style="margin:0 0 8px 0;"><strong>📝 Status:</strong> 
              <span style="background: ${firstNotification.isUpdate ? '#ffc107' : '#28a745'}; color: white; padding: 4px 8px; border-radius: 4px;">
                ${firstNotification.isUpdate ? 'Feedback Updated' : 'New Feedback'}
              </span>
            </p>
            ${firstNotification.comments ? `
              <p style="margin:12px 0 0 0;"><strong>💬 Comments:</strong></p>
              <p style="margin:4px 0 0 0; background:white; padding:12px; border-radius:6px; font-style:italic;">
                "${firstNotification.comments.substring(0, 500)}${firstNotification.comments.length > 500 ? '...' : ''}"
              </p>
            ` : ''}
          </div>
        `}

        ${isMultiple && notifications.some(n => n.comments) ? `
          <details style="margin: 20px 0;">
            <summary style="cursor: pointer; color: #667eea; font-weight: 600;">📋 View Detailed Comments</summary>
            <div style="margin-top: 12px;">
              ${notifications.filter(n => n.comments).map(notif => `
                <div style="background:#f9fafb; padding:12px; border-radius:6px; margin-bottom:12px; border-left: 3px solid #667eea;">
                  <p style="margin:0 0 4px 0;"><strong>${notif.employeeName}</strong> - ${notif.trainingName}</p>
                  <p style="margin:0; font-size:13px; color:#4b5563;">"${notif.comments.substring(0, 300)}${notif.comments.length > 300 ? '...' : ''}"</p>
                </div>
              `).join("")}
            </div>
          </details>
        ` : ''}

        <div style="background:#e8f4fd; padding:16px; border-radius:8px; margin:20px 0; border-left: 4px solid #667eea;">
          <p style="margin:0 0 8px 0; font-weight:600;">📈 Quick Stats:</p>
          <ul style="margin:0; padding-left:20px;">
            <li>Total Submissions: ${notifications.length}</li>
            <li>New Submissions: ${notifications.filter(n => !n.isUpdate).length}</li>
            <li>Updated Submissions: ${notifications.filter(n => n.isUpdate).length}</li>
            <li>Average Rating: ${(notifications.filter(n => n.rating).reduce((sum, n) => sum + n.rating, 0) / (notifications.filter(n => n.rating).length || 1)).toFixed(1)}/5</li>
            <li>Trainings: ${Object.keys(trainingGroups).join(', ')}</li>
          </ul>
        </div>

        <hr style="margin:24px 0; border:none; border-top:1px solid #e5e7eb;" />

        <p style="font-size:12px; color:#9ca3af; margin-top:16px; margin-bottom:0; text-align:center;">
          ⚡ This is an automated notification from HR Training Management System<br/>
          You received this because you created the training program.
        </p>

      </div>
    </body>
    </html>
  `;

  return await sendEmail(creatorEmail, subject, html);
};
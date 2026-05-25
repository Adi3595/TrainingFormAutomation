require("dotenv").config();
const nodemailer = require("nodemailer");
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
});

transporter.verify((err) => {
  if (err) {
    console.log("❌ SMTP failed:", err.message);
  } else {
    console.log("✅ SMTP ready");
  }
});

async function sendTest() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // send to yourself
      subject: "TEST EMAIL",
      text: "If you got this, SMTP works 🎉"
    });

    console.log("✅ Email sent:", info.messageId);
  } catch (err) {
    console.error("❌ Send failed:", err.message);
  }
}

sendTest();
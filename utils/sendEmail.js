const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("\n EMAIL CREDENTIALS NOT CONFIGURED");
      console.log("To:", to);
      console.log("Subject:", subject);

      const linkMatch = html.match(/href="([^"]+)"/);
      if (linkMatch) {
        console.log(" Verification/Reset Link:", linkMatch[1]);
      }

      console.log("Please configure EMAIL_USER and EMAIL_PASS in .env");
      console.log("=========================================\n");

      const fs = require("fs");
      const path = require("path");
      const emailLogPath = path.join(__dirname, "../email-logs.json");

      let logs = [];
      if (fs.existsSync(emailLogPath)) {
        try {
          logs = JSON.parse(fs.readFileSync(emailLogPath, "utf8"));
        } catch (e) {
          logs = [];
        }
      }

      const emailLog = {
        to,
        subject,
        timestamp: new Date().toISOString(),
        htmlPreview: html.substring(0, 500) + "...",
        link: linkMatch ? linkMatch[1] : null,
        status: "not_sent_credentials_missing",
      };

      logs.push(emailLog);
      fs.writeFileSync(emailLogPath, JSON.stringify(logs, null, 2));

      return true;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Our Local Market" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent successfully to: ${to}`);

    const fs = require("fs");
    const path = require("path");
    const emailLogPath = path.join(__dirname, "../email-logs.json");

    let logs = [];
    if (fs.existsSync(emailLogPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(emailLogPath, "utf8"));
      } catch (e) {
        logs = [];
      }
    }

    const emailLog = {
      to,
      subject,
      timestamp: new Date().toISOString(),
      status: "sent",
    };

    logs.push(emailLog);
    fs.writeFileSync(emailLogPath, JSON.stringify(logs, null, 2));

    return true;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);

    const fs = require("fs");
    const path = require("path");
    const emailLogPath = path.join(__dirname, "../email-logs.json");

    let logs = [];
    if (fs.existsSync(emailLogPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(emailLogPath, "utf8"));
      } catch (e) {
        logs = [];
      }
    }

    const emailLog = {
      to,
      subject,
      timestamp: new Date().toISOString(),
      status: "failed",
      error: error.message,
    };

    logs.push(emailLog);
    fs.writeFileSync(emailLogPath, JSON.stringify(logs, null, 2));

    return true;
  }
};

module.exports = sendEmail;

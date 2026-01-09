const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

exports.register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      username,
      phone,
      password,
      userType,
      address,
      city,
      farmName,
      farmLocation,
    } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      fullName,
      email,
      username: username || email.split("@")[0],
      phone,
      password: hashedPassword,
      userType,
      address,
      city,
      farmName,
      farmLocation,
      verificationToken,
      verificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000,
    });

    const verifyLink = `http://localhost:5000/api/auth/verify?token=${verificationToken}`;
    try {
      await sendEmail({
        to: email,
        subject: "Verify your email - Our Local Market",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(to right, #2f8f44, #3fae55); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🌾 Our Local Market</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Welcome to Our Local Market, ${fullName}!</h2>
              <p>Thank you for registering. Please verify your email address to complete your registration:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyLink}" 
                   style="display: inline-block; padding: 12px 30px; background: #2f8f44; color: white; 
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #777;">
                Having trouble? Copy and paste this link in your browser:<br>
                ${verifyLink}
              </p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      verificationLink: verifyLink,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during registration" });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification Failed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #f44336;">Invalid Verification Link</h1>
            <p>The verification link is invalid or expired.</p>
            <a href="/" style="color: #2f8f44;">Return to Home</a>
          </body>
        </html>
      `);
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send(`
        <html>
          <head><title>Email Verification Failed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #f44336;">Verification Failed</h1>
            <p>The verification link has expired or is invalid.</p>
            <p>Please request a new verification email.</p>
            <a href="/" style="color: #2f8f44;">Return to Home</a>
          </body>
        </html>
      `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    res.send(`
      <html>
        <head>
          <title>Email Verified</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
            .success-box { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); display: inline-block; }
            .checkmark { color: #4CAF50; font-size: 80px; margin-bottom: 20px; }
            .btn { display: inline-block; padding: 12px 30px; background: #2f8f44; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="success-box">
            <div class="checkmark">✓</div>
            <h1>Email Verified Successfully!</h1>
            <p>Welcome to Our Local Market, ${user.fullName}!</p>
            <p>Your email has been verified. You can now log in to your account.</p>
            <a href="/" class="btn">Go to Homepage</a>
            <a href="/login.html" class="btn" style="background: #2196F3;">Login Now</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).send(`
      <html>
        <head><title>Server Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #f44336;">Server Error</h1>
          <p>Something went wrong. Please try again later.</p>
          <a href="/" style="color: #2f8f44;">Return to Home</a>
        </body>
      </html>
    `);
  }
};

exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email/username and password",
      });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        needsVerification: true,
        message:
          "Please verify your email first. Check your inbox for verification link.",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        userType: user.userType,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        phone: user.phone,
        address: user.address,
        city: user.city,
        farmName: user.farmName,
        farmLocation: user.farmLocation,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, a reset link has been sent",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Store hashed token and expiry
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const resetUrl = `http://localhost:5000/api/auth/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset Request - Our Local Market",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(to right, #2f8f44, #3fae55); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🌾 Password Reset</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Hello ${user.fullName},</h2>
              <p>You requested to reset your password. Click the button below to reset it:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="display: inline-block; padding: 12px 30px; background: #2f8f44; color: white; 
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p>This link will expire in 30 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="font-size: 12px; color: #777;">
                Having trouble? Copy and paste this link in your browser:<br>
                <a href="${resetUrl}">${resetUrl}</a>
              </p>
            </div>
          </div>
        `,
      });

      res.json({
        success: true,
        message: "Password reset link sent to your email",
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);

      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again.",
      });
    }
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
exports.resetPasswordPage = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Reset Password</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .form-container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
              button { background-color: #4CAF50; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; }
              button:hover { background-color: #45a049; }
              .error { color: red; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="form-container">
              <h2 style="color: #f44336;">Invalid Reset Link</h2>
              <p>The password reset link is invalid.</p>
              <a href="/forgot-password.html" style="color: #2f8f44;">Request New Reset Link</a>
            </div>
          </body>
        </html>
      `);
    }

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send(`
        <html>
          <head>
            <title>Reset Password</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .form-container { max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <div class="form-container">
              <h2 style="color: #f44336;">Invalid or Expired Link</h2>
              <p>The password reset link has expired or is invalid.</p>
              <a href="/forgot-password.html" style="color: #2f8f44;">Request New Reset Link</a>
            </div>
          </body>
        </html>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 20px;
          }
          .form-container {
            max-width: 400px;
            width: 100%;
            padding: 40px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          h2 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            color: #2f8f44;
          }
          input {
            width: 100%;
            padding: 12px 15px;
            margin: 10px 0;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            box-sizing: border-box;
            font-size: 16px;
            transition: border 0.3s;
          }
          input:focus {
            outline: none;
            border-color: #2f8f44;
          }
          button {
            width: 100%;
            background: linear-gradient(to right, #2f8f44, #3fae55);
            color: white;
            padding: 14px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
            transition: transform 0.2s;
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(47, 143, 68, 0.3);
          }
          .message {
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
            text-align: center;
            display: none;
          }
          .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
          .back-link {
            text-align: center;
            margin-top: 20px;
            display: block;
            color: #666;
            text-decoration: none;
          }
          .back-link:hover {
            color: #2f8f44;
          }
          .logo {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            color: #2f8f44;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="form-container">
          <div class="logo">🌾 Our Local Market</div>
          <h2>Reset Your Password</h2>
          <div id="message" class="message"></div>
          <form id="resetForm">
            <input type="hidden" id="token" value="${token}" />
            <input type="password" id="newPassword" placeholder="New Password" required />
            <input type="password" id="confirmPassword" placeholder="Confirm Password" required />
            <button type="submit">Reset Password</button>
          </form>
          <a href="/" class="back-link">Back to Login</a>
        </div>

        <script>
          document.getElementById('resetForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = document.getElementById('token').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const messageDiv = document.getElementById('message');
            
            // Clear previous messages
            messageDiv.style.display = 'none';
            messageDiv.className = 'message';
            
            // Validation
            if (newPassword.length < 6) {
              showMessage('Password must be at least 6 characters long', 'error');
              return;
            }
            
            if (newPassword !== confirmPassword) {
              showMessage('Passwords do not match', 'error');
              return;
            }
            
            try {
              const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token: token,
                  newPassword: newPassword
                })
              });
              
              const data = await response.json();
              
              if (response.ok) {
                // Success
                document.getElementById('resetForm').style.display = 'none';
                showMessage(data.message, 'success');
                messageDiv.innerHTML += '<br><a href="/">Go to Login</a>';
              } else {
                showMessage(data.message || 'Password reset failed', 'error');
              }
            } catch (error) {
              console.error('Error:', error);
              showMessage('An error occurred. Please try again.', 'error');
            }
          });
          
          function showMessage(text, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.textContent = text;
            messageDiv.className = type + ' message';
            messageDiv.style.display = 'block';
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Reset password page error:", error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #f44336;">Server Error</h2>
          <p>Something went wrong. Please try again.</p>
        </body>
      </html>
    `);
  }
};
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      "fullName",
      "phone",
      "address",
      "city",
      "farmName",
      "farmLocation",
    ];

    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        req.user[key] = updates[key];
      }
    });

    await req.user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: req.user,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save();

    const verifyLink = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/verify.html?token=${verificationToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Resend: Verify your email - Our Local Market",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(to right, #2f8f44, #3fae55); padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">🌾 Verify Your Email</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Hello ${user.fullName},</h2>
              <p>Here's your verification link:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyLink}" 
                   style="display: inline-block; padding: 12px 30px; background: #2f8f44; color: white; 
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verify Email
                </a>
              </div>
              <p>This link will expire in 24 hours.</p>
            </div>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.json({
      success: true,
      message: "Verification email resent successfully",
      verificationLink: verifyLink,
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

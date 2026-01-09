const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: String,
    email: { type: String, unique: true },
    username: String,
    phone: String,
    password: String,
    userType: { type: String, enum: ["buyer", "farmer"] },

    address: String,
    city: String,

    farmName: String,
    farmLocation: String,

    isVerified: { type: Boolean, default: false },

    verificationToken: String,
    verificationTokenExpire: Date, // ✅ ADDED (REAL verification)

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

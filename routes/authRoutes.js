const router = require("express").Router();
const auth = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", auth.register);
router.get("/verify", auth.verifyEmail);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-password", auth.resetPassword);

router.get("/reset-password", auth.resetPasswordPage);

router.post("/resend-verification", auth.resendVerification);

router.get("/profile", protect, auth.getProfile);
router.put("/profile", protect, auth.updateProfile);

module.exports = router;

const express = require("express");
const router = express.Router();

router.post("/pay", (req, res) => {
  const { amount, method } = req.body;

  if (!amount || !method) {
    return res.status(400).json({
      message: "Payment amount and method are required",
    });
  }

  res.status(200).json({
    success: true,
    message: "Payment processed successfully (simulation)",
    transactionId: Date.now(),
  });
});

module.exports = router;

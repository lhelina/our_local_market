const router = require("express").Router();
const orderController = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", authorize("buyer"), orderController.createOrder);
router.get("/my-orders", authorize("buyer"), orderController.getBuyerOrders);

router.get(
  "/farmer/orders",
  authorize("farmer"),
  orderController.getFarmerOrders
);
router.get(
  "/farmer/stats",
  authorize("farmer"),
  orderController.getFarmerOrderStats
);

router.get("/admin/all", authorize("admin"), orderController.getAllOrders);
router.get("/admin/stats", authorize("admin"), orderController.getAdminStats);

router.get("/:id", orderController.getOrder);
router.put("/:id/status", orderController.updateOrderStatus);
router.put("/:id/payment-status", orderController.updatePaymentStatus);

module.exports = router;

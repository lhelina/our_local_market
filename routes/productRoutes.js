const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

const productController = require("../controllers/productController");

const {
  protect,
  farmerOnly,
  adminOnly,
} = require("../middleware/authMiddleware");

const multer = require("multer");

const uploadsDir = path.join(__dirname, "../uploads/products");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Keep original extension
    const ext = path.extname(file.originalname);
    cb(null, "product-" + uniqueSuffix + ext);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (
    !file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)
  ) {
    req.fileValidationError = "Only image files are allowed!";
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: fileFilter,
}).single("image");

const handleUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File size too large. Maximum 5MB allowed.",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message:
            "Unexpected file field. Please use 'image' as the field name for file uploads.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    } else if (err) {
      if (err.message && err.message.includes("Unexpected field")) {
        return res.status(400).json({
          success: false,
          message:
            "Unexpected field in form data. Please ensure the file input field is named 'image'.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Error uploading file",
      });
    }

    console.log("Form fields received:", req.body);
    console.log("File received:", req.file ? req.file.filename : "No file");

    if (req.body.price) req.body.price = parseFloat(req.body.price);
    if (req.body.stock) req.body.stock = parseInt(req.body.stock);

    next();
  });
};
router.get("/", productController.getProducts);
router.get("/search/suggestions", productController.getSearchSuggestions);
router.get("/:id", productController.getProduct);

router.post(
  "/",
  protect,
  farmerOnly,
  handleUpload,
  productController.createProduct
);

router.put(
  "/:id",
  protect,
  farmerOnly,
  handleUpload,
  productController.updateProduct
);

router.delete("/:id", protect, farmerOnly, productController.deleteProduct);

router.get(
  "/farmer/my-products",
  protect,
  farmerOnly,
  productController.getFarmerProducts
);

router.get(
  "/farmer/stats",
  protect,
  farmerOnly,
  productController.getFarmerStats
);

router.get(
  "/farmer/feedback",
  protect,
  farmerOnly,
  productController.getFarmerFeedback
);

router.get(
  "/admin/all",
  protect,
  adminOnly,
  productController.getAllProductsAdmin
);

router.put(
  "/admin/:id/status",
  protect,
  adminOnly,
  productController.updateProductStatus
);

router.delete(
  "/admin/:id",
  protect,
  adminOnly,
  productController.deleteProduct
);

router.get("/health/check", (req, res) => {
  res.json({
    success: true,
    message: "Product routes are working",
    timestamp: new Date().toISOString(),
    uploadsDirectory: uploadsDir,
    uploadsExists: fs.existsSync(uploadsDir),
  });
});

router.post("/test/upload", protect, farmerOnly, handleUpload, (req, res) => {
  res.json({
    success: true,
    message: "Upload test successful",
    file: req.file
      ? {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
        }
      : "No file uploaded",
    body: req.body,
  });
});

module.exports = router;

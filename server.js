require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
  ],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/localmarket")
  .then(() => console.log(" MongoDB Connected"))
  .catch((err) => console.log(" MongoDB Error:", err.message));

// Import routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working!" });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
  });
});

const frontendPath = path.resolve(__dirname, "..", "frontend");
console.log("Frontend path:", frontendPath);

if (fs.existsSync(frontendPath)) {
  console.log(" Frontend directory found");

  app.use(express.static(frontendPath));

  const htmlFiles = [
    "index.html",
    "farmer-dashboard.html",
    "buyer-dashboard.html",
    "cart.html",
    "checkout.html",
    "success.html",
    "verify.html",
  ];

  htmlFiles.forEach((file) => {
    const filePath = path.join(frontendPath, file);
    if (fs.existsSync(filePath)) {
      const routeName =
        file === "index.html" ? "/" : `/${file.replace(".html", "")}`;
      app.get(routeName, (req, res) => {
        res.sendFile(filePath);
      });
    }
  });

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res
        .status(404)
        .json({ success: false, message: "API endpoint not found" });
    }

    const requestedPath = req.path === "/" ? "index.html" : req.path;
    const fullPath = path.join(frontendPath, requestedPath);

    if (fs.existsSync(fullPath) && !fs.lstatSync(fullPath).isDirectory()) {
      return res.sendFile(fullPath);
    }

    const htmlPath = fullPath + ".html";
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    }

    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  console.log("  Frontend directory not found at:", frontendPath);
  console.log(" Current directory:", __dirname);

  app.get("/", (req, res) => {
    res.json({
      message: "Backend API is running",
      note:
        "Frontend not found. Please check if frontend directory exists at: " +
        frontendPath,
      api_endpoints: [
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/verify",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/products",
        "/api/orders",
        "/api/health",
      ],
    });
  });
}

app.use((err, req, res, next) => {
  console.error(" Server Error:", err.stack);
  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong!"
        : err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` API Base URL: http://localhost:${PORT}/api`);
  console.log(` Frontend URL: http://localhost:${PORT}`);
  console.log(` Email configured: ${process.env.EMAIL_USER ? " Yes" : " No"}`);
  console.log(` Frontend path: ${frontendPath}`);
  console.log("=".repeat(50));
});

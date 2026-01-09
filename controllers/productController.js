const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const uploadsDir = path.join(__dirname, "../uploads/products");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const handleImageUpload = (req, product = null) => {
  let imagePath = product ? product.image : "";

  if (req.file) {
    imagePath = `/uploads/products/${req.file.filename}`;

    if (
      product &&
      product.image &&
      product.image.startsWith("/uploads/products/")
    ) {
      const oldImagePath = path.join(__dirname, "..", product.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
  } else if (
    req.body.imageData &&
    req.body.imageData.startsWith("data:image")
  ) {
    const matches = req.body.imageData.match(
      /^data:image\/([A-Za-z-+/]+);base64,(.+)$/
    );

    if (matches && matches.length === 3) {
      const imageType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, "base64");

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const filename = `product-${uniqueSuffix}.${
        imageType === "jpeg" ? "jpg" : imageType
      }`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);
      imagePath = `/uploads/products/${filename}`;

      if (
        product &&
        product.image &&
        product.image.startsWith("/uploads/products/")
      ) {
        const oldImagePath = path.join(__dirname, "..", product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }
  } else if (!product && !imagePath) {
    const DEFAULT_IMAGES = {
      vegetable:
        "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      fruit:
        "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      grain:
        "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      spice:
        "https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      dairy:
        "https://images.unsplash.com/photo-1550583724-b2692b85b150?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      meat: "https://images.unsplash.com/photo-1604503468502-4b81e56c5ebb?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      poultry:
        "https://images.unsplash.com/photo-1604503468502-4b81e56c5ebb?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
      other:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
    };

    const category = req.body.category || "other";
    imagePath = DEFAULT_IMAGES[category] || DEFAULT_IMAGES.other;
  }

  return imagePath;
};

exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      farmer,
      search,
      city,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 12,
    } = req.query;

    let filter = { isActive: true };

    if (category) {
      if (category === "all") {
      } else if (category.includes(",")) {
        filter.category = { $in: category.split(",") };
      } else {
        filter.category = category;
      }
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (farmer) filter.farmer = farmer;

    if (city) {
      filter["farmer.city"] = { $regex: city, $options: "i" };
    }

    const sort = {};
    if (sortBy === "price") sort.price = sortOrder === "asc" ? 1 : -1;
    else if (sortBy === "name") sort.name = sortOrder === "asc" ? 1 : -1;
    else if (sortBy === "stock") sort.stock = sortOrder === "asc" ? 1 : -1;
    else sort.createdAt = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate(
        "farmer",
        "fullName email phone farmName farmLocation city address"
      )
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    const categoryCounts = await Product.aggregate([
      { $match: { ...filter, category: { $exists: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const priceStats = await Product.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
          avgPrice: { $avg: "$price" },
        },
      },
    ]);

    const cityCounts = await Product.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: "users",
          localField: "farmer",
          foreignField: "_id",
          as: "farmerData",
        },
      },
      { $unwind: "$farmerData" },
      {
        $group: {
          _id: "$farmerData.city",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $match: { _id: { $ne: null } } },
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products,
      filters: {
        categories: categoryCounts,
        priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
        cities: cityCounts,
      },
    });
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "farmer",
      "fullName email phone farmName farmLocation city address rating"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const reviews = await Review.find({ product: product._id })
      .populate("user", "fullName")
      .sort({ createdAt: -1 })
      .limit(10);

    const ratingStats = await Review.aggregate([
      { $match: { product: product._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratingDistribution: {
            $push: "$rating",
          },
        },
      },
    ]);

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .populate("farmer", "fullName city")
      .limit(4);

    res.status(200).json({
      success: true,
      product: {
        ...product.toObject(),
        ratingStats: ratingStats[0] || { averageRating: 0, totalReviews: 0 },
        reviews,
        relatedProducts,
      },
    });
  } catch (err) {
    console.error("Get product error:", err);

    if (err.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getSearchSuggestions = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    const productSuggestions = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
      isActive: true,
    })
      .select("name category price unit image")
      .limit(5);

    const ProductModel = mongoose.model("Product");
    const farmerSuggestions = await ProductModel.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "farmer",
          foreignField: "_id",
          as: "farmerData",
        },
      },
      { $unwind: "$farmerData" },
      {
        $match: {
          $or: [
            { "farmerData.fullName": { $regex: query, $options: "i" } },
            { "farmerData.city": { $regex: query, $options: "i" } },
            { "farmerData.farmName": { $regex: query, $options: "i" } },
          ],
        },
      },
      {
        $group: {
          _id: "$farmerData._id",
          farmerName: { $first: "$farmerData.fullName" },
          farmName: { $first: "$farmerData.farmName" },
          city: { $first: "$farmerData.city" },
          productCount: { $sum: 1 },
        },
      },
      { $limit: 5 },
    ]);

    const suggestions = [
      ...productSuggestions.map((p) => ({
        type: "product",
        name: p.name,
        category: p.category,
        price: p.price,
        id: p._id,
      })),
      ...farmerSuggestions.map((f) => ({
        type: "farmer",
        name: f.farmerName,
        farm: f.farmName,
        city: f.city,
        id: f._id,
      })),
    ];

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 8),
    });
  } catch (err) {
    console.error("Get suggestions error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    if (req.user.userType !== "farmer") {
      return res.status(403).json({
        success: false,
        message: "Only farmers can create products",
      });
    }

    const { name, price, unit, category, description, stock } = req.body;

    const existingProduct = await Product.findOne({
      name: name.trim(),
      farmer: req.user._id,
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "You already have a product with this name",
      });
    }

    const imagePath = handleImageUpload(req);

    const product = await Product.create({
      name: name.trim(),
      price: parseFloat(price),
      unit,
      category,
      description: description ? description.trim() : "",
      stock: parseInt(stock),
      image: imagePath,
      farmer: req.user.id,
      isActive: true,
    });

    await product.populate("farmer", "fullName farmName city");

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    console.error("Create product error:", err);

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};
exports.updateProduct = async (req, res) => {
  try {
    console.log("=== UPDATE PRODUCT REQUEST ===");
    console.log("Headers:", req.headers);
    console.log("User:", req.user ? req.user._id : "No user");
    console.log("File received:", req.file ? req.file.filename : "No file");
    console.log("Body (raw):", req.body);

    // Log all body fields
    for (let key in req.body) {
      console.log(`Body field [${key}]:`, req.body[key]);
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (req.user.userType !== "farmer") {
      return res.status(403).json({
        success: false,
        message: "Only farmers can update products",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(id).select("+farmer");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.farmer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You do not own this product",
      });
    }

    const { name, price, unit, category, description, stock } = req.body;

    console.log("Extracted fields:", {
      name,
      price,
      unit,
      category,
      description: description ? "Present" : "Missing",
      stock,
    });

    let imagePath = product.image;

    if (req.file) {
      console.log("New file uploaded:", req.file.filename);
      imagePath = `/uploads/products/${req.file.filename}`;

      if (product.image && product.image.startsWith("/uploads/products/")) {
        const oldImagePath = path.join(__dirname, "..", product.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    } else if (req.body.imageUrl && req.body.imageUrl.trim() !== "") {
      console.log("Using image URL:", req.body.imageUrl);
      imagePath = req.body.imageUrl.trim();
    }

    if (name) product.name = name.trim();
    if (price) product.price = parseFloat(price);
    if (unit) product.unit = unit;
    if (category) product.category = category;
    if (description !== undefined) product.description = description.trim();
    if (stock !== undefined) product.stock = parseInt(stock);

    if (imagePath !== product.image) {
      product.image = imagePath;
    }

    console.log("Product update data:", {
      name: product.name,
      price: product.price,
      stock: product.stock,
      image: product.image,
    });

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    console.error("Update product error:", err);
    console.error("Error stack:", err.stack);

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
        errors: err.errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while updating product",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};
exports.deleteProduct = async (req, res) => {
  try {
    console.log("=== DELETE PRODUCT (HARD DELETE) ===");
    console.log("Product ID:", req.params.id);
    console.log("User:", {
      _id: req.user._id,
      userType: req.user.userType,
    });

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const productFarmerId = product.farmer.toString();
    const userId = req.user._id.toString();

    console.log("Comparing:");
    console.log("Product Farmer ID:", productFarmerId);
    console.log("User ID:", userId);
    console.log("Match?", productFarmerId === userId);

    if (productFarmerId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this product",
      });
    }

    await product.deleteOne();

    if (product.image && product.image.startsWith("/uploads/products/")) {
      const imagePath = path.join(__dirname, "..", product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.status(200).json({
      success: true,
      message: "Product permanently deleted",
      deletedProductId: product._id,
    });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

exports.getFarmerProducts = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;

    let filter = { farmer: req.user._id };

    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;

    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    const stats = await Product.aggregate([
      { $match: { farmer: req.user._id } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
          outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products,
      stats: stats[0] || {
        totalProducts: 0,
        activeProducts: 0,
        totalStock: 0,
        totalValue: 0,
        outOfStock: 0,
      },
    });
  } catch (err) {
    console.error("Get farmer products error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getFarmerStats = async (req, res) => {
  try {
    const productStats = await Product.aggregate([
      { $match: { farmer: req.user._id } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
          outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
          lowStock: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", 10] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const categoryStats = await Product.aggregate([
      { $match: { farmer: req.user.id, isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$price", "$stock"] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const orders = await Order.find({
      "items.productDetails.farmer": req.user.id,
    });

    let salesStats = {
      totalOrders: 0,
      totalSales: 0,
      pendingOrders: 0,
      processingOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      monthlySales: {},
    };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    orders.forEach((order) => {
      const farmerItems = order.items.filter(
        (item) =>
          item.productDetails.farmer &&
          item.productDetails.farmer.toString() === req.user.id.toString()
      );

      if (farmerItems.length > 0) {
        salesStats.totalOrders++;
        const orderValue = farmerItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        salesStats.totalSales += orderValue;

        salesStats[`${order.status}Orders`]++;

        const monthYear = order.createdAt.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        if (order.createdAt >= sixMonthsAgo) {
          salesStats.monthlySales[monthYear] =
            (salesStats.monthlySales[monthYear] || 0) + orderValue;
        }
      }
    });

    const monthlySalesArray = Object.entries(salesStats.monthlySales)
      .map(([month, sales]) => ({
        month,
        sales: parseFloat(sales.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));

    res.status(200).json({
      success: true,
      stats: {
        products: productStats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          totalStock: 0,
          totalValue: 0,
          outOfStock: 0,
          lowStock: 0,
        },
        categories: categoryStats,
        sales: {
          ...salesStats,
          totalSales: parseFloat(salesStats.totalSales.toFixed(2)),
          averageOrderValue:
            salesStats.totalOrders > 0
              ? parseFloat(
                  (salesStats.totalSales / salesStats.totalOrders).toFixed(2)
                )
              : 0,
          monthlySales: monthlySalesArray,
          orderCompletionRate:
            salesStats.totalOrders > 0
              ? parseFloat(
                  (
                    (salesStats.deliveredOrders / salesStats.totalOrders) *
                    100
                  ).toFixed(2)
                )
              : 0,
        },
      },
    });
  } catch (err) {
    console.error("Get farmer stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getFarmerFeedback = async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.user.id });
    const productIds = products.map((p) => p._id);

    const reviews = await Review.find({ product: { $in: productIds } })
      .populate("user", "fullName")
      .populate("product", "name")
      .sort({ createdAt: -1 })
      .limit(20);

    const productRatings = await Review.aggregate([
      { $match: { product: { $in: productIds } } },
      {
        $group: {
          _id: "$product",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    const overallRating =
      productRatings.length > 0
        ? productRatings.reduce(
            (sum, rating) => sum + rating.averageRating,
            0
          ) / productRatings.length
        : 0;

    res.status(200).json({
      success: true,
      reviews,
      productRatings,
      overallRating: parseFloat(overallRating.toFixed(1)),
      totalReviews: reviews.length,
    });
  } catch (err) {
    console.error("Get farmer feedback error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllProductsAdmin = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can access this resource",
      });
    }

    const {
      status,
      farmer,
      category,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    let filter = {};

    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;

    if (farmer) filter.farmer = farmer;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("farmer", "fullName email phone farmName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      products,
    });
  } catch (err) {
    console.error("Get all products admin error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateProductStatus = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can update product status",
      });
    }

    const { status, reason } = req.body;
    const validStatuses = ["approved", "rejected", "suspended"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.adminStatus = status;
    product.statusReason = reason;
    product.isActive = status === "approved";
    product.statusUpdatedAt = new Date();
    product.statusUpdatedBy = req.user.id;

    await product.save();

    res.status(200).json({
      success: true,
      message: `Product ${status} successfully`,
      product,
    });
  } catch (err) {
    console.error("Update product status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteProductAdmin = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    await product.deleteOne();

    if (product.image && product.image.startsWith("/uploads/products/")) {
      const imagePath = path.join(__dirname, "..", product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.status(200).json({
      success: true,
      message: "Product permanently deleted by admin",
      deletedProductId: product._id,
    });
  } catch (err) {
    console.error("Admin delete product error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

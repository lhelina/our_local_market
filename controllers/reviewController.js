const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

exports.addReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment, images } = req.body;

    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        buyer: req.user.id,
        status: "delivered",
      });

      if (!order) {
        return res.status(400).json({
          success: false,
          message: "You can only review products from delivered orders",
        });
      }

      const hasProduct = order.items.some(
        (item) => item.product.toString() === productId.toString()
      );

      if (!hasProduct) {
        return res.status(400).json({
          success: false,
          message: "This order does not contain the specified product",
        });
      }
    }

    const existingReview = await Review.findOne({
      product: productId,
      user: req.user.id,
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    const review = await Review.create({
      product: productId,
      user: req.user.id,
      order: orderId,
      rating,
      comment: comment ? comment.trim() : "",
      images: images || [],
      isVerifiedPurchase: !!orderId,
    });

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      review,
    });
  } catch (err) {
    console.error("Add review error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = "helpful", rating } = req.query;
    const { productId } = req.params;

    let filter = { product: productId, isActive: true };

    if (rating) filter.rating = parseInt(rating);

    let sort = {};
    if (sortBy === "recent") sort.createdAt = -1;
    else if (sortBy === "helpful") sort.helpfulCount = -1;
    else if (sortBy === "rating") sort.rating = -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(filter)
      .populate("user", "fullName")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    const ratingDistribution = await Review.aggregate([
      { $match: { product: productId, isActive: true } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const verifiedCount = await Review.countDocuments({
      product: productId,
      isActive: true,
      isVerifiedPurchase: true,
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      reviews,
      stats: {
        ratingDistribution,
        verifiedCount,
        verifiedPercentage:
          total > 0 ? Math.round((verifiedCount / total) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("Get product reviews error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this review",
      });
    }

    const { rating, comment, images } = req.body;

    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment.trim();
    if (images !== undefined) review.images = images;

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (err) {
    console.error("Update review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const isOwner = review.user.toString() === req.user.id;
    const isAdmin = req.user.userType === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this review",
      });
    }

    review.isActive = false;
    await review.save();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.helpfulCount += 1;
    await review.save();

    res.status(200).json({
      success: true,
      message: "Marked as helpful",
      helpfulCount: review.helpfulCount,
    });
  } catch (err) {
    console.error("Mark helpful error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.reportReview = async (req, res) => {
  try {
    const { reason } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    review.reportCount += 1;

    if (review.reportCount >= 5) {
      review.isActive = false;
    }

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review reported successfully",
    });
  } catch (err) {
    console.error("Report review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAdminReviews = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can access this resource",
      });
    }

    const { status, reported, product, user, page = 1, limit = 20 } = req.query;

    let filter = {};

    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;

    if (reported === "true") filter.reportCount = { $gt: 0 };

    if (product) filter.product = product;
    if (user) filter.user = user;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find(filter)
      .populate("product", "name")
      .populate("user", "fullName")
      .sort({ reportCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      reviews,
    });
  } catch (err) {
    console.error("Get admin reviews error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [1, "Price must be at least 1"],
    },
    unit: {
      type: String,
      required: [true, "Product unit is required"],
      enum: ["kg", "g", "piece", "bundle", "liter", "dozen", "bag", "box"],
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: [
        "vegetable",
        "fruit",
        "grain",
        "spice",
        "dairy",
        "meat",
        "poultry",
        "other",
      ],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    stock: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Admin moderation fields
    adminStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    statusReason: {
      type: String,
      maxlength: [200, "Reason cannot exceed 200 characters"],
    },
    statusUpdatedAt: Date,
    statusUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Rating fields (cached for performance)
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    // Metadata
    views: {
      type: Number,
      default: 0,
    },
    salesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 1, farmer: 1 }, { unique: true });

productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ farmer: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ name: "text", description: "text", category: "text" });

productSchema.virtual("status").get(function () {
  if (!this.isActive) return "inactive";
  if (this.stock <= 0) return "out-of-stock";
  if (this.stock < 10) return "low-stock";
  return "active";
});

productSchema.virtual("displayPrice").get(function () {
  return `${this.price} ETB/${this.unit}`;
});

productSchema.methods.reduceStock = function (quantity) {
  if (quantity > this.stock) {
    throw new Error("Insufficient stock");
  }
  this.stock -= quantity;
  this.salesCount += quantity;
  return this.save();
};

productSchema.methods.increaseStock = function (quantity) {
  this.stock += quantity;
  return this.save();
};

productSchema.methods.updateRating = async function () {
  const Review = mongoose.model("Review");
  const stats = await Review.aggregate([
    { $match: { product: this._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    this.averageRating = parseFloat(stats[0].averageRating.toFixed(1));
    this.totalReviews = stats[0].totalReviews;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }

  await this.save();

  const User = mongoose.model("User");
  const farmer = await User.findById(this.farmer);
  if (farmer) {
    await farmer.updateRating();
  }
};

productSchema.pre("save", function (next) {
  if (this.description) {
    this.description = this.description.trim();
  }

  if (this.name) {
    this.name = this.name.trim();
  }

  next();
});

module.exports = mongoose.model("Product", productSchema);

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: [500, "Comment cannot exceed 500 characters"],
      trim: true,
    },
    images: [
      {
        type: String,
      },
    ],
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ user: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ helpfulCount: -1 });

reviewSchema.pre("save", async function (next) {
  if (!this.isVerifiedPurchase && this.order) {
    const Order = mongoose.model("Order");
    const order = await Order.findById(this.order);

    if (
      order &&
      order.status === "delivered" &&
      order.buyer.toString() === this.user.toString()
    ) {
      this.isVerifiedPurchase = true;
    }
  }
  next();
});

reviewSchema.post("save", async function () {
  const Product = mongoose.model("Product");
  const product = await Product.findById(this.product);

  if (product) {
    await product.updateRating();
  }
});

reviewSchema.post("remove", async function () {
  const Product = mongoose.model("Product");
  const product = await Product.findById(this.product);

  if (product) {
    await product.updateRating();
  }
});

module.exports = mongoose.model("Review", reviewSchema);

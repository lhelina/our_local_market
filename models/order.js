const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productDetails: {
    name: String,
    price: Number,
    unit: String,
    image: String,
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    farmerName: String,
    farmerCity: String,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    totalPrice: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 50,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    shippingAddress: {
      address: String,
      city: String,
      phone: String,
    },
    paymentMethod: {
      type: String,
      enum: ["cash_on_delivery", "chapa", "telebirr", "bank_transfer"],
      default: "cash_on_delivery",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    transactionId: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    trackingNumber: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    notes: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.virtual("orderNumber").get(function () {
  return `ORD-${this._id.toString().slice(-8).toUpperCase()}`;
});

orderSchema.index({ buyer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "items.productDetails.farmer": 1 });
orderSchema.index({ transactionId: 1 });

orderSchema.pre("save", async function (next) {
  if (this.isModified("items")) {
    const itemsTotal = this.items.reduce(
      (total, item) => total + item.subtotal,
      0
    );
    this.totalPrice = itemsTotal + this.deliveryFee;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);

const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

exports.createOrder = async (req, res) => {
  try {
    if (req.user.userType !== "buyer") {
      return res.status(403).json({
        success: false,
        message: "Only buyers can place orders",
      });
    }

    const { items, shippingAddress, paymentMethod, notes } = req.body;

    const validatedItems = [];
    let totalPrice = 0;
    let deliveryFee = 50;

    for (const item of items) {
      const product = await Product.findById(item.product).populate(
        "farmer",
        "city"
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      const taxRate = 0.15;
      const itemTotal = product.price * item.quantity;
      const itemTax = itemTotal * taxRate;
      const itemPriceWithTax = itemTotal + itemTax;

      validatedItems.push({
        product: product._id,
        productDetails: {
          name: product.name,
          price: product.price,
          unit: product.unit,
          image: product.image,
          farmer: product.farmer._id,
          farmerName: product.farmer.fullName,
          farmerCity: product.farmer.city,
        },
        quantity: item.quantity,
        price: product.price,
        tax: parseFloat(itemTax.toFixed(2)),
        subtotal: parseFloat(itemPriceWithTax.toFixed(2)),
      });

      totalPrice += itemPriceWithTax;
    }

    totalPrice += deliveryFee;

    const transactionId = `TXN-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)
      .toUpperCase()}`;

    const order = await Order.create({
      buyer: req.user.id,
      items: validatedItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
      transactionId,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      deliveryFee,
      taxAmount: parseFloat((totalPrice - deliveryFee) * 0.15).toFixed(2),
      status: "pending",
      notes,
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: {
        ...order.toObject(),
        orderNumber: order.orderNumber,
      },
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getBuyerOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    let filter = { buyer: req.user.id };

    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate("items.productDetails.farmer", "fullName phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      orders,
    });
  } catch (err) {
    console.error("Get buyer orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getFarmerOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    let filter = { "items.productDetails.farmer": req.user.id };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate("buyer", "fullName email phone address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    const farmerOrders = orders
      .map((order) => {
        const farmerItems = order.items.filter(
          (item) =>
            item.productDetails.farmer &&
            item.productDetails.farmer.toString() === req.user.id.toString()
        );

        const farmerTotal = farmerItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        return {
          ...order.toObject(),
          farmerItems,
          farmerTotal,
        };
      })
      .filter((order) => order.farmerItems.length > 0);

    res.status(200).json({
      success: true,
      count: farmerOrders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      orders: farmerOrders,
    });
  } catch (err) {
    console.error("Get farmer orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can view all orders",
      });
    }

    const {
      status,
      paymentStatus,
      buyer,
      farmer,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    let filter = {};

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (buyer) filter.buyer = buyer;

    if (farmer) {
      filter["items.productDetails.farmer"] = farmer;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate("buyer", "fullName email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      orders,
    });
  } catch (err) {
    console.error("Get all orders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer", "fullName phone email address")
      .populate("items.productDetails.farmer", "fullName phone farmName");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const isBuyer = order.buyer._id.toString() === req.user.id;
    const isFarmer = order.items.some(
      (item) =>
        item.productDetails.farmer &&
        item.productDetails.farmer.toString() === req.user.id.toString()
    );
    const isAdmin = req.user.userType === "admin";

    if (!isBuyer && !isFarmer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Get order error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const isBuyer = order.buyer.toString() === req.user.id;
    const isFarmer = order.items.some(
      (item) =>
        item.productDetails.farmer &&
        item.productDetails.farmer.toString() === req.user.id.toString()
    );
    const isAdmin = req.user.userType === "admin";

    if (status === "cancelled" && order.status === "pending") {
      if (!isBuyer && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only buyer can cancel pending orders",
        });
      }
    } else if (["processing", "shipped", "delivered"].includes(status)) {
      if (!isFarmer && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only farmer or admin can update to this status",
        });
      }
    }

    if (status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    order.status = status;

    if (status === "shipped") {
      order.shippedAt = new Date();
      order.trackingNumber = `TRK-${Date.now().toString(36).toUpperCase()}`;
    }

    if (status === "delivered") {
      order.deliveredAt = new Date();
    }

    if (status === "cancelled") {
      order.cancelledAt = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (err) {
    console.error("Update order status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    const validStatuses = ["pending", "paid", "failed"];

    if (!validStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can update payment status",
      });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      order,
    });
  } catch (err) {
    console.error("Update payment status error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getFarmerOrderStats = async (req, res) => {
  try {
    const orders = await Order.find({
      "items.productDetails.farmer": req.user.id,
    });

    let stats = {
      totalOrders: 0,
      totalSales: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      monthlySales: {},
      topProducts: {},
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
        stats.totalOrders++;
        const orderValue = farmerItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        stats.totalSales += orderValue;

        stats[`${order.status}Orders`]++;

        const monthYear = order.createdAt.toLocaleString("default", {
          month: "short",
          year: "numeric",
        });
        if (order.createdAt >= sixMonthsAgo) {
          stats.monthlySales[monthYear] =
            (stats.monthlySales[monthYear] || 0) + orderValue;
        }

        farmerItems.forEach((item) => {
          const productName = item.productDetails.name;
          stats.topProducts[productName] = {
            quantity:
              (stats.topProducts[productName]?.quantity || 0) + item.quantity,
            revenue:
              (stats.topProducts[productName]?.revenue || 0) +
              item.price * item.quantity,
          };
        });
      }
    });

    const monthlySalesArray = Object.entries(stats.monthlySales)
      .map(([month, sales]) => ({
        month,
        sales: parseFloat(sales.toFixed(2)),
      }))
      .sort((a, b) => new Date(a.month) - new Date(b.month));

    const topProductsArray = Object.entries(stats.topProducts)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: parseFloat(data.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      stats: {
        ...stats,
        totalSales: parseFloat(stats.totalSales.toFixed(2)),
        averageOrderValue:
          stats.totalOrders > 0
            ? parseFloat((stats.totalSales / stats.totalOrders).toFixed(2))
            : 0,
        monthlySales: monthlySalesArray,
        topProducts: topProductsArray,
        orderCompletionRate:
          stats.totalOrders > 0
            ? parseFloat(
                ((stats.deliveredOrders / stats.totalOrders) * 100).toFixed(2)
              )
            : 0,
      },
    });
  } catch (err) {
    console.error("Get farmer order stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can view admin stats",
      });
    }

    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalFarmers = await User.countDocuments({ userType: "farmer" });
    const totalBuyers = await User.countDocuments({ userType: "buyer" });
    const totalProducts = await Product.countDocuments();

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("buyer", "fullName");

    const orders = await Order.find({ paymentStatus: "paid" });
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const statusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const paymentBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$paymentStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totals: {
          orders: totalOrders,
          users: totalUsers,
          farmers: totalFarmers,
          buyers: totalBuyers,
          products: totalProducts,
          revenue: parseFloat(totalRevenue.toFixed(2)),
        },
        averages: {
          orderValue: parseFloat(averageOrderValue.toFixed(2)),
        },
        breakdowns: {
          orderStatus: statusBreakdown,
          paymentStatus: paymentBreakdown,
        },
        recentOrders,
      },
    });
  } catch (err) {
    console.error("Get admin stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

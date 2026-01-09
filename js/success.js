document.addEventListener("DOMContentLoaded", function () {
  loadOrderDetails();
  updateCartCount();
  setupPrintReceipt();
});

function loadOrderDetails() {
  const order = JSON.parse(localStorage.getItem("currentOrder")) || {};
  const orderDetails = document.getElementById("orderDetails");

  if (!order.orderId) {
    orderDetails.innerHTML = `
            <div class="no-order">
                <p>No order found. Start shopping!</p>
                <a href="index.html" class="btn-primary">Shop Now</a>
            </div>
        `;
    return;
  }

  const cart = order.cart || [];
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal + 50;

  let itemsHtml = "";
  if (cart.length > 0) {
    itemsHtml = cart
      .map(
        (item) => `
            <div class="order-item">
                <span>${item.name} (${item.quantity} ${item.unit})</span>
                <span>${item.price * item.quantity} ETB</span>
            </div>
        `
      )
      .join("");
  }

  orderDetails.innerHTML = `
        <div class="detail-group">
            <h4>Order Information</h4>
            <div class="detail-row">
                <span>Order ID:</span>
                <strong>${order.orderId}</strong>
            </div>
            <div class="detail-row">
                <span>Date:</span>
                <span>${new Date(order.timestamp).toLocaleDateString(
                  "en-ET"
                )}</span>
            </div>
            <div class="detail-row">
                <span>Status:</span>
                <span class="status-badge ${
                  order.status
                }">${order.status.toUpperCase()}</span>
            </div>
            <div class="detail-row">
                <span>Payment Method:</span>
                <span>${
                  order.paymentMethod === "cash"
                    ? "Cash on Delivery"
                    : "Chapa Payment"
                }</span>
            </div>
        </div>
        
        <div class="detail-group">
            <h4>Delivery Details</h4>
            <div class="detail-row">
                <span>Name:</span>
                <span>${order.fullName || "N/A"}</span>
            </div>
            <div class="detail-row">
                <span>Phone:</span>
                <span>${order.phone || "N/A"}</span>
            </div>
            <div class="detail-row">
                <span>Address:</span>
                <span>${order.address || "N/A"}, ${order.subcity || ""}, ${
    order.city || "Addis Ababa"
  }</span>
            </div>
        </div>
        
        <div class="detail-group">
            <h4>Order Summary</h4>
            ${itemsHtml}
            <div class="detail-row">
                <span>Subtotal:</span>
                <span>${subtotal} ETB</span>
            </div>
            <div class="detail-row">
                <span>Delivery Fee:</span>
                <span>50 ETB</span>
            </div>
            <div class="detail-row total-row">
                <span>Total Amount:</span>
                <strong>${total} ETB</strong>
            </div>
        </div>
    `;
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountElements = document.querySelectorAll("#cartCount");
  cartCountElements.forEach((el) => (el.textContent = totalItems));
}

function setupPrintReceipt() {
  document
    .getElementById("printReceipt")
    .addEventListener("click", function (e) {
      e.preventDefault();
      window.print();
    });
}

setTimeout(() => {
  localStorage.removeItem("currentOrder");
  localStorage.removeItem("pendingOrder");
}, 30 * 60 * 1000);
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId =
    urlParams.get("order") || "ORD-" + Math.floor(Math.random() * 10000);

  const deliveredOrders = JSON.parse(
    localStorage.getItem("deliveredOrders") || "[]"
  );
  const isDelivered =
    deliveredOrders.includes(orderId) || urlParams.get("delivered") === "true";

  if (isDelivered) {
    const ratingSection = document.getElementById("ratingSection");
    if (ratingSection) {
      ratingSection.classList.add("show");

      const successMessage = document.querySelector(".success-message");
      successMessage.innerHTML = `
        Thank you for your purchase! Your order <strong>${orderId}</strong> has been successfully delivered.
        We hope you enjoy your fresh products!
      `;

      const successIcon = document.querySelector(".success-icon");
      successIcon.innerHTML = "🎉";
    }
  }

  const orderDetailsDiv = document.getElementById("orderDetails");
  if (orderDetailsDiv) {
    orderDetailsDiv.innerHTML = `
      <h4>Order Details</h4>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Status:</strong> ${
        isDelivered ? "Delivered 🎉" : "Processing"
      }</p>
      <p><strong>Estimated Delivery:</strong> Within 24 hours</p>
      ${
        isDelivered
          ? '<p class="delivered-note">✓ Your order has been delivered successfully!</p>'
          : ""
      }
    `;
  }
});

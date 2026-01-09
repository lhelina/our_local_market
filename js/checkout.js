const CHAPA_CONFIG = {
  publicKey: "CHAPUBK_TEST-xxxxxxxxxxxx",
  txRef: `TXN-${Date.now()}`,
  currency: "ETB",
  amount: 0,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  callbackUrl: "http://localhost:5500/success.html",
  returnUrl: "http://localhost:5500/success.html",
  customization: {
    title: "Our Local Market",
    description: "Fresh agricultural products",
  },
};

document.addEventListener("DOMContentLoaded", function () {
  loadOrderSummary();
  updateCartCount();
  setupEventListeners();
  setupPaymentToggle();
});

function loadOrderSummary() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const orderItemsContainer = document.getElementById("orderItems");

  if (cart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  let html = "";
  let subtotal = 0;

  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    html += `
            <div class="order-item">
                <div class="item-info">
                    <img src="${item.image}" alt="${item.name}" 
                         onerror="this.src='https://via.placeholder.com/60x60?text=Product'">
                    <div>
                        <h4>${item.name}</h4>
                        <p>${item.price} ETB × ${item.quantity} ${item.unit}</p>
                    </div>
                </div>
                <span class="item-price">${itemTotal} ETB</span>
            </div>
        `;
  });

  orderItemsContainer.innerHTML = html;
  updateOrderTotals(subtotal);
}

function updateOrderTotals(subtotal) {
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;

  document.getElementById("orderSubtotal").textContent = `${subtotal} ETB`;
  document.getElementById("orderTotal").textContent = `${total} ETB`;

  // Update Chapa config with total amount
  CHAPA_CONFIG.amount = total;
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountElements = document.querySelectorAll("#cartCount");
  cartCountElements.forEach((el) => (el.textContent = totalItems));
}

function setupEventListeners() {
  const form = document.getElementById("checkoutForm");
  form.addEventListener("submit", handleSubmit);

  document.getElementById("fullName").addEventListener("input", function () {
    const names = this.value.split(" ");
    CHAPA_CONFIG.firstName = names[0] || "";
    CHAPA_CONFIG.lastName = names.slice(1).join(" ") || "";
  });

  document.getElementById("email").addEventListener("input", function () {
    CHAPA_CONFIG.email = this.value;
  });

  document.getElementById("phone").addEventListener("input", function () {
    CHAPA_CONFIG.phone = this.value;
  });
}

function setupPaymentToggle() {
  const paymentOptions = document.querySelectorAll('input[name="payment"]');
  const payNowBtn = document.getElementById("payNowBtn");
  const codBtn = document.getElementById("codBtn");

  paymentOptions.forEach((option) => {
    option.addEventListener("change", function () {
      if (this.value === "cash") {
        payNowBtn.style.display = "none";
        codBtn.style.display = "block";
      } else {
        payNowBtn.style.display = "block";
        codBtn.style.display = "none";
      }
    });
  });

  codBtn.addEventListener("click", function () {
    if (validateForm()) {
      simulateOrder("cash");
    }
  });
}

function handleSubmit(e) {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const paymentMethod = document.querySelector(
    'input[name="payment"]:checked'
  ).value;

  if (paymentMethod === "chapa") {
    processChapaPayment();
  } else {
    simulateOrder("cash");
  }
}

function validateForm() {
  const form = document.getElementById("checkoutForm");
  const terms = document.getElementById("terms");

  if (!form.checkValidity()) {
    alert("Please fill in all required fields correctly.");
    return false;
  }

  if (!terms.checked) {
    alert("Please agree to the terms and conditions.");
    return false;
  }

  return true;
}

function processChapaPayment() {
  CHAPA_CONFIG.txRef = `TXN-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  const formData = {
    fullName: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value,
    city: document.getElementById("city").value,
    subcity: document.getElementById("subcity").value,
    notes: document.getElementById("notes").value,
    cart: JSON.parse(localStorage.getItem("cart")) || [],
  };

  localStorage.setItem(
    "pendingOrder",
    JSON.stringify({
      ...formData,
      transactionRef: CHAPA_CONFIG.txRef,
      amount: CHAPA_CONFIG.amount,
      paymentMethod: "chapa",
      timestamp: new Date().toISOString(),
    })
  );

  const chapa = new window.Chapa({
    ...CHAPA_CONFIG,
    onClose: () => {
      console.log("Payment window closed");
    },
    onSuccess: (data) => {
      console.log("Payment successful:", data);

      localStorage.setItem("paymentData", JSON.stringify(data));

      localStorage.removeItem("cart");
      window.location.href = "success.html";
    },
    onError: (error) => {
      console.error("Payment error:", error);
      alert("Payment failed. Please try again.");
    },
  });

  chapa.open();
}

function simulateOrder(paymentMethod) {
  const formData = {
    fullName: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value,
    city: document.getElementById("city").value,
    subcity: document.getElementById("subcity").value,
    notes: document.getElementById("notes").value,
    cart: JSON.parse(localStorage.getItem("cart")) || [],
  };

  const orderRef = `ORD-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 6)}`;

  const order = {
    ...formData,
    orderId: orderRef,
    paymentMethod: paymentMethod,
    amount: CHAPA_CONFIG.amount,
    status: "pending",
    timestamp: new Date().toISOString(),
  };

  localStorage.setItem("currentOrder", JSON.stringify(order));

  alert(
    `Order placed successfully!\nOrder ID: ${orderRef}\nPayment: ${
      paymentMethod === "cash" ? "Cash on Delivery" : "Chapa"
    }`
  );

  localStorage.removeItem("cart");

  window.location.href = "success.html";
}

function testChapaPayment() {
  alert(
    "This is a demo. In production, this would redirect to Chapa payment gateway.\n\nFor testing Chapa:\n1. Sign up at https://dashboard.chapa.co\n2. Get your test public key\n3. Replace CHAPUBK_TEST-xxxxxxxxxxxx with your actual key\n\nFor now, we'll simulate payment success."
  );

  // Simulate successful payment
  const orderRef = `ORD-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 6)}`;
  localStorage.setItem(
    "currentOrder",
    JSON.stringify({
      orderId: orderRef,
      paymentMethod: "chapa",
      status: "paid",
      timestamp: new Date().toISOString(),
    })
  );
  localStorage.removeItem("cart");
  window.location.href = "success.html";
}

const API_BASE_URL = "http://localhost:5000/api";

function handleApiError(error) {
  console.error("API Error:", error);
  if (error.message.includes("Failed to fetch")) {
    alert(
      "Server is not responding. Please make sure the backend is running on http://localhost:5000"
    );
  }
  throw error;
}

document.addEventListener("DOMContentLoaded", function () {
  initHomePage();
  setupEventListeners();
  loadFeaturedProducts();
  setupAuthModal();
  checkAuthStatus();
});

function initHomePage() {
  setupScrollAnimations();

  const footerCopyright = document.querySelector("footer .footer-bottom p");
  if (footerCopyright) {
    footerCopyright.innerHTML = footerCopyright.innerHTML.replace(
      "2026",
      new Date().getFullYear()
    );
  }
}

function setupEventListeners() {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector(".nav-menu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("active");
      navMenu.classList.toggle("active");
    });
  }

  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.addEventListener("click", () => {
      if (hamburger) hamburger.classList.remove("active");
      if (navMenu) navMenu.classList.remove("active");
    });
  });

  const getStartedButtons = [
    document.getElementById("getStartedBtn"),
    document.getElementById("heroGetStarted"),
    document.getElementById("ctaRegister"),
  ];

  getStartedButtons.forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", () => openAuthModal("register"));
    }
  });

  const loginBtn = document.getElementById("ctaLogin");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user) {
        handleLogout();
      } else {
        openAuthModal("login");
      }
    });
  }

  const learnMoreBtn = document.getElementById("heroLearnMore");
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener("click", () => {
      alert("This would play an introduction video about Our Local Market");
    });
  }

  const newsletterForm = document.querySelector(".newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      if (email) {
        alert(`Thank you for subscribing with: ${email}`);
        this.reset();
      }
    });
  }
}

function setupScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("animate");
      }
    });
  }, observerOptions);

  document
    .querySelectorAll(".step-card, .product-card, .poster-card")
    .forEach((el) => {
      observer.observe(el);
    });
}

function loadFeaturedProducts() {
  const featuredProducts = [
    {
      id: 1,
      name: "carrots",
      price: 30,
      unit: "kg",
      category: "vegetable",
      farmer: "Abebe Tadesse",
      location: "Sebeta",
      image: "./pictures/image.jpg",
    },
    {
      id: 2,
      name: "Potatoes",
      price: 15,
      unit: "kg",
      category: "vegetable",
      farmer: "Bekele Farm",
      location: "Sululta",
      image: "./pictures/potatoes.jpg",
    },
    {
      id: 4,
      name: "Tomatoes",
      price: 20,
      unit: "kg",
      category: "vegetable",
      farmer: "Red Farm",
      location: "Holeta",
      image: "./pictures/tomatoes.jpg",
    },
    {
      id: 5,
      name: "Bananas",
      price: 25,
      unit: "kg",
      category: "fruit",
      farmer: "Sunrise Farm",
      location: "Koye Feche",
      image: "./pictures/bananas.jpg",
    },
  ];

  const productsGrid = document.getElementById("featuredProducts");

  if (!productsGrid) return;

  productsGrid.innerHTML = featuredProducts
    .map(
      (product) => `
        <div class="product-card" data-id="${product.id}">
            <img src="${product.image}" alt="${product.name}" class="product-img" 
                 onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">${product.price} ETB/${product.unit}</div>
                <div class="product-meta">
                    <span>👨‍🌾 ${product.farmer}</span>
                    <span>📍 ${product.location}</span>
                </div>
                <button class="add-to-cart" onclick="handleAddToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i> Add to Basket
                </button>
            </div>
        </div>
    `
    )
    .join("");
}

function handleAddToCart(productId) {
  const isLoggedIn = checkIfUserLoggedIn();

  if (!isLoggedIn) {
    openAuthModal("login", `Please login to add items to your cart.`);
    return;
  }

  addProductToCart(productId);
}

function checkIfUserLoggedIn() {
  return localStorage.getItem("token") !== null;
}

function addProductToCart(productId) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const products = [
    { id: 1, name: "Teff", price: 30, unit: "kg" },
    { id: 2, name: "Potatoes", price: 15, unit: "kg" },
    { id: 4, name: "Tomatoes", price: 20, unit: "kg" },
    { id: 5, name: "Bananas", price: 25, unit: "kg" },
  ];

  const product = products.find((p) => p.id === productId);

  if (!product) {
    alert("Product not found!");
    return;
  }

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit: product.unit,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  const button = document.querySelector(
    `[data-id="${productId}"] .add-to-cart`
  );
  if (button) {
    button.innerHTML = '<i class="fas fa-check"></i> Added to Cart';
    button.disabled = true;
    setTimeout(() => {
      button.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Basket';
      button.disabled = false;
    }, 2000);
  }

  alert(`${product.name} added to cart!`);

  updateCartCount();
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartCountElements = document.querySelectorAll("#cartCount");
  cartCountElements.forEach((el) => {
    el.textContent = totalItems;
  });
}

function setupAuthModal() {
  const modal = document.getElementById("authModal");
  const modalContent = document.getElementById("authModalContent");

  if (!modal || !modalContent) return;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeAuthModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "flex") {
      closeAuthModal();
    }
  });
}

function openAuthModal(mode = "login", message = "") {
  const modal = document.getElementById("authModal");
  const modalContent = document.getElementById("authModalContent");

  if (!modal || !modalContent) return;

  modalContent.innerHTML = generateAuthModalHTML(mode, message);
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  setupModalEventListeners(mode);
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  modal.style.display = "none";
  document.body.style.overflow = "auto";
}

function generateAuthModalHTML(mode, message = "") {
  return `
        <div class="modal-header">
            <button class="close-modal" onclick="closeAuthModal()">&times;</button>
            <h2>${
              mode === "login" ? "Welcome Back" : "Join Our Local Market"
            }</h2>
            <p>${
              mode === "login"
                ? "Sign in to your account"
                : "Create your account to start shopping or selling"
            }</p>
            ${message ? `<p class="modal-message">${message}</p>` : ""}
        </div>
        
        <div class="modal-body">
            <div class="auth-tabs">
                <button class="auth-tab ${
                  mode === "login" ? "active" : ""
                }" data-tab="login">Login</button>
                <button class="auth-tab ${
                  mode === "register" ? "active" : ""
                }" data-tab="register">Register</button>
            </div>
            
            <!-- LOGIN FORM -->
            <form class="auth-form" id="loginForm" ${
              mode === "login" ? "" : 'style="display: none;"'
            }>
                <div class="form-group">
                    <label for="loginEmailUsername">Email or Username *</label>
                    <input type="text" id="loginEmailUsername" placeholder="email@example.com or username" required>
                </div>
                
                <div class="form-group">
                    <label for="loginPassword">Password *</label>
                    <input type="password" id="loginPassword" placeholder="••••••••" required>
                </div>
                
                <div class="forgot-password">
                    <a href="#" onclick="showForgotPassword()">Forgot password?</a>
                </div>
                
                <button type="submit" class="btn-primary">Sign In</button>
                
                <div class="demo-credentials" style="margin-top: 1rem; padding: 0.5rem; background: #f5f5f5; border-radius: 4px; font-size: 0.9rem;">
                    <p style="margin: 0; color: #666;"></p>
                </div>
            </form>
            
            <!-- REGISTER FORM -->
            <form class="auth-form" id="registerForm" ${
              mode === "register" ? "" : 'style="display: none;"'
            }>
                <div class="user-type-selector">
                    <div class="user-type selected" data-type="buyer" onclick="selectUserType('buyer')">
                        <div class="user-type-icon">🛒</div>
                        <div>
                            <h4>Buyer</h4>
                            <p>Shop for products</p>
                        </div>
                    </div>
                    <div class="user-type" data-type="farmer" onclick="selectUserType('farmer')">
                        <div class="user-type-icon">👨‍🌾</div>
                        <div>
                            <h4>Farmer</h4>
                            <p>Sell your products</p>
                        </div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="registerFullName">Full Name *</label>
                    <input type="text" id="registerFullName" placeholder="John Doe" required>
                </div>
                
                <div class="form-group">
                    <label for="registerEmail">Email Address *</label>
                    <input type="email" id="registerEmail" placeholder="your@email.com" required>
                </div>
                
                <div class="form-group">
                    <label for="registerUsername">Username (Optional)</label>
                    <input type="text" id="registerUsername" placeholder="johndoe">
                    <small>If not provided, we'll use your email username</small>
                </div>
                
                <div class="form-group">
                    <label for="registerPhone">Phone Number *</label>
                    <input type="tel" id="registerPhone" placeholder="0912345678" required>
                </div>
                
                <div class="form-group">
                    <label for="registerPassword">Password *</label>
                    <input type="password" id="registerPassword" placeholder="••••••••" required minlength="6">
                </div>
                
                <div class="form-group">
                    <label for="registerConfirmPassword">Confirm Password *</label>
                    <input type="password" id="registerConfirmPassword" placeholder="••••••••" required>
                </div>
                
                <!-- Buyer Fields -->
                <div class="form-group buyer-fields">
                    <label for="address">Address</label>
                    <input type="text" id="address" placeholder="Your address">
                </div>
                
                <div class="form-group buyer-fields">
                    <label for="city">City</label>
                    <input type="text" id="city" placeholder="Your city">
                </div>
                
                <!-- Farmer Fields (hidden by default) -->
                <div class="form-group farmer-fields" style="display: none;">
                    <label for="farmName">Farm Name</label>
                    <input type="text" id="farmName" placeholder="Your Farm Name">
                </div>
                
                <div class="form-group farmer-fields" style="display: none;">
                    <label for="farmLocation">Farm Location</label>
                    <input type="text" id="farmLocation" placeholder="City/Region">
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="termsAgree" required>
                        I agree to the <a href="#" style="color: var(--primary-green);">Terms & Conditions</a>
                    </label>
                </div>
                
                <button type="submit" class="btn-primary">Create Account</button>
            </form>
            
            <!-- FORGOT PASSWORD FORM (hidden by default) -->
            <form class="auth-form" id="forgotPasswordForm" style="display: none;">
                <div class="form-group">
                    <label for="forgotEmail">Enter your registered email *</label>
                    <input type="email" id="forgotEmail" placeholder="your@email.com" required>
                    <small>We'll send a password reset link to this email</small>
                </div>
                
                <button type="submit" class="btn-primary">Send Reset Link</button>
                <button type="button" class="btn-outline" onclick="showLoginForm()" style="margin-top: 1rem;">
                    ← Back to Login
                </button>
            </form>
        </div>
    `;
}

function setupModalEventListeners(mode) {
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");

      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      document.getElementById("loginForm").style.display =
        tabName === "login" ? "block" : "none";
      document.getElementById("registerForm").style.display =
        tabName === "register" ? "block" : "none";
    });
  });

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      await handleLogin();
    });
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      await handleRegistration();
    });
  }

  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      await handleForgotPassword();
    });
  }
}

function selectUserType(type) {
  const buyerType = document.querySelector('.user-type[data-type="buyer"]');
  const farmerType = document.querySelector('.user-type[data-type="farmer"]');
  const buyerFields = document.querySelectorAll(".buyer-fields");
  const farmerFields = document.querySelectorAll(".farmer-fields");

  buyerType.classList.remove("selected");
  farmerType.classList.remove("selected");

  if (type === "buyer") {
    buyerType.classList.add("selected");
    buyerFields.forEach((field) => (field.style.display = "block"));
    farmerFields.forEach((field) => (field.style.display = "none"));
  } else {
    farmerType.classList.add("selected");
    buyerFields.forEach((field) => (field.style.display = "none"));
    farmerFields.forEach((field) => (field.style.display = "block"));
  }
}

function showForgotPassword() {
  const modalContent = document.getElementById("authModalContent");
  modalContent.innerHTML = `
        <div class="modal-header">
            <button class="close-modal" onclick="closeAuthModal()">&times;</button>
            <h2>Reset Your Password</h2>
            <p>Enter your registered email to receive a reset link</p>
        </div>
        
        <div class="modal-body">
            <form class="auth-form" id="forgotPasswordForm">
                <div class="form-group">
                    <label for="forgotEmail">Email Address *</label>
                    <input type="email" id="forgotEmail" placeholder="your@email.com" required>
                    <small>We'll send a password reset link to this email</small>
                </div>
                
                <button type="submit" class="btn-primary">Send Reset Link</button>
                <button type="button" class="btn-outline" onclick="openAuthModal('login')" style="margin-top: 1rem;">
                    ← Back to Login
                </button>
            </form>
        </div>
    `;

  document
    .getElementById("forgotPasswordForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
      await handleForgotPassword();
    });
}

function showLoginForm() {
  openAuthModal("login");
}

async function handleLogin() {
  try {
    const emailOrUsername = document
      .getElementById("loginEmailUsername")
      .value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!emailOrUsername || !password) {
      alert("Please fill in all fields");
      return;
    }

    const submitBtn = document.querySelector("#loginForm .btn-primary");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Signing in...";
    submitBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emailOrUsername,
        password,
      }),
    });

    const data = await response.json();

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    if (!data.success) {
      if (data.needsVerification) {
        alert(
          `${data.message}\n\nPlease check your email for verification link.`
        );
        return;
      }
      alert(data.message || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    alert("✅ Login successful!");
    closeAuthModal();

    localStorage.setItem("userType", data.user.userType);

    setTimeout(() => {
      if (data.user.userType === "farmer") {
        window.location.href = "farmer-dashboard.html";
      } else {
        window.location.href = "shop.html";
      }
    }, 500);
  } catch (error) {
    console.error("Login error:", error);
    alert(
      "Network error. Please check if backend server is running on http://localhost:5000"
    );
  }
}
async function handleRegistration() {
  try {
    const userType = document
      .querySelector(".user-type.selected")
      .getAttribute("data-type");

    const fullName = document.getElementById("registerFullName").value.trim();
    const email = document
      .getElementById("registerEmail")
      .value.trim()
      .toLowerCase();
    const username = document.getElementById("registerUsername").value.trim();
    const phone = document.getElementById("registerPhone").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById(
      "registerConfirmPassword"
    ).value;
    const termsAgree = document.getElementById("termsAgree").checked;

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      alert("Please fill all required fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!termsAgree) {
      alert("You must agree to the terms and conditions");
      return;
    }

    const userData = {
      fullName,
      email,
      phone,
      password,
      userType,
    };

    if (username) userData.username = username;

    if (userType === "buyer") {
      userData.address = document.getElementById("address").value.trim();
      userData.city = document.getElementById("city").value.trim();
    } else {
      userData.farmName = document.getElementById("farmName").value.trim();
      userData.farmLocation = document
        .getElementById("farmLocation")
        .value.trim();
    }

    const submitBtn = document.querySelector("#registerForm .btn-primary");
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Creating account...";
    submitBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    if (!data.success) {
      alert(data.message || "Registration failed");
      return;
    }

    alert(
      `✅ Registration successful! ${data.message}\n\nCheck your email at ${email} for verification link.`
    );
    closeAuthModal();

    localStorage.setItem(
      "pendingUser",
      JSON.stringify({
        email,
        userType,
        fullName,
      })
    );

    setTimeout(() => {
      alert(
        `💡 Remember to check ${email} and verify your account!\n\nOnce verified, you can login.`
      );
    }, 1000);
  } catch (error) {
    console.error("Registration error:", error);
    alert(
      "Network error. Please check if backend server is running on http://localhost:5000"
    );
  }
}
async function handleForgotPassword() {
  try {
    const email = document.getElementById("forgotEmail").value.trim();

    if (!email) {
      alert("Please enter your email");
      return;
    }

    const submitBtn = document.querySelector(
      "#forgotPasswordForm .btn-primary"
    );
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Sending...";
    submitBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    if (!data.success) {
      alert(data.message || "Failed to send reset link");
      return;
    }

    alert(
      `${data.message}\n\nFor demo purposes, reset link: ${data.resetLink}\n\nIn production, this would be emailed to you.`
    );
    closeAuthModal();
  } catch (error) {
    console.error("Forgot password error:", error);
    alert("Network error. Please try again.");
  }
}

function updateUserUI() {
  const userData = JSON.parse(localStorage.getItem("user"));

  if (userData) {
    const getStartedBtns = document.querySelectorAll(
      ".nav-btn, #heroGetStarted, #ctaRegister"
    );
    getStartedBtns.forEach((btn) => {
      if (btn) {
        btn.textContent =
          userData.userType === "farmer"
            ? "👨‍🌾 Dashboard"
            : `👤 ${userData.fullName}`;
        btn.onclick = () => {
          if (userData.userType === "farmer") {
            window.location.href = "farmer-dashboard.html";
          } else {
            window.location.href = "shop.html";
          }
        };
      }
    });

    const loginBtn = document.getElementById("ctaLogin");
    if (loginBtn) {
      loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      loginBtn.onclick = handleLogout;
    }

    const navBtn = document.getElementById("getStartedBtn");
    if (navBtn) {
      navBtn.textContent =
        userData.userType === "farmer"
          ? "👨‍🌾 Dashboard"
          : `👤 ${userData.fullName}`;
      navBtn.onclick = () => {
        if (userData.userType === "farmer") {
          window.location.href = "farmer-dashboard.html";
        } else {
          window.location.href = "shop.html";
        }
      };
    }
  } else {
    const getStartedBtns = document.querySelectorAll(
      ".nav-btn, #heroGetStarted, #ctaRegister"
    );
    getStartedBtns.forEach((btn) => {
      if (btn) {
        btn.textContent = "Get Started";
        btn.onclick = () => openAuthModal("register");
      }
    });

    const loginBtn = document.getElementById("ctaLogin");
    if (loginBtn) {
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
      loginBtn.onclick = () => openAuthModal("login");
    }

    const navBtn = document.getElementById("getStartedBtn");
    if (navBtn) {
      navBtn.textContent = "Get Started";
      navBtn.onclick = () => openAuthModal("register");
    }
  }
}

function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("cart");
    alert("Logged out successfully!");
    updateUserUI();
    location.reload();
  }
}

function checkAuthStatus() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (token && user) {
    updateUserUI();
  }

  updateCartCount();
}

window.handleAddToCart = handleAddToCart;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.selectUserType = selectUserType;
window.showForgotPassword = showForgotPassword;
window.showLoginForm = showLoginForm;
window.handleLogout = handleLogout;

const API_BASE_URL = "http://localhost:5000/api";

let currentProductForEdit = null;

function checkAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    window.location.href = "../index.html";
    return false;
  }

  if (user.userType !== "farmer") {
    alert("Access denied. Farmers only.");
    window.location.href = "../index.html";
    return false;
  }

  document.querySelector(".user-details h4").textContent =
    user.fullName || "Farmer";
  document.querySelector(".user-details p").textContent =
    user.farmName || "Farm";

  return true;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

document.addEventListener("DOMContentLoaded", function () {
  if (!checkAuth()) return;

  loadDashboardData();

  setupEventListeners();
});

function setupEventListeners() {
  const addProductBtn = document.querySelector(".btn-add");
  const addNewBtn = document.querySelector(".btn-small");
  const modal = document.getElementById("productModal");
  const closeModal = document.querySelector(".close-modal");

  [addProductBtn, addNewBtn].forEach((btn) => {
    btn?.addEventListener("click", () => showAddProductModal());
  });

  closeModal?.addEventListener("click", closeProductModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeProductModal();
    }
  });

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn?.addEventListener("click", logout);
}

async function loadDashboardData() {
  try {
    const statsResponse = await fetch(`${API_BASE_URL}/products/farmer/stats`, {
      headers: getAuthHeaders(),
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      updateStats(statsData.stats);
    }

    await loadFarmerProducts();

    const ordersResponse = await fetch(`${API_BASE_URL}/orders/farmer/recent`, {
      headers: getAuthHeaders(),
    });

    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      renderRecentOrders(ordersData.orders);
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showNotification("Failed to load dashboard data", "error");
  }
}

async function loadFarmerProducts() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/products/farmer/my-products`,
      {
        headers: getAuthHeaders(),
      }
    );

    if (response.ok) {
      const productsData = await response.json();
      renderProductsTable(productsData.products);
    } else {
      console.error("Failed to load products");
    }
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

function updateStats(stats) {
  const statCards = document.querySelectorAll(".stat-card");

  if (statCards[0]) {
    statCards[0].querySelector("h3").textContent = `${
      stats.totalSales?.toLocaleString() || "0"
    } ETB`;
  }
  if (statCards[1]) {
    statCards[1].querySelector("h3").textContent = stats.activeOrders || "0";
  }
  if (statCards[2]) {
    statCards[2].querySelector("h3").textContent = stats.activeProducts || "0";
  }
  if (statCards[3]) {
    statCards[3].querySelector("h3").textContent = stats.averageRating || "0";
  }

  const quickStats = document.querySelectorAll(".quick-stats .stat-value");
  if (quickStats[0]) quickStats[0].textContent = stats.pendingOrders || "0";
  if (quickStats[1]) quickStats[1].textContent = stats.completedOrders || "0";
  if (quickStats[2]) quickStats[2].textContent = stats.totalCustomers || "0";
  if (quickStats[3])
    quickStats[3].textContent = `${stats.averageRating || "0"}/5`;
}

function renderProductsTable(products) {
  const tbody = document.querySelector(".products-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem;">
          <i class="fas fa-seedling" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem; display: block;"></i>
          <p>No products yet. Click "Add New" to add your first product!</p>
        </td>
      </tr>
    `;
    return;
  }

  products.forEach((product) => {
    const stockPercentage = Math.min(
      (product.stock / (product.stock + 100)) * 100,
      100
    );

    let statusClass = "active";
    let statusText = "Active";

    if (product.stock === 0) {
      statusClass = "out";
      statusText = "Out of Stock";
    } else if (product.stock < 10) {
      statusClass = "low";
      statusText = "Low Stock";
    }

    const row = document.createElement("tr");
    row.dataset.productId = product._id;
    row.innerHTML = `
      <td class="product-info">
        <img src="${product.image || "../pictures/default-product.jpg"}" 
             alt="${product.name}"
             onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
        <div>
          <h4>${product.name}</h4>
          <p>${product.category}</p>
        </div>
      </td>
      <td class="price">${product.price} ETB/${product.unit}</td>
      <td>
        <div class="quantity">
          <span class="stock">${product.stock} ${product.unit}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${stockPercentage}%"></div>
          </div>
        </div>
      </td>
      <td>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </td>
      <td class="actions">
        <button class="action-btn edit" onclick="editProduct('${product._id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete" onclick="deleteProduct('${
          product._id
        }')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function renderRecentOrders(orders) {
  const ordersList = document.querySelector(".orders-list");
  if (!ordersList) return;

  ordersList.innerHTML = "";

  if (!orders || orders.length === 0) {
    ordersList.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #666;">
        <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
        <p>No recent orders</p>
      </div>
    `;
    return;
  }

  orders.forEach((order) => {
    const orderItem = document.createElement("div");
    orderItem.className = "order-item";

    let statusClass = "pending";
    if (order.status === "processing") statusClass = "processing";
    else if (order.status === "shipped") statusClass = "shipped";
    else if (order.status === "delivered") statusClass = "delivered";
    else if (order.status === "cancelled") statusClass = "out";

    const orderNumber =
      order.orderNumber || `ORD-${order._id?.slice(-4) || "0000"}`;
    const itemsCount = order.itemCount || order.items?.length || 0;

    orderItem.innerHTML = `
      <div class="order-info">
        <h4>${orderNumber}</h4>
        <p>${itemsCount} items • ${formatTimeAgo(order.createdAt)}</p>
      </div>
      <div class="order-status">
        <span class="status ${statusClass}">${order.status}</span>
        <span class="amount">${order.totalPrice || 0} ETB</span>
      </div>
    `;
    ordersList.appendChild(orderItem);
  });
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

function showAddProductModal() {
  currentProductForEdit = null;
  const modal = document.getElementById("productModal");
  const modalBody = modal.querySelector(".modal-body");

  modalBody.innerHTML = `
    <form id="productForm" enctype="multipart/form-data">
      <div class="form-group">
        <label for="productName">Product Name *</label>
        <input type="text" id="productName" name="name" required placeholder="e.g., Organic Tomatoes">
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="productPrice">Price (ETB) *</label>
          <input type="number" id="productPrice" name="price" required placeholder="e.g., 25" min="1" step="0.01">
        </div>
        <div class="form-group">
          <label for="productUnit">Unit *</label>
          <select id="productUnit" name="unit" required>
            <option value="kg">kg</option>
            <option value="g">gram</option>
            <option value="piece">piece</option>
            <option value="bundle">bundle</option>
            <option value="liter">liter</option>
            <option value="dozen">dozen</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="productCategory">Category *</label>
        <select id="productCategory" name="category" required>
          <option value="vegetable">Vegetable</option>
          <option value="fruit">Fruit</option>
          <option value="grain">Grain</option>
          <option value="spice">Spice</option>
          <option value="dairy">Dairy</option>
          <option value="meat">Meat</option>
          <option value="poultry">Poultry</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="productStock">Initial Stock *</label>
        <input type="number" id="productStock" name="stock" required placeholder="e.g., 100" min="0">
      </div>
      
      <div class="form-group">
        <label for="productDescription">Description</label>
        <textarea id="productDescription" name="description" rows="3" placeholder="Describe your product..."></textarea>
      </div>
      
      <!-- FILE UPLOAD FIELD - ADD THIS -->
      <div class="form-group">
        <label for="productImageFile">Product Image</label>
        <input type="file" 
               id="productImageFile" 
               name="image" 
               accept="image/*"
               onchange="previewImage(this)">
        <small>Upload a clear photo of your product (max 5MB)</small>
        
        <!-- Image Preview -->
        <div id="imagePreviewContainer" style="margin-top: 10px; display: none;">
          <img id="imagePreview" style="max-width: 200px; max-height: 150px; border-radius: 5px; border: 1px solid #ddd;">
        </div>
      </div>
      
      <!-- Alternative: Image URL field (optional) -->
      <div class="form-group">
        <label for="productImageUrl">Or Enter Image URL</label>
        <input type="text" id="productImageUrl" name="imageUrl" placeholder="https://example.com/image.jpg">
        <small>Leave empty if uploading a file</small>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn-cancel" onclick="closeProductModal()">Cancel</button>
        <button type="submit" class="btn-submit">Add Product</button>
      </div>
    </form>
  `;

  modal.style.display = "flex";

  // Handle form submission
  const form = document.getElementById("productForm");
  form.addEventListener("submit", handleProductSubmit);
}

function previewImage(input) {
  const preview = document.getElementById("imagePreview");
  const container = document.getElementById("imagePreviewContainer");

  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      container.style.display = "block";
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function editProduct(productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch product");
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    currentProductForEdit = data.product;
    showEditProductModal(data.product);
  } catch (error) {
    console.error("Error fetching product:", error);
    showNotification("Failed to load product for editing", "error");
  }
}

function showEditProductModal(product) {
  currentProductForEdit = product;
  const modal = document.getElementById("productModal");
  const modalBody = modal.querySelector(".modal-body");

  modalBody.innerHTML = `
    <form id="productForm" enctype="multipart/form-data">
      <div class="form-group">
        <label for="productName">Product Name *</label>
        <input type="text" id="productName" name="name" value="${
          product.name
        }" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="productPrice">Price (ETB) *</label>
          <input type="number" id="productPrice" name="price" value="${
            product.price
          }" required min="1" step="0.01">
        </div>
        <div class="form-group">
          <label for="productUnit">Unit *</label>
          <select id="productUnit" name="unit" required>
            <option value="kg" ${
              product.unit === "kg" ? "selected" : ""
            }>kg</option>
            <option value="g" ${
              product.unit === "g" ? "selected" : ""
            }>gram</option>
            <option value="piece" ${
              product.unit === "piece" ? "selected" : ""
            }>piece</option>
            <option value="bundle" ${
              product.unit === "bundle" ? "selected" : ""
            }>bundle</option>
            <option value="liter" ${
              product.unit === "liter" ? "selected" : ""
            }>liter</option>
            <option value="dozen" ${
              product.unit === "dozen" ? "selected" : ""
            }>dozen</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="productCategory">Category *</label>
        <select id="productCategory" name="category" required>
          <option value="vegetable" ${
            product.category === "vegetable" ? "selected" : ""
          }>Vegetable</option>
          <option value="fruit" ${
            product.category === "fruit" ? "selected" : ""
          }>Fruit</option>
          <option value="grain" ${
            product.category === "grain" ? "selected" : ""
          }>Grain</option>
          <option value="spice" ${
            product.category === "spice" ? "selected" : ""
          }>Spice</option>
          <option value="dairy" ${
            product.category === "dairy" ? "selected" : ""
          }>Dairy</option>
          <option value="meat" ${
            product.category === "meat" ? "selected" : ""
          }>Meat</option>
          <option value="poultry" ${
            product.category === "poultry" ? "selected" : ""
          }>Poultry</option>
          <option value="other" ${
            product.category === "other" ? "selected" : ""
          }>Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="productStock">Stock *</label>
        <input type="number" id="productStock" name="stock" value="${
          product.stock
        }" required min="0">
      </div>
      
      <div class="form-group">
        <label for="productDescription">Description</label>
        <textarea id="productDescription" name="description" rows="3">${
          product.description || ""
        }</textarea>
      </div>
      
      <!-- Show current image -->
      <div class="form-group">
        <label>Current Image</label>
        <div style="margin-bottom: 10px;">
          <img src="${product.image || "../pictures/default-product.jpg"}" 
               style="max-width: 200px; max-height: 150px; border-radius: 5px; border: 1px solid #ddd;"
               onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
        </div>
      </div>
      
      <!-- FILE UPLOAD FIELD FOR UPDATE -->
      <div class="form-group">
        <label for="productImageFile">Upload New Image (Optional)</label>
        <input type="file" 
               id="productImageFile" 
               name="image" 
               accept="image/*"
               onchange="previewImage(this)">
        <small>Leave empty to keep current image</small>
        
        <!-- New Image Preview -->
        <div id="imagePreviewContainer" style="margin-top: 10px; display: none;">
          <img id="imagePreview" style="max-width: 200px; max-height: 150px; border-radius: 5px; border: 1px solid #ddd;">
        </div>
      </div>
      
      <!-- Alternative: Image URL field (optional) -->
      <div class="form-group">
        <label for="productImageUrl">Or Enter New Image URL</label>
        <input type="text" id="productImageUrl" name="imageUrl" placeholder="https://example.com/image.jpg">
        <small>Leave empty to keep current image</small>
      </div>
      
      <div class="form-actions">
        <button type="button" class="btn-cancel" onclick="closeProductModal()">Cancel</button>
        <button type="submit" class="btn-submit">Update Product</button>
      </div>
    </form>
  `;

  modal.style.display = "flex";

  const form = document.getElementById("productForm");
  form.addEventListener("submit", handleProductSubmit);
}

async function handleProductSubmit(e) {
  e.preventDefault();
  console.log("📤 Submitting product form...");

  const form = e.target;

  // Create FormData object
  const formData = new FormData(form);

  // Debug: Log all FormData entries
  console.log("📦 FormData entries:");
  for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(
        `${key}: File - ${value.name} (${value.type}, ${value.size} bytes)`
      );
    } else {
      console.log(`${key}: ${value}`);
    }
  }

  const token = localStorage.getItem("token");
  if (!token) {
    showNotification("Please login again", "error");
    window.location.href = "../index.html";
    return;
  }

  let url, method;
  if (currentProductForEdit) {
    url = `${API_BASE_URL}/products/${currentProductForEdit._id}`;
    method = "PUT";
    console.log("🔄 Updating product:", url);
  } else {
    url = `${API_BASE_URL}/products`;
    method = "POST";
    console.log("🆕 Creating product:", url);
  }

  try {
    console.log("📤 Sending request...");
    const response = await fetch(url, {
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showNotification(
        currentProductForEdit ? "Product updated!" : "Product added!",
        "success"
      );
      closeProductModal();
      await loadDashboardData();
    } else {
      console.error(" Server error response:", data);
      showNotification(
        data.message || "Operation failed. Please check your data.",
        "error"
      );
    }
  } catch (error) {
    console.error(" Network/parsing error:", error);
    showNotification("Failed to connect to server. Please try again.", "error");
  }
}

async function deleteProduct(productId) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showNotification("Product deleted successfully!", "success");
      await loadFarmerProducts();
      await loadDashboardData();
    } else {
      showNotification(data.message || "Failed to delete product", "error");
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    showNotification("Failed to delete product.", "error");
  }
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  modal.style.display = "none";
  currentProductForEdit = null;
}

function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(
    ".notification-toast"
  );
  existingNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = "notification-toast";

  const icon = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ️";
  const bgColor =
    type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3";

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem;">
      <div style="background: ${bgColor}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
        ${icon}
      </div>
      <div>
        <p style="margin: 0; font-weight: 500;">${message}</p>
      </div>
    </div>
    <button class="close-notif" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666;">&times;</button>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    z-index: 9999;
    animation: slideInRight 0.3s ease;
    max-width: 350px;
    border-left: 4px solid ${bgColor};
  `;

  notification.querySelector(".close-notif").addEventListener("click", () => {
    notification.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  });

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "../index.html";
  }
}

const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

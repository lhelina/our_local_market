const sampleOrders = [
  {
    id: "ORD001",
    customer: "John Doe",
    date: "2024-01-15",
    amount: "₦15,200",
    status: "delivered",
  },
  {
    id: "ORD002",
    customer: "Jane Smith",
    date: "2024-01-14",
    amount: "₦8,500",
    status: "processing",
  },
  {
    id: "ORD003",
    customer: "Mike Johnson",
    date: "2024-01-14",
    amount: "₦22,300",
    status: "pending",
  },
  {
    id: "ORD004",
    customer: "Sarah Wilson",
    date: "2024-01-13",
    amount: "₦12,800",
    status: "delivered",
  },
  {
    id: "ORD005",
    customer: "Chris Brown",
    date: "2024-01-13",
    amount: "₦18,900",
    status: "cancelled",
  },
];

const sampleProducts = [
  {
    id: 1,
    name: "Organic carrots",
    category: "Grain",
    price: "₦3,500",
    sales: 142,
    rating: 4.8,
    image: "./pictures/image.jpg",
  },
  {
    id: 2,
    name: "Fresh Potatoes",
    category: "Vegetable",
    price: "₦1,200",
    sales: 98,
    rating: 4.5,
    image: "./pictures/potatoes.jpg",
  },
  {
    id: 3,
    name: "Tomatoes",
    category: "Grain",
    price: "₦8,500",
    sales: 67,
    rating: 4.9,
    image: "./pictures/tomatoes.jpg",
  },
  {
    id: 4,
    name: "Avocado",
    category: "Fruit",
    price: "₦2,800",
    sales: 54,
    rating: 4.7,
    image: "./pictures/Avocado.jpg",
  },
];

const sampleNotifications = [
  {
    id: 1,
    title: "New Order",
    message: "New order #ORD006 received",
    time: "10 min ago",
    read: false,
  },
  {
    id: 2,
    title: "Low Stock",
    message: "Potatoes stock is running low",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    title: "System Update",
    message: "System maintenance scheduled",
    time: "2 hours ago",
    read: true,
  },
];

function checkAdminAuth() {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return false;
  }

  if (user.role !== "admin") {
    alert("Access denied. Admin only.");
    return false;
  }

  return true;
}

function initDashboard() {
  updateAdminInfo();

  initCharts();

  loadOrdersTable();
  loadTopProducts();
  loadNotifications();
}

function updateAdminInfo() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    document.getElementById("adminName").textContent =
      user.fullName || "Admin User";
    document.getElementById("adminEmail").textContent =
      user.email || "admin@localmarket.com";
    document.getElementById("headerAdminName").textContent =
      user.fullName || "Admin User";

    const avatars = document.querySelectorAll(
      "#adminAvatar, .admin-user-avatar"
    );
    avatars.forEach((avatar) => {
      avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.fullName || "Admin"
      )}&background=4a6fa5&color=fff`;
    });
  }
}

let sidebarCollapsed = false;
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const logoText = document.getElementById("logoText");

  sidebarCollapsed = !sidebarCollapsed;

  if (sidebarCollapsed) {
    sidebar.classList.add("collapsed");
    mainContent.classList.add("expanded");
    logoText.style.display = "none";
  } else {
    sidebar.classList.remove("collapsed");
    mainContent.classList.remove("expanded");
    logoText.style.display = "block";
  }
}

function showNotifications() {
  const modal = document.getElementById("notificationsModal");
  modal.classList.add("active");
}

function closeNotifications() {
  const modal = document.getElementById("notificationsModal");
  modal.classList.remove("active");
}

function toggleUserMenu() {
  const dropdown = document.getElementById("userMenuDropdown");
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("userMenuDropdown");
  const userMenu = document.querySelector(".admin-user-menu");

  if (
    dropdown &&
    userMenu &&
    !userMenu.contains(event.target) &&
    !dropdown.contains(event.target)
  ) {
    dropdown.style.display = "none";
  }
});

function loadDashboardData() {
  console.log("Loading dashboard data...");

  updateStats();
}

function updateStats() {
  const stats = {
    totalUsers: 1248,
    totalProducts: 156,
    todayOrders: 42,
    totalRevenue: "₦245,860",
  };

  document.getElementById("totalUsers").textContent =
    stats.totalUsers.toLocaleString();
  document.getElementById("totalProducts").textContent = stats.totalProducts;
  document.getElementById("todayOrders").textContent = stats.todayOrders;
  document.getElementById("totalRevenue").textContent = stats.totalRevenue;
}

// Load orders table
function loadOrdersTable() {
  const tableBody = document.getElementById("ordersTableBody");

  tableBody.innerHTML = sampleOrders
    .map(
      (order) => `
        <tr>
            <td>${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.date}</td>
            <td>${order.amount}</td>
            <td><span class="order-status status-${order.status}">${
        order.status.charAt(0).toUpperCase() + order.status.slice(1)
      }</span></td>
            <td>
                <button class="view-btn" onclick="viewOrder('${
                  order.id
                }')" style="padding: 5px 10px; background: #4a6fa5; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    View
                </button>
            </td>
        </tr>
    `
    )
    .join("");
}

function loadTopProducts() {
  const productsGrid = document.getElementById("topProductsGrid");

  productsGrid.innerHTML = sampleProducts
    .map(
      (product) => `
        <div class="product-card-admin">
            <img src="${product.image}" alt="${product.name}" class="product-image-admin"
                 onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
            <div class="product-info-admin">
                <div class="product-name-admin">${product.name}</div>
                <div class="product-category-admin">${product.category}</div>
                <div class="product-stats">
                    <span class="product-price">${product.price}</span>
                    <span class="product-sales">${product.sales} sales</span>
                    <span class="product-rating">★ ${product.rating}</span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function loadNotifications() {
  const notificationsList = document.getElementById("notificationsList");
  const unreadCount = sampleNotifications.filter((n) => !n.read).length;

  document.getElementById("notificationCount").textContent = unreadCount;

  notificationsList.innerHTML = sampleNotifications
    .map(
      (notification) => `
        <div class="notification-item" style="padding: 10px; border-bottom: 1px solid #eee; ${
          !notification.read ? "background: #f8f9fa;" : ""
        }">
            <div style="display: flex; justify-content: space-between;">
                <strong>${notification.title}</strong>
                <small style="color: #666;">${notification.time}</small>
            </div>
            <p style="margin: 5px 0 0; color: #555;">${notification.message}</p>
        </div>
    `
    )
    .join("");
}

function initCharts() {
  const salesCtx = document.getElementById("salesChart").getContext("2d");
  const salesChart = new Chart(salesCtx, {
    type: "line",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Sales (₦)",
          data: [65000, 81000, 72000, 95000, 89000, 102000],
          borderColor: "#4a6fa5",
          backgroundColor: "rgba(74, 111, 165, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
      },
    },
  });

  const growthCtx = document.getElementById("userGrowthChart").getContext("2d");
  const growthChart = new Chart(growthCtx, {
    type: "bar",
    data: {
      labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: [
        {
          label: "New Users",
          data: [85, 92, 78, 120, 135, 150],
          backgroundColor: "#2f8f44",
          borderColor: "#267a38",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
        x: {
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
        },
      },
    },
  });
}

function addNewProduct() {
  alert("Redirecting to add new product page...");
  window.location.href = "admin-add-product.html";
}

function manageUsers() {
  alert("Redirecting to user management...");
  window.location.href = "admin-users.html";
}

function viewReports() {
  alert("Redirecting to reports...");
  window.location.href = "admin-reports.html";
}

function systemSettings() {
  alert("Redirecting to system settings...");
  window.location.href = "admin-settings.html";
}

function viewAllOrders() {
  alert("Redirecting to all orders...");
  window.location.href = "admin-orders.html";
}

function viewAllProducts() {
  alert("Redirecting to all products...");
  window.location.href = "admin-products.html";
}

function viewOrder(orderId) {
  alert(`Viewing order ${orderId}`);
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
  }
}

function setupEventListeners() {
  document
    .getElementById("toggleSidebar")
    .addEventListener("click", toggleSidebar);

  const modal = document.getElementById("notificationsModal");
  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeNotifications();
    }
  });

  document
    .getElementById("salesPeriod")
    .addEventListener("change", function () {
      console.log("Sales period changed to:", this.value);
    });

  document
    .getElementById("growthPeriod")
    .addEventListener("change", function () {
      console.log("Growth period changed to:", this.value);
    });
}

window.toggleSidebar = toggleSidebar;
window.showNotifications = showNotifications;
window.closeNotifications = closeNotifications;
window.toggleUserMenu = toggleUserMenu;
window.addNewProduct = addNewProduct;
window.manageUsers = manageUsers;
window.viewReports = viewReports;
window.systemSettings = systemSettings;
window.viewAllOrders = viewAllOrders;
window.viewAllProducts = viewAllProducts;
window.viewOrder = viewOrder;
window.logout = logout;
window.checkAdminAuth = checkAdminAuth;
window.initDashboard = initDashboard;

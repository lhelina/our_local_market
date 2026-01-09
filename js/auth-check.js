const API_BASE_URL = "http://localhost:5000/api";

function checkAuth() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    alert("Please login first");
    window.location.href = "../index.html";
    return false;
  }

  return true;
}

function checkUserType(expectedType) {
  const user = JSON.parse(localStorage.getItem("user"));

  if (user.userType !== expectedType) {
    alert(
      `Access denied. ${expectedType === "farmer" ? "Farmers" : "Buyers"} only.`
    );
    window.location.href = "../index.html";
    return false;
  }

  return true;
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userType");
    localStorage.removeItem("cart");
    window.location.href = "../index.html";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    const buyerName = document.getElementById("buyerName");
    if (buyerName) {
      buyerName.textContent = user.fullName;
    }

    const buyerEmail = document.getElementById("buyerEmail");
    if (buyerEmail) {
      buyerEmail.textContent = user.email;
    }

    const farmerName = document.querySelector(".user-details h4");
    if (farmerName && user.userType === "farmer") {
      farmerName.textContent = user.fullName;
    }

    const farmName = document.querySelector(".user-details p");
    if (farmName && user.userType === "farmer" && user.farmName) {
      farmName.textContent = user.farmName;
    }
  }
});

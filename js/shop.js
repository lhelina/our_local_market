const API_BASE_URL = "http://localhost:5000/api";

async function loadProducts() {
  try {
    showLoading();

    const search =
      document.getElementById("searchInput")?.value.toLowerCase() || "";
    const minPrice =
      parseFloat(document.getElementById("minPrice")?.value) || 0;
    const maxPrice =
      parseFloat(document.getElementById("maxPrice")?.value) || Infinity;
    const location = document.getElementById("locationFilter")?.value || "";
    const sortBy = document.getElementById("sortFilter")?.value || "newest";

    const selectedCategories = Array.from(
      document.querySelectorAll(
        '#categoryFilters input[type="checkbox"]:checked'
      )
    ).map((cb) => cb.value);

    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (minPrice > 0) params.append("minPrice", minPrice);
    if (maxPrice < Infinity) params.append("maxPrice", maxPrice);
    if (location) params.append("city", location);
    if (selectedCategories.length > 0)
      params.append("category", selectedCategories.join(","));

    const sortMap = {
      newest: "createdAt",
      price_low: "price",
      price_high: "price",
      name: "name",
    };
    if (sortMap[sortBy]) {
      params.append("sortBy", sortMap[sortBy]);
      params.append("sortOrder", sortBy === "price_low" ? "asc" : "desc");
    }

    let apiProducts = [];
    let useLocalFallback = false;

    try {
      const response = await fetch(
        `${API_BASE_URL}/products?${params.toString()}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.products) {
          apiProducts = data.products.map((product) => ({
            id: product._id,
            name: product.name,
            price: product.price,
            unit: product.unit,
            category: product.category,
            image: product.image?.startsWith("http")
              ? product.image
              : product.image?.startsWith("/")
              ? `http://localhost:5000${product.image}`
              : product.image ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            farmer:
              product.farmer?.fullName ||
              product.farmer?.farmName ||
              "Local Farmer",
            location:
              product.farmer?.city || product.farmer?.farmLocation || "Local",
            stock: product.stock || 0,
            description: product.description || "",
            _id: product._id,
          }));
          console.log("✅ Loaded", apiProducts.length, "products from API");
        }
      } else {
        throw new Error("API request failed");
      }
    } catch (apiError) {
      console.warn("⚠️ API failed, using local fallback:", apiError);
      useLocalFallback = true;
    }

    let allProducts = apiProducts;
    if (
      useLocalFallback ||
      (apiProducts.length === 0 && typeof products !== "undefined")
    ) {
      console.log("📦 Using local products as fallback");
      allProducts = typeof products !== "undefined" ? products : apiProducts;
    } else if (typeof products !== "undefined" && products.length > 0) {
      const apiIds = new Set(apiProducts.map((p) => p.id || p._id));
      const localOnly = products.filter((p) => !apiIds.has(p.id));
      allProducts = [...apiProducts, ...localOnly];
      console.log(
        "🔄 Merged API and local products:",
        allProducts.length,
        "total"
      );
    }

    let filteredProducts = allProducts.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search) ||
        (product.farmer && product.farmer.toLowerCase().includes(search)) ||
        (product.location && product.location.toLowerCase().includes(search));

      const matchesPrice =
        product.price >= minPrice && product.price <= maxPrice;

      const matchesLocation =
        !location || (product.location && product.location === location);

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);

      return (
        matchesSearch && matchesPrice && matchesLocation && matchesCategory
      );
    });

    filteredProducts = sortProducts(filteredProducts, sortBy);

    updateFilters(allProducts);

    window.currentProducts = allProducts;

    renderProducts(filteredProducts);
    updateProductCount(filteredProducts.length);
  } catch (error) {
    console.error("Error loading products:", error);
    showError("Failed to load products. Please try again.");
  }
}

function sortProducts(products, sortBy) {
  const sorted = [...products];

  switch (sortBy) {
    case "price_low":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_high":
      return sorted.sort((a, b) => b.price - a.price);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "rating":
      // Since we don't have ratings in data.js, sort by price as fallback
      return sorted.sort((a, b) => b.price - a.price);
    case "newest":
    default:
      return sorted;
  }
}

function renderProducts(products) {
  const productsGrid = document.getElementById("productsGrid");

  if (!products || products.length === 0) {
    productsGrid.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666; grid-column: 1 / -1;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px; color: #ccc;"></i>
                <h3>No products found</h3>
                <p>Try adjusting your search or filters</p>
                <button onclick="clearFilters()" style="margin-top: 20px; padding: 10px 20px; background: #2f8f44; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Clear Filters
                </button>
            </div>
        `;
    return;
  }

  productsGrid.innerHTML = products
    .map((product) => {
      const productId = product._id || product.id;
      const isAvailable = (product.stock || product.stock === undefined) > 0;
      const categoryName = formatCategory(product.category);
      const farmerName = product.farmer || "Local Farmer";
      const location = product.location || "Local";

      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const inCart = cart.find((item) => item.productId === productId);
      const cartQuantity = inCart ? inCart.quantity : 0;

      return `
        <div class="product-card">
            <div class="product-image-container" onclick="viewProductDetails(event, '${productId}')">
                <img src="${product.image}" 
                     alt="${product.name}" 
                     class="product-image"
                     onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                <div class="category-badge">${categoryName.toUpperCase()}</div>
            </div>
            
            <div class="product-info">
                <div class="product-name" onclick="viewProductDetails(event, '${productId}')" style="cursor: pointer;">${
        product.name
      }</div>
                
                <div class="product-price">
                    ${product.price.toLocaleString()} ETB
                    <span class="product-unit">/ ${product.unit}</span>
                </div>
                
                <div class="product-farmer-info">
                    <div class="farmer-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="farmer-name" title="${farmerName}">${farmerName}</div>
                </div>
                
                <div class="product-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${location}</span>
                </div>
                
                <div class="quantity-selector">
                    <button class="quantity-btn" onclick="updateQuantity('${productId}', -1, event)">-</button>
                    <input type="number" 
                           id="qty_${productId}" 
                           class="quantity-input" 
                           value="${cartQuantity || 1}" 
                           min="1" 
                           max="${product.stock || 999}"
                           onchange="updateQuantityInput('${productId}', this.value)">
                    <button class="quantity-btn" onclick="updateQuantity('${productId}', 1, event)">+</button>
                </div>
                
                <div class="product-actions">
                    <button class="btn-add-to-cart ${
                      inCart ? "btn-added" : ""
                    }" 
                            onclick="addToCart(event, '${productId}', '${product.name.replace(
        /'/g,
        "\\'"
      )}', ${product.price}, '${product.unit}', '${product.image}', ${
        isAvailable ? "true" : "false"
      })" 
                            ${!isAvailable ? "disabled" : ""}
                            id="cartBtn_${productId}">
                        <i class="fas ${
                          inCart ? "fa-check" : "fa-cart-plus"
                        }"></i>
                        ${
                          inCart
                            ? "✓ Added to Cart"
                            : isAvailable
                            ? "Add to Basket"
                            : "Out of Stock"
                        }
                    </button>
                </div>
            </div>
        </div>
    `;
    })
    .join("");
}

function updateFilters(allProducts) {
  const categoryCounts = {};
  const locationCounts = {};
  let minPrice = Infinity;
  let maxPrice = 0;

  allProducts.forEach((product) => {
    categoryCounts[product.category] =
      (categoryCounts[product.category] || 0) + 1;

    locationCounts[product.location] =
      (locationCounts[product.location] || 0) + 1;

    minPrice = Math.min(minPrice, product.price);
    maxPrice = Math.max(maxPrice, product.price);
  });

  const categoryFilters = document.getElementById("categoryFilters");
  categoryFilters.innerHTML = Object.entries(categoryCounts)
    .map(
      ([category, count]) => `
        <div class="filter-option">
            <input type="checkbox" id="cat_${category}" value="${category}" 
                   onchange="loadProducts()">
            <label for="cat_${category}">
                ${formatCategory(category)} (${count})
            </label>
        </div>
    `
    )
    .join("");

  const locationFilter = document.getElementById("locationFilter");
  const locationOptions = Object.entries(locationCounts)
    .map(
      ([location, count]) => `
        <option value="${location}">${location} (${count})</option>
    `
    )
    .join("");
  locationFilter.innerHTML = `<option value="">All Locations</option>${locationOptions}`;

  document.getElementById("minPrice").placeholder = `Min (${minPrice} ETB)`;
  document.getElementById("maxPrice").placeholder = `Max (${maxPrice} ETB)`;
}

function updateProductCount(count) {
  document.getElementById("productCount").textContent = `${count} products`;
}

function updateQuantity(productId, change, event) {
  if (event) event.stopPropagation();

  const input = document.getElementById(`qty_${productId}`);
  if (!input) return;

  let currentQty = parseInt(input.value) || 1;
  const newQty = Math.max(1, currentQty + change);
  input.value = newQty;
}

function updateQuantityInput(productId, value) {
  const input = document.getElementById(`qty_${productId}`);
  if (input) {
    input.value = Math.max(1, parseInt(value) || 1);
  }
}

function addToCart(
  event,
  productId,
  productName,
  price,
  unit,
  image,
  isAvailable = true
) {
  event.stopPropagation();
  event.preventDefault();

  if (!isAvailable) {
    showNotification("This product is out of stock", "error");
    return;
  }

  let quantity = 1;
  const quantityInput = document.getElementById(`qty_${productId}`);

  if (quantityInput) {
    quantity = parseInt(quantityInput.value) || 1;
  } else {
    const parentElement = event.target.closest(".product-card");
    if (parentElement) {
      const qtyInput = parentElement.querySelector(".quantity-input");
      if (qtyInput) {
        quantity = parseInt(qtyInput.value) || 1;
      }
    }
  }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existingItem = cart.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity = quantity;
  } else {
    cart.push({
      productId: productId,
      name: productName,
      price: price,
      unit: unit,
      image: image,
      quantity: quantity,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  updateCartCount();

  const cartBtn = document.getElementById(`cartBtn_${productId}`);
  if (cartBtn) {
    cartBtn.classList.add("btn-added");
    cartBtn.innerHTML = '<i class="fas fa-check"></i> ✓ Added to Cart';
    cartBtn.disabled = false;

    setTimeout(() => {
      if (cartBtn) {
        cartBtn.classList.remove("btn-added");
        cartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Basket';
      }
    }, 2000);
  }

  showNotification(`${quantity} ${productName} added to cart!`, "success");

  animateCart();
}

function simpleAddToCart(productId, quantity = 1) {
  const product = window.currentProducts?.find(
    (p) => (p._id || p.id) === productId
  );

  if (!product) {
    showNotification("Product not found", "error");
    return;
  }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existingItem = cart.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      productId: productId,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      quantity: quantity,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  showNotification(`${quantity} ${product.name} added to cart!`, "success");
  animateCart();
}
async function viewProductDetails(event, productId) {
  if (event) event.stopPropagation();

  let product = null;

  if (
    typeof window.currentProducts !== "undefined" &&
    window.currentProducts.length > 0
  ) {
    product = window.currentProducts.find((p) => (p._id || p.id) === productId);
  }

  if (!product) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.product) {
          product = {
            id: data.product._id,
            _id: data.product._id,
            name: data.product.name,
            price: data.product.price,
            unit: data.product.unit,
            category: data.product.category,
            image: data.product.image?.startsWith("http")
              ? data.product.image
              : data.product.image?.startsWith("/")
              ? `http://localhost:5000${data.product.image}`
              : data.product.image ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            farmer:
              data.product.farmer?.fullName ||
              data.product.farmer?.farmName ||
              "Local Farmer",
            location:
              data.product.farmer?.city ||
              data.product.farmer?.farmLocation ||
              "Local",
            stock: data.product.stock || 0,
            description: data.product.description || "",
          };
        }
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  }

  if (!product && typeof products !== "undefined") {
    product = products.find((p) => (p._id || p.id) === productId);
  }

  if (!product) {
    showNotification("Product not found", "error");
    return;
  }

  showProductModal(product);
}

function showProductModal(product) {
  const modalHTML = `
        <div class="product-modal-overlay" id="productModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="product-modal" style="background: white; border-radius: 12px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0;">Product Details</h3>
                    <button onclick="closeProductModal()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 300px;">
                            <img src="${product.image}" 
                                 alt="${product.name}" 
                                 style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px;"
                                 onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'">
                        </div>
                        <div style="flex: 2; min-width: 300px;">
                            <h2 style="color: #222; margin-bottom: 0.5rem;">${
                              product.name
                            }</h2>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                                <span style="background: #e8f5e9; color: #4caf50; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.9rem;">
                                    ${formatCategory(product.category)}
                                </span>
                                <span style="color: #666; font-size: 0.9rem;">
                                    <i class="fas fa-map-marker-alt"></i> ${
                                      product.location
                                    }
                                </span>
                            </div>
                            
                            <div style="font-size: 2rem; font-weight: 700; color: #2f8f44; margin: 1rem 0;">
                                ${product.price.toLocaleString()} ETB/${
    product.unit
  }
                            </div>
                            
                            ${
                              product.stock !== undefined
                                ? `
                            <div style="margin: 1rem 0; padding: 0.75rem; background: #f5f5f5; border-radius: 6px;">
                                <strong>Stock:</strong> ${product.stock} ${product.unit} available
                            </div>
                            `
                                : ""
                            }
                            
                            <div style="margin: 1.5rem 0;">
                                <h4 style="margin-bottom: 0.5rem;">About this product:</h4>
                                <p style="color: #555; line-height: 1.6;">
                                    ${
                                      product.description ||
                                      `Fresh ${product.name.toLowerCase()} from ${
                                        product.farmer || "local farmer"
                                      }'s farm in ${
                                        product.location || "your area"
                                      }. This premium quality product is harvested daily and delivered fresh to your doorstep.`
                                    }
                                </p>
                            </div>
                            
                            <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
                                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      product.farmer
                                    )}&background=2f8f44&color=fff" 
                                         alt="${product.farmer}" 
                                         style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                                    <div>
                                        <div style="font-weight: 600;">${
                                          product.farmer
                                        }</div>
                                        <div style="color: #666; font-size: 0.9rem;">${
                                          product.location
                                        }</div>
                                    </div>
                                </div>
                                <p style="color: #666; font-size: 0.9rem; margin: 0;">
                                    <i class="fas fa-star" style="color: #ffc107;"></i> Trusted farmer with quality products
                                </p>
                            </div>
                            
                            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                                <div style="flex: 1;">
                                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Quantity</label>
                                    <input type="number" id="quantityInput" value="1" min="1" max="100" 
                                           style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px;">
                                </div>
                          <button onclick="simpleAddToCart('${
                            product.id
                          }', parseInt(document.getElementById('quantityInput').value) || 1); animateAddToCart(this);" 
        style="flex: 2; background: #2f8f44; color: white; border: none; padding: 0.75rem; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
    <i class="fas fa-cart-plus"></i>
    Add to Cart
</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (modal) {
    modal.remove();
    document.body.style.overflow = "auto";
  }
}

function addToCartFromModal(event, productId) {
  event.stopPropagation();

  const quantity =
    parseInt(document.getElementById("quantityInput")?.value) || 1;

  const product = window.currentProducts?.find(
    (p) => (p._id || p.id) === productId
  );

  if (!product) {
    showNotification("Product not found", "error");
    return;
  }

  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existingItem = cart.find((item) => item.productId === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      productId: productId,
      name: product.name,
      price: product.price,
      unit: product.unit,
      image: product.image,
      quantity: quantity,
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  showNotification(`${quantity} ${product.name} added to cart!`, "success");
  closeProductModal();
}
function formatCategory(category) {
  const categories = {
    vegetable: "Vegetable",
    fruit: "Fruit",
    grain: "Grain",
    spice: "Spice",
    dairy: "Dairy",
    meat: "Meat",
    poultry: "Poultry",
    other: "Other",
  };
  return (
    categories[category] || category.charAt(0).toUpperCase() + category.slice(1)
  );
}

function showLoading() {
  const productsGrid = document.getElementById("productsGrid");
  productsGrid.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #666; grid-column: 1 / -1;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 20px;"></i>
            <p>Loading products...</p>
        </div>
    `;
}

function showError(message) {
  const productsGrid = document.getElementById("productsGrid");
  productsGrid.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #666; grid-column: 1 / -1;">
            <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 20px; color: #f44336;"></i>
            <h3>Error Loading Products</h3>
            <p>${message}</p>
            <button onclick="loadProducts()" style="margin-top: 20px; padding: 10px 20px; background: #2f8f44; color: white; border: none; border-radius: 6px; cursor: pointer;">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    `;
}

function showNotification(message, type = "info") {
  const icon = type === "success" ? "✓" : type === "error" ? "✗" : "ℹ️";
  const bgColor =
    type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3";

  const notification = document.createElement("div");
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
        gap: 1rem;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        max-width: 350px;
        border-left: 4px solid ${bgColor};
    `;

  notification.innerHTML = `
        <div style="background: ${bgColor}; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ${icon}
        </div>
        <div>
            <p style="margin: 0; font-weight: 500;">${message}</p>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #666;">&times;</button>
    `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

function animateCart() {
  const cartIcon = document.querySelector(".fa-shopping-cart");
  if (cartIcon) {
    cartIcon.style.transform = "scale(1.3)";
    setTimeout(() => {
      cartIcon.style.transform = "scale(1)";
    }, 300);
  }
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  document.querySelectorAll("#cartCount, #headerCartCount").forEach((el) => {
    el.textContent = totalItems;
  });
}

if (!document.querySelector("#shop-animations")) {
  const style = document.createElement("style");
  style.id = "shop-animations";
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
}
function animateAddToCart(button) {
  button.classList.add("added");

  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> Added to Cart';

  setTimeout(() => {
    button.classList.remove("added");
    button.innerHTML = originalHTML;
  }, 2000);
}

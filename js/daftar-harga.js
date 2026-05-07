(function () {
      "use strict";

      const DEFAULT_SORT_MODE = "price-asc";
      const SEARCH_MIN_LENGTH = 2;
      const SEARCH_DEBOUNCE_MS = 380;

      function getRuntimeConfig() {
        const runtimeConfig = window.__PRICE_LIST_CONFIG__;
        if (!runtimeConfig || typeof runtimeConfig !== "object") {
          throw new Error("Konfigurasi daftar harga belum tersedia di HTML.");
        }
        const colors = runtimeConfig.colors && typeof runtimeConfig.colors === "object" ? runtimeConfig.colors : {};
        return {
          apiBase: runtimeConfig.apiBase || "",
          token: runtimeConfig.token || "",
          storeName: runtimeConfig.storeName || "",
          uploadEndpoint: runtimeConfig.uploadEndpoint || "",
          uploadDownloadEndpoint: runtimeConfig.uploadDownloadEndpoint || "",
          colors: {
            brand: colors.brand || "#2563eb",
            brandDark: colors.brandDark || "#1e40af",
            brandSoft: colors.brandSoft || "#dbeafe",
          },
          pageSize: Number(runtimeConfig.pageSize) || 100,
        };
      }

      const CONFIG = getRuntimeConfig();

      const PRINT_SETTINGS_STORAGE_KEY = "bukaolshop-price-list-print-settings";

      const state = {
        categories: [],
        activeRootCategoryId: "",
        activeCategoryId: "",
        productsByCategory: new Map(),
        search: "",
        searchTimer: 0,
        searchRequestId: 0,
        searchResults: {
          query: "",
          products: [],
          page: 0,
          hasMore: false,
          loading: false,
          error: "",
        },
        sortMode: DEFAULT_SORT_MODE,
        printSettings: null,
        previewCanvas: null,
        previewFileName: "",
        downloadUrl: "",
        isUploadingDownload: false,
        loading: false,
        error: "",
      };

      const selectors = {
        storeName: "#storeName",
        printButton: "#printButton",
        globalSettingsButton: "#globalSettingsButton",
        printSettingsModal: "#printSettingsModal",
        closePrintSettingsButton: "#closePrintSettingsButton",
        printPreviewModal: "#printPreviewModal",
        closePrintPreviewButton: "#closePrintPreviewButton",
        printStoreName: "#printStoreName",
        markupType: "#markupType",
        markupValue: "#markupValue",
        previewButton: "#previewButton",
        savePrintSettingsButton: "#savePrintSettingsButton",
        downloadPreviewButton: "#downloadPreviewButton",
        downloadResult: "#downloadResult",
        downloadLink: "#downloadLink",
        copyDownloadLinkButton: "#copyDownloadLinkButton",
        previewImage: "#previewImage",
        previewEmpty: "#previewEmpty",
        refreshButton: "#refreshButton",
        searchInput: "#searchInput",
        sortSelect: "#sortSelect",
        categoryStrip: "#categoryStrip",
        subCategoryStrip: "#subCategoryStrip",
        productList: "#productList",
        activeCategoryTitle: "#activeCategoryTitle",
        activeCategoryMeta: "#activeCategoryMeta",
        syncDot: "#syncDot",
        syncText: "#syncText",
        syncState: "#syncState",
        loadMoreButton: "#loadMoreButton",
        toast: "#toast",
      };

      function hasUnresolvedShortcode(value) {
        return /\{\{[^}]+}}/.test(String(value || ""));
      }

      function formatRupiah(value) {
        const number = Number(value || 0);
        const safeNumber = Number.isFinite(number) ? number : 0;
        return new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        })
          .format(safeNumber)
          .replace(/\s/g, "");
      }

      function getSafeNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
      }

      function normalizePrintSettings(settings) {
        const source = settings || {};
        const markupType = source.markupType === "percent" || source.type === "percent" ? "percent" : "nominal";
        const markupValue = Math.max(0, getSafeNumber(source.markupValue ?? source.value));
        const storeName = String(source.storeName || "").trim() || getDisplayStoreName();
        return {
          storeName,
          markupType,
          markupValue,
        };
      }

      function applyPriceMarkup(price, settings) {
        const basePrice = Math.max(0, getSafeNumber(price));
        const printSettings = normalizePrintSettings(settings);
        if (printSettings.markupType === "percent") {
          return Math.round(basePrice + basePrice * (printSettings.markupValue / 100));
        }
        return Math.round(basePrice + printSettings.markupValue);
      }

      function buildApiUrl(path, params) {
        const url = new URL(CONFIG.apiBase + path);
        Object.entries(params || {}).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, String(value));
          }
        });
        return url;
      }

      function flattenCategories(categories) {
        return (categories || [])
          .map((category) => {
            const children = (category.sub_kategori || [])
              .map((child) => normalizeCategory(child, 1))
              .filter((item) => item.id);
            return {
              id: String(category.id_kategori || ""),
              name: String(category.nama_kategori || "Tanpa nama"),
              image: category.gambar_kategori || "",
              url: category.url_kategori || "",
              depth: 0,
              children,
              hasChildren: Boolean(children.length),
            };
          })
          .filter((item) => item.id);
      }

      function normalizeCategory(category, depth) {
        const children = (category.sub_kategori || [])
          .map((child) => normalizeCategory(child, depth + 1))
          .filter((item) => item.id);
        return {
            id: String(category.id_kategori || ""),
            name: String(category.nama_kategori || "Tanpa nama"),
            image: category.gambar_kategori || "",
            url: category.url_kategori || "",
          depth,
          children,
          hasChildren: Boolean(children.length),
        };
      }

      function listCategoryTree(categories) {
        return (categories || []).flatMap((category) => {
          return [category, ...listCategoryTree(category.children)];
        });
      }

      function getCategoryPath(categories, categoryId) {
        const id = String(categoryId || "");
        if (!id) {
          return [];
        }

        for (const category of categories || []) {
          if (category.id === id) {
            return [category];
          }

          const childPath = getCategoryPath(category.children, id);
          if (childPath.length) {
            return [category, ...childPath];
          }
        }

        return [];
      }

      function getCategoryPathLabel(categories, categoryId) {
        const names = getCategoryPath(categories, categoryId)
          .map((category) => category.name)
          .filter(Boolean);
        return names.length ? names.join(" > ") : "Kategori tidak ditemukan";
      }

      function findCategoryById(categories, categoryId) {
        const id = String(categoryId || "");
        return listCategoryTree(categories).find((category) => category.id === id) || null;
      }

      function getCategoryChildren(categories, categoryId) {
        const category = findCategoryById(categories, categoryId);
        return category ? category.children || [] : [];
      }

      function getFirstSelectableCategoryId(category) {
        if (!category) {
          return "";
        }
        if (category.children && category.children.length) {
          return getFirstSelectableCategoryId(category.children[0]);
        }
        return category.id || "";
      }

      function getRootCategoryForCategoryId(categories, categoryId) {
        const id = String(categoryId || "");
        return (categories || []).find((root) => {
          return root.id === id || Boolean(findCategoryById(root.children, id));
        }) || null;
      }

      function getCategorySelection(categories, categoryId) {
        const category = findCategoryById(categories, categoryId);
        const root = getRootCategoryForCategoryId(categories, categoryId);
        if (!category || !root) {
          return { rootId: "", categoryId: "" };
        }
        return {
          rootId: root.id,
          categoryId: getFirstSelectableCategoryId(category),
        };
      }

      function findPreferredCategory(categories, preferredNames) {
        const allCategories = listCategoryTree(categories);
        return (preferredNames || [])
          .map((name) => {
            const normalizedName = String(name).trim().toLowerCase();
            return allCategories.find((category) => {
              return String(category.name || "").trim().toLowerCase() === normalizedName;
            });
          })
          .find(Boolean) || null;
      }

      function pickInitialCategoryId(categories, preferredNames) {
        const preferred = findPreferredCategory(categories, preferredNames);
        if (preferred) {
          return getFirstSelectableCategoryId(preferred);
        }

        return getFirstSelectableCategoryId((categories || [])[0]);
      }

      function filterProducts(products, query) {
        const keyword = String(query || "").trim().toLowerCase();
        if (!keyword) {
          return products || [];
        }
        return (products || []).filter((product) => {
          return String(product.nama_produk || "").toLowerCase().includes(keyword);
        });
      }

      function sortProducts(products, sortMode) {
        const items = [...(products || [])];
        if (sortMode === "price-asc") {
          return items.sort((a, b) => Number(a.harga_produk || 0) - Number(b.harga_produk || 0));
        }
        if (sortMode === "price-desc") {
          return items.sort((a, b) => Number(b.harga_produk || 0) - Number(a.harga_produk || 0));
        }
        if (sortMode === "name-asc") {
          return items.sort((a, b) => {
            return String(a.nama_produk || "").localeCompare(String(b.nama_produk || ""), "id", {
              sensitivity: "base",
              numeric: true,
            });
          });
        }
        return items;
      }

      function getVisibleProducts(products, query, sortMode) {
        return sortProducts(filterProducts(products, query), sortMode);
      }

      function getSearchKeyword() {
        return String(state.search || "").trim();
      }

      function hasSearchKeyword() {
        return Boolean(getSearchKeyword());
      }

      function canRunGlobalSearch() {
        return getSearchKeyword().length >= SEARCH_MIN_LENGTH;
      }

      function createEmptySearchResults(query) {
        return {
          query: String(query || ""),
          products: [],
          page: 0,
          hasMore: false,
          loading: false,
          error: "",
        };
      }

      function buildPrintableRows(products, query, sortMode, printSettings) {
        const settings = normalizePrintSettings(printSettings || state.printSettings);
        return getVisibleProducts(products, query, sortMode || state.sortMode).map((product) => ({
          name: String(product.nama_produk || "Produk tanpa nama"),
          price: formatRupiah(applyPriceMarkup(product.harga_produk, settings)),
        }));
      }

      function slugify(value) {
        return String(value || "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      function createShortId(length) {
        const size = Number(length) > 0 ? Number(length) : 8;
        const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
        const cryptoSource = window.crypto || globalThis.crypto;
        const bytes = new Uint8Array(size);
        if (cryptoSource && typeof cryptoSource.getRandomValues === "function") {
          cryptoSource.getRandomValues(bytes);
        } else {
          for (let index = 0; index < size; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
          }
        }
        return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
      }

      function createPrintFileName(title, categoryName, uniqueId) {
        const name = slugify([title, categoryName].filter(Boolean).join(" "));
        const suffix = slugify(uniqueId || createShortId());
        return (name || "daftar-harga") + (suffix ? "-" + suffix : "") + ".png";
      }

      function buildDownloadUrl(fileUrl, filename) {
        return CONFIG.uploadDownloadEndpoint
          + "?url=" + encodeURIComponent(fileUrl)
          + "&filename=" + encodeURIComponent(filename);
      }

      function calculatePrintCanvasHeight(rowCount) {
        return 392 + Math.max(0, Number(rowCount) || 0) * 60;
      }

      function getStockLabel(product) {
        const stock = Number(product && product.stok);
        if (!Number.isFinite(stock)) {
          return "Stok tersedia";
        }
        if (stock <= 0) {
          return "Stok habis";
        }
        return "Stok " + stock;
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      window.__priceListHelpers = {
        applyPriceMarkup,
        buildPrintableRows,
        buildApiUrl,
        buildDownloadUrl,
        calculatePrintCanvasHeight,
        createPriceListCanvas,
        createPrintFileName,
        createShortId,
        DEFAULT_SORT_MODE,
        findCategoryById,
        filterProducts,
        flattenCategories,
        formatRupiah,
        getCategoryChildren,
        getCategoryPath,
        getCategoryPathLabel,
        getCategorySelection,
        getVisibleProducts,
        hasUnresolvedShortcode,
        normalizePrintSettings,
        pickInitialCategoryId,
        sortProducts,
      };

      function getElement(key) {
        return document.querySelector(selectors[key]);
      }

      function setText(key, value) {
        const element = getElement(key);
        if (element) {
          element.textContent = value;
        }
      }

      function showToast(message) {
        const toast = getElement("toast");
        if (!toast) {
          return;
        }
        toast.textContent = message;
        toast.classList.add("is-visible");
        window.clearTimeout(showToast.timer);
        showToast.timer = window.setTimeout(() => {
          toast.classList.remove("is-visible");
        }, 3200);
      }

      function setSync(status, message) {
        const dot = getElement("syncDot");
        if (dot) {
          dot.className = "sync-dot";
          if (status === "loading") dot.classList.add("is-loading");
          if (status === "error") dot.classList.add("is-error");
        }
        setText("syncText", message);
      }

      function getDisplayStoreName() {
        return hasUnresolvedShortcode(CONFIG.storeName) ? "Toko Demo Nusantara" : CONFIG.storeName;
      }

      async function fetchJson(path, params) {
        const response = await fetch(buildApiUrl(path, { token: CONFIG.token, ...params }), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
        const payload = await response.json();
        if (payload.code && Number(payload.code) >= 400) {
          throw new Error(payload.status || "Permintaan gagal");
        }
        return payload;
      }

      async function loadCategories() {
        state.loading = true;
        state.error = "";
        setSync("loading", "Memuat");
        renderSkeleton("Memuat kategori");

        const payload = await fetchJson("/app/kategori", {});
        state.categories = flattenCategories(payload.data);
        state.activeCategoryId = pickInitialCategoryId(state.categories);
        state.activeRootCategoryId = getCategorySelection(state.categories, state.activeCategoryId).rootId;

        renderCategories();
        scrollActiveCategoryIntoView();

        if (!state.activeCategoryId) {
          renderEmpty("Kategori belum tersedia", "Tidak ada kategori yang dapat ditampilkan.");
          setSync("ready", "Siap");
          return;
        }

        await loadProductsForActiveCategory({ reset: true });
      }

      async function loadProductsForActiveCategory(options) {
        const reset = Boolean(options && options.reset);
        const categoryId = state.activeCategoryId;
        if (!categoryId) return;

        const cached = state.productsByCategory.get(categoryId) || {
          products: [],
          page: 0,
          hasMore: true,
        };

        if (cached.products.length && reset) {
          state.loading = false;
          setSync("ready", "Siap");
          renderProducts();
          return;
        }

        const nextPage = reset ? 1 : cached.page + 1;
        state.loading = true;
        setSync("loading", "Memuat");
        if (nextPage === 1) {
          renderSkeleton("Memuat produk");
        }
        updateLoadMoreButton(true);

        const payload = await fetchJson("/app/produk", {
          id_kategori: categoryId,
          page: nextPage,
          total_data: CONFIG.pageSize,
        });
        const products = Array.isArray(payload.data) ? payload.data : [];
        const nextProducts = nextPage === 1 ? products : cached.products.concat(products);
        state.productsByCategory.set(categoryId, {
          products: nextProducts,
          page: nextPage,
          hasMore: products.length === CONFIG.pageSize,
        });

        state.loading = false;
        setSync("ready", "Siap");
        renderProducts();
      }

      async function loadSearchProducts(options) {
        const reset = Boolean(options && options.reset);
        const query = getSearchKeyword();
        if (!canRunGlobalSearch()) {
          state.searchRequestId += 1;
          state.searchResults = createEmptySearchResults(query);
          renderProducts();
          updateLoadMoreButton(false);
          return;
        }

        const requestId = state.searchRequestId + 1;
        state.searchRequestId = requestId;
        const current = state.searchResults.query === query ? state.searchResults : createEmptySearchResults(query);
        const nextPage = reset ? 1 : current.page + 1;

        state.loading = true;
        state.searchResults = {
          query,
          products: nextPage === 1 ? [] : current.products,
          page: current.page,
          hasMore: current.hasMore,
          loading: true,
          error: "",
        };
        setSync("loading", "Mencari");
        renderProducts();
        updateLoadMoreButton(true);

        try {
          const payload = await fetchJson("/app/produk", {
            page: nextPage,
            total_data: CONFIG.pageSize,
            cari_nama_produk: query,
          });

          if (requestId !== state.searchRequestId || query !== getSearchKeyword()) {
            return;
          }

          const products = Array.isArray(payload.data) ? payload.data : [];
          const nextProducts = nextPage === 1 ? products : current.products.concat(products);
          state.searchResults = {
            query,
            products: nextProducts,
            page: nextPage,
            hasMore: products.length === CONFIG.pageSize,
            loading: false,
            error: "",
          };
          state.loading = false;
          setSync("ready", "Siap");
          renderProducts();
        } catch (error) {
          if (requestId !== state.searchRequestId) {
            return;
          }
          state.loading = false;
          state.searchResults = {
            query,
            products: current.products,
            page: current.page,
            hasMore: false,
            loading: false,
            error: error && error.message ? error.message : "Pencarian gagal",
          };
          setSync("error", "Gagal");
          renderProducts();
          showToast("Pencarian produk gagal.");
        }
      }

      function renderCategories() {
        const strip = getElement("categoryStrip");
        if (!strip) return;

        strip.innerHTML = state.categories
          .map((category) => {
            const activeClass = category.id === state.activeRootCategoryId ? " is-active" : "";
            const childClass = category.hasChildren ? " has-children" : "";
            const label = "Kategori " + category.name;
            return [
              '<button class="category-button' + activeClass + childClass + '" type="button" data-category-id="' + escapeHtml(category.id) + '" aria-label="' + escapeHtml(label) + '">',
              '<span class="category-dot" aria-hidden="true"></span>',
              '<span class="category-name">' + escapeHtml(category.name) + "</span>",
              category.hasChildren ? '<span class="category-arrow" aria-hidden="true">›</span>' : "",
              "</button>",
            ].join("");
          })
          .join("");
        renderSubcategories();
      }

      function renderSubcategories() {
        const strip = getElement("subCategoryStrip");
        if (!strip) return;

        const root = state.categories.find((category) => category.id === state.activeRootCategoryId);
        const children = root ? root.children || [] : [];
        if (!children.length) {
          strip.innerHTML = "";
          strip.hidden = true;
          return;
        }

        strip.hidden = false;
        strip.innerHTML = children
          .map((category) => {
            const activeClass = category.id === state.activeCategoryId ? " is-active" : "";
            const label = "Subkategori " + category.name;
            return [
              '<button class="category-button subcategory-button' + activeClass + '" type="button" data-category-id="' + escapeHtml(category.id) + '" aria-label="' + escapeHtml(label) + '">',
              '<span class="category-dot" aria-hidden="true"></span>',
              '<span class="category-name">' + escapeHtml(category.name) + "</span>",
              "</button>",
            ].join("");
          })
          .join("");
      }

      function scrollActiveCategoryIntoView() {
        window.requestAnimationFrame(() => {
          [state.activeRootCategoryId, state.activeCategoryId].forEach((categoryId) => {
            const button = Array.from(document.querySelectorAll("[data-category-id]")).find((item) => {
              return item.getAttribute("data-category-id") === categoryId;
            });
            if (button) {
              button.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }
          });
        });
      }

      function renderProducts() {
        if (hasSearchKeyword()) {
          renderSearchProducts();
          return;
        }

        const rootCategory = state.categories.find((item) => item.id === state.activeRootCategoryId);
        const category = findCategoryById(state.categories, state.activeCategoryId);
        const current = state.productsByCategory.get(state.activeCategoryId) || {
          products: [],
          hasMore: false,
        };
        const visibleProducts = getVisibleProducts(current.products, state.search, state.sortMode);

        setText("activeCategoryTitle", category ? category.name : "Daftar produk");
        const categoryContext = rootCategory && category && rootCategory.id !== category.id ? rootCategory.name + " • " : "";
        setText(
          "activeCategoryMeta",
          categoryContext + visibleProducts.length + " dari " + current.products.length + " produk"
        );

        if (!current.products.length) {
          renderEmpty("Produk belum tersedia", "Kategori ini belum memiliki data produk.");
          updateLoadMoreButton(false);
          return;
        }

        if (!visibleProducts.length) {
          renderEmpty("Produk tidak ditemukan", "Coba gunakan kata kunci lain.");
          updateLoadMoreButton(false);
          return;
        }

        const list = getElement("productList");
        if (!list) return;

        list.innerHTML = visibleProducts.map(renderProductRow).join("");
        updateLoadMoreButton(current.hasMore && !state.search);
      }

      function renderSearchProducts() {
        const query = getSearchKeyword();
        const result = state.searchResults.query === query ? state.searchResults : createEmptySearchResults(query);
        const visibleProducts = sortProducts(result.products, state.sortMode);

        setText("activeCategoryTitle", "Hasil pencarian");

        if (query.length < SEARCH_MIN_LENGTH) {
          setText("activeCategoryMeta", "Minimal " + SEARCH_MIN_LENGTH + " huruf");
          renderEmpty("Ketik nama produk", "Pencarian akan mencari produk dari semua kategori.");
          updateLoadMoreButton(false);
          return;
        }

        if (result.loading && !result.products.length) {
          renderSkeleton("Mencari produk");
          updateLoadMoreButton(false);
          return;
        }

        setText("activeCategoryMeta", visibleProducts.length + " hasil untuk \"" + query + "\"");

        if (result.error && !visibleProducts.length) {
          renderEmpty("Pencarian gagal", "Coba ulangi pencarian beberapa saat lagi.");
          updateLoadMoreButton(false);
          return;
        }

        if (!visibleProducts.length) {
          renderEmpty("Produk tidak ditemukan", "Coba gunakan kata kunci lain.");
          updateLoadMoreButton(false);
          return;
        }

        const list = getElement("productList");
        if (!list) return;

        list.innerHTML = visibleProducts.map(renderSearchResultRow).join("");
        updateLoadMoreButton(result.hasMore);
      }

      function renderProductRow(product) {
        const price = Number(product.harga_produk || 0);
        const originalPrice = Number(product.harga_produk_asli || 0);
        const hasDiscount = originalPrice > price && price > 0;
        const stockLabel = escapeHtml(getStockLabel(product));

        return [
          '<article class="product-row">',
          '<div class="product-main">',
          '<h3 class="product-name">' + escapeHtml(product.nama_produk || "Produk tanpa nama") + "</h3>",
          '<div class="product-meta"><span>' + stockLabel + "</span></div>",
          "</div>",
          '<div class="product-price">',
          '<span class="price-now">' + formatRupiah(price) + "</span>",
          hasDiscount ? '<span class="price-before">' + formatRupiah(originalPrice) + "</span>" : "",
          "</div>",
          "</article>",
        ].join("");
      }

      function renderSearchResultRow(product) {
        const categoryId = String(product.id_kategori || "");
        const categoryPath = getCategoryPath(state.categories, categoryId);
        const categoryPathLabel = getCategoryPathLabel(state.categories, categoryId);
        const price = Number(product.harga_produk || 0);
        const originalPrice = Number(product.harga_produk_asli || 0);
        const hasDiscount = originalPrice > price && price > 0;
        const stockLabel = escapeHtml(getStockLabel(product));

        return [
          '<article class="product-row search-result-row">',
          '<div class="product-main">',
          '<h3 class="product-name">' + escapeHtml(product.nama_produk || "Produk tanpa nama") + "</h3>",
          '<div class="product-meta">',
          '<span class="category-path">' + escapeHtml(categoryPathLabel) + "</span>",
          '<span>' + stockLabel + "</span>",
          "</div>",
          "</div>",
          '<div class="product-price">',
          '<span class="price-now">' + formatRupiah(price) + "</span>",
          hasDiscount ? '<span class="price-before">' + formatRupiah(originalPrice) + "</span>" : "",
          categoryPath.length
            ? '<button class="open-category-button" type="button" data-open-search-category="' + escapeHtml(categoryId) + '">Buka kategori</button>'
            : '<span class="category-missing">Tidak ada kategori</span>',
          "</div>",
          "</article>",
        ].join("");
      }

      function renderSkeleton(message) {
        setText("activeCategoryTitle", message);
        setText("activeCategoryMeta", "Mohon tunggu sebentar");

        const list = getElement("productList");
        if (!list) return;
        list.innerHTML = Array.from({ length: 6 })
          .map(() => {
            return [
              '<div class="product-row skeleton" aria-hidden="true">',
              '<div>',
              '<div class="skeleton-line"></div>',
              '<div class="skeleton-line short"></div>',
              "</div>",
              '<div style="width:76px"><div class="skeleton-line"></div></div>',
              "</div>",
            ].join("");
          })
          .join("");
      }

      function renderEmpty(title, message) {
        const list = getElement("productList");
        if (!list) return;
        list.innerHTML =
          '<div class="state-box"><strong>' +
          escapeHtml(title) +
          "</strong><span>" +
          escapeHtml(message) +
          "</span></div>";
      }

      function updateLoadMoreButton(forceLoading) {
        const button = getElement("loadMoreButton");
        if (!button) return;
        if (hasSearchKeyword()) {
          const result = state.searchResults;
          const isLoading = Boolean(forceLoading || state.loading || (result && result.loading));
          const shouldShow = canRunGlobalSearch() && result && result.hasMore;
          button.classList.toggle("is-visible", Boolean(shouldShow));
          button.disabled = isLoading;
          button.textContent = isLoading ? "Mencari..." : "Muat hasil lagi";
          return;
        }

        const current = state.productsByCategory.get(state.activeCategoryId);
        const shouldShow = current && current.hasMore && !state.search;
        button.classList.toggle("is-visible", Boolean(shouldShow));
        button.disabled = Boolean(forceLoading || state.loading);
        button.textContent = forceLoading || state.loading ? "Memuat..." : "Muat lagi";
      }

      function getActiveCategory() {
        return findCategoryById(state.categories, state.activeCategoryId);
      }

      function fitCanvasText(context, text, maxWidth) {
        const value = String(text || "");
        if (context.measureText(value).width <= maxWidth) {
          return value;
        }

        let clipped = value;
        while (clipped.length > 1 && context.measureText(clipped + "...").width > maxWidth) {
          clipped = clipped.slice(0, -1);
        }
        return clipped + "...";
      }

      function drawRoundedRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.arcTo(x + width, y, x + width, y + height, radius);
        context.arcTo(x + width, y + height, x, y + height, radius);
        context.arcTo(x, y + height, x, y, radius);
        context.arcTo(x, y, x + width, y, radius);
        context.closePath();
      }

      function createPriceListCanvas(printData) {
        const width = 1080;
        const height = calculatePrintCanvasHeight(printData.rows.length);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const margin = 64;
        const rowHeight = 60;
        const rowGap = 0;
        const rowStartY = 246;
        const tableHeaderY = 202;
        const tableWidth = width - margin * 2;
        const numberColumnWidth = 72;
        const priceColumnWidth = 260;
        const productColumnX = margin + numberColumnWidth + 24;
        const priceColumnX = width - margin - priceColumnWidth;
        const priceTextX = width - margin - 18;

        canvas.width = width;
        canvas.height = height;

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        const dateLabel = new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(printData.createdAt);
        const countLabel = printData.rows.length + " produk";
        const queryLabel = printData.query ? "Filter: " + printData.query : "";

        context.fillStyle = "#0f172a";
        context.font = "800 21px Inter, Arial, sans-serif";
        context.fillText(
          fitCanvasText(context, String(printData.storeName || "Toko Demo Nusantara").toUpperCase(), 560),
          margin + 2,
          58
        );

        context.fillStyle = "#475569";
        context.font = "750 20px Inter, Arial, sans-serif";
        context.textAlign = "right";
        context.fillText("Update: " + dateLabel, width - margin, 58);
        context.textAlign = "left";

        context.fillStyle = "#0f172a";
        context.font = "900 42px Inter, Arial, sans-serif";
        context.fillText("DAFTAR HARGA PRODUK", margin, 116);

        context.strokeStyle = "#0f172a";
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(margin, 134);
        context.lineTo(width - margin, 134);
        context.stroke();

        context.fillStyle = "#64748b";
        context.font = "800 20px Inter, Arial, sans-serif";
        context.fillText("Kategori:", margin + 2, 172);
        context.fillText("Total:", width - margin - 188, 172);

        context.fillStyle = "#0f172a";
        context.font = "850 23px Inter, Arial, sans-serif";
        context.fillText(fitCanvasText(context, printData.categoryName, 520), margin + 116, 172);
        context.fillText(countLabel, width - margin - 120, 172);

        if (queryLabel) {
          context.fillStyle = "#64748b";
          context.font = "750 18px Inter, Arial, sans-serif";
          context.fillText(fitCanvasText(context, queryLabel, 720), margin + 2, 194);
        }

        context.fillStyle = "#0f172a";
        context.fillRect(margin, 190, tableWidth, 2);

        context.fillStyle = "#f8fafc";
        context.fillRect(margin, tableHeaderY, tableWidth, 44);
        context.strokeStyle = "#cbd5e1";
        context.lineWidth = 1;
        context.strokeRect(margin, tableHeaderY, tableWidth, 44);

        context.fillStyle = "#334155";
        context.font = "850 19px Inter, Arial, sans-serif";
        context.fillText("No", margin + 22, tableHeaderY + 29);
        context.fillText("Produk", productColumnX, tableHeaderY + 29);
        context.textAlign = "right";
        context.fillText("Harga", priceTextX, tableHeaderY + 29);
        context.textAlign = "left";

        printData.rows.forEach((row, index) => {
          const y = rowStartY + index * (rowHeight + rowGap);
          context.fillStyle = index % 2 === 0 ? "#ffffff" : "#fbfdff";
          context.fillRect(margin, y, tableWidth, rowHeight);

          context.strokeStyle = "#e2e8f0";
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(margin, y + rowHeight);
          context.lineTo(width - margin, y + rowHeight);
          context.moveTo(margin + numberColumnWidth, y);
          context.lineTo(margin + numberColumnWidth, y + rowHeight);
          context.moveTo(priceColumnX, y);
          context.lineTo(priceColumnX, y + rowHeight);
          context.stroke();

          context.fillStyle = "#334155";
          context.font = "850 19px Inter, Arial, sans-serif";
          context.textAlign = "center";
          context.fillText(String(index + 1).padStart(2, "0"), margin + 36, y + 38);
          context.textAlign = "left";

          context.fillStyle = "#0f172a";
          context.font = "820 25px Inter, Arial, sans-serif";
          context.fillText(fitCanvasText(context, row.name, 570), productColumnX, y + 38);

          context.fillStyle = "#111827";
          context.font = "900 25px Inter, Arial, sans-serif";
          context.textAlign = "right";
          context.fillText(row.price, priceTextX, y + 38);
          context.textAlign = "left";
        });

        const footerY = rowStartY + printData.rows.length * (rowHeight + rowGap) + 36;
        context.fillStyle = "#f8fafc";
        context.fillRect(margin, footerY, tableWidth, 46);
        context.strokeStyle = "#e2e8f0";
        context.lineWidth = 1;
        context.strokeRect(margin, footerY, tableWidth, 46);

        context.fillStyle = "#64748b";
        context.font = "800 20px Inter, Arial, sans-serif";
        context.textAlign = "center";
        context.fillText("Harga dapat berubah sewaktu-waktu", width / 2, footerY + 31);
        context.textAlign = "left";

        return canvas;
      }

      function canvasToPngBlob(canvas) {
        return new Promise((resolve, reject) => {
          if (!canvas || typeof canvas.toBlob !== "function") {
            reject(new Error("Browser tidak mendukung export gambar."));
            return;
          }
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error("Gagal membuat file gambar."));
              return;
            }
            resolve(blob);
          }, "image/png");
        });
      }

      async function uploadPrintImage(blob, filename) {
        const formData = new FormData();
        const fileObj = new File([blob], filename, { type: blob.type || "image/png" });
        formData.append("file", fileObj);

        const uploadRes = await fetch(CONFIG.uploadEndpoint, {
          method: "POST",
          headers: { "x-api-key": "fanfanstore" },
          body: formData,
        });

        let uploadJson;
        try {
          uploadJson = await uploadRes.json();
        } catch (error) {
          throw new Error("Respons upload tidak valid.");
        }

        if (!uploadRes.ok || !uploadJson.success) {
          throw new Error(uploadJson.error || "Upload gagal");
        }

        const fileUrl = uploadJson.data && uploadJson.data.url;
        if (!fileUrl) {
          throw new Error("Link file upload tidak tersedia.");
        }

        return buildDownloadUrl(fileUrl, filename);
      }

      function readStoredPrintSettings() {
        try {
          return normalizePrintSettings(JSON.parse(window.localStorage.getItem(PRINT_SETTINGS_STORAGE_KEY) || "{}"));
        } catch (error) {
          return normalizePrintSettings({});
        }
      }

      function savePrintSettings(settings) {
        try {
          window.localStorage.setItem(PRINT_SETTINGS_STORAGE_KEY, JSON.stringify(normalizePrintSettings(settings)));
        } catch (error) {
          return;
        }
      }

      function setPrintSettingsForm(settings) {
        const normalized = normalizePrintSettings(settings);
        const storeNameInput = getElement("printStoreName");
        const markupTypeSelect = getElement("markupType");
        const markupValueInput = getElement("markupValue");
        if (storeNameInput) storeNameInput.value = normalized.storeName;
        if (markupTypeSelect) markupTypeSelect.value = normalized.markupType;
        if (markupValueInput) markupValueInput.value = normalized.markupValue ? String(normalized.markupValue) : "";
      }

      function getPrintSettingsFromForm() {
        const storeNameInput = getElement("printStoreName");
        const markupTypeSelect = getElement("markupType");
        const markupValueInput = getElement("markupValue");
        return normalizePrintSettings({
          storeName: storeNameInput ? storeNameInput.value : "",
          markupType: markupTypeSelect ? markupTypeSelect.value : "nominal",
          markupValue: markupValueInput ? markupValueInput.value : 0,
        });
      }

      function getActivePrintSettings() {
        return normalizePrintSettings(state.printSettings || readStoredPrintSettings());
      }

      function getPrintPreviewData(settings) {
        const category = getActiveCategory();
        const current = state.productsByCategory.get(state.activeCategoryId);
        const rows = buildPrintableRows(current ? current.products : [], state.search, state.sortMode, settings);
        return {
          category,
          rows,
          fileName: createPrintFileName("Daftar Harga", category ? category.name : ""),
        };
      }

      function setPreviewEmpty(message) {
        const image = getElement("previewImage");
        const empty = getElement("previewEmpty");
        const downloadButton = getElement("downloadPreviewButton");
        clearDownloadLink();
        if (image) {
          image.hidden = true;
          image.removeAttribute("src");
        }
        if (empty) {
          empty.hidden = false;
          empty.textContent = message;
        }
        if (downloadButton) downloadButton.disabled = true;
        state.previewCanvas = null;
        state.previewFileName = "";
      }

      function clearDownloadLink() {
        const result = getElement("downloadResult");
        const link = getElement("downloadLink");
        state.downloadUrl = "";
        if (result) result.hidden = true;
        if (link) {
          link.removeAttribute("href");
          link.textContent = "Buka link download";
        }
      }

      function renderDownloadLink(downloadUrl) {
        const result = getElement("downloadResult");
        const link = getElement("downloadLink");
        state.downloadUrl = downloadUrl || "";
        if (!downloadUrl) {
          clearDownloadLink();
          return;
        }
        if (result) result.hidden = false;
        if (link) {
          link.href = downloadUrl;
          link.textContent = downloadUrl;
        }
      }

      function setDownloadLoading(isLoading) {
        const downloadButton = getElement("downloadPreviewButton");
        const previewButton = getElement("previewButton");
        state.isUploadingDownload = Boolean(isLoading);
        if (downloadButton) {
          downloadButton.disabled = state.isUploadingDownload || !state.previewCanvas;
          downloadButton.textContent = state.isUploadingDownload ? "Membuat link..." : "Buat link download";
        }
        if (previewButton) {
          previewButton.disabled = state.isUploadingDownload;
        }
      }

      function renderPrintPreview() {
        const settings = getActivePrintSettings();
        state.printSettings = settings;
        clearDownloadLink();

        const previewData = getPrintPreviewData(settings);
        if (!previewData.category || !previewData.rows.length) {
          setPreviewEmpty("Tidak ada produk untuk dibuat preview.");
          return;
        }

        const canvas = createPriceListCanvas({
          storeName: settings.storeName,
          categoryName: previewData.category.name,
          rows: previewData.rows,
          query: state.search,
          createdAt: new Date(),
        });
        const image = getElement("previewImage");
        const empty = getElement("previewEmpty");
        const downloadButton = getElement("downloadPreviewButton");
        state.previewCanvas = canvas;
        state.previewFileName = previewData.fileName;
        if (image) {
          image.src = canvas.toDataURL("image/png");
          image.hidden = false;
        }
        if (empty) empty.hidden = true;
        if (downloadButton) downloadButton.disabled = false;
      }

      function saveCurrentPrintSettings() {
        const settings = getPrintSettingsFromForm();
        state.printSettings = settings;
        state.previewCanvas = null;
        state.previewFileName = "";
        clearDownloadLink();
        savePrintSettings(settings);
        showToast("Setting cetak tersimpan.");
      }

      function openPrintSettings() {
        const modal = getElement("printSettingsModal");
        const settings = getActivePrintSettings();
        state.printSettings = settings;
        setPrintSettingsForm(settings);
        if (modal) modal.hidden = false;
        document.body.classList.add("modal-open");
      }

      function closePrintSettings() {
        const modal = getElement("printSettingsModal");
        if (modal) modal.hidden = true;
        document.body.classList.remove("modal-open");
      }

      function openPrintPreview() {
        const modal = getElement("printPreviewModal");
        if (hasSearchKeyword()) {
          showToast("Buka kategori dari hasil pencarian dulu untuk cetak per kategori.");
          return;
        }
        state.printSettings = getActivePrintSettings();
        const previewData = getPrintPreviewData(state.printSettings);
        if (!previewData.category || !previewData.rows.length) {
          showToast("Tidak ada produk untuk dicetak.");
          return;
        }
        if (modal) modal.hidden = false;
        document.body.classList.add("modal-open");
        renderPrintPreview();
      }

      function closePrintPreview() {
        const modal = getElement("printPreviewModal");
        if (modal) modal.hidden = true;
        document.body.classList.remove("modal-open");
      }

      async function createDownloadLink() {
        if (!state.previewCanvas) {
          renderPrintPreview();
        }
        if (!state.previewCanvas) {
          showToast("Preview belum tersedia.");
          return;
        }
        setDownloadLoading(true);
        clearDownloadLink();
        try {
          savePrintSettings(getActivePrintSettings());
          const filename = state.previewFileName || "daftar-harga.png";
          const blob = await canvasToPngBlob(state.previewCanvas);
          const downloadUrl = await uploadPrintImage(blob, filename);
          renderDownloadLink(downloadUrl);
          showToast("Link download siap.");
        } catch (error) {
          const message = error && error.message ? error.message : "Gagal membuat link download.";
          showToast(message);
        } finally {
          setDownloadLoading(false);
        }
      }

      async function copyDownloadLink() {
        if (!state.downloadUrl) {
          showToast("Link download belum tersedia.");
          return;
        }
        try {
          await window.navigator.clipboard.writeText(state.downloadUrl);
          showToast("Link download disalin.");
        } catch (error) {
          showToast("Tidak bisa menyalin otomatis. Salin link secara manual.");
        }
      }

      function scheduleGlobalSearch() {
        window.clearTimeout(state.searchTimer);
        const query = getSearchKeyword();

        if (!query) {
          state.searchRequestId += 1;
          state.searchResults = createEmptySearchResults("");
          state.loading = false;
          setSync("ready", "Siap");
          renderProducts();
          return;
        }

        if (!canRunGlobalSearch()) {
          state.searchRequestId += 1;
          state.searchResults = createEmptySearchResults(query);
          state.loading = false;
          setSync("ready", "Siap");
          renderProducts();
          return;
        }

        state.searchResults = {
          ...createEmptySearchResults(query),
          loading: true,
        };
        setSync("loading", "Mencari");
        renderProducts();
        state.searchTimer = window.setTimeout(() => {
          loadSearchProducts({ reset: true });
        }, SEARCH_DEBOUNCE_MS);
      }

      async function openCategoryFromSearch(categoryId) {
        const selection = getCategorySelection(state.categories, categoryId);
        if (!selection.categoryId) {
          showToast("Kategori produk tidak ditemukan.");
          return;
        }

        window.clearTimeout(state.searchTimer);
        state.searchRequestId += 1;
        state.search = "";
        state.searchResults = createEmptySearchResults("");
        state.sortMode = DEFAULT_SORT_MODE;
        state.activeRootCategoryId = selection.rootId;
        state.activeCategoryId = selection.categoryId;

        const input = getElement("searchInput");
        if (input) input.value = "";
        const sortSelect = getElement("sortSelect");
        if (sortSelect) sortSelect.value = DEFAULT_SORT_MODE;

        renderCategories();
        scrollActiveCategoryIntoView();
        try {
          await loadProductsForActiveCategory({ reset: true });
          showToast("Kategori produk dibuka.");
        } catch (error) {
          handleError(error);
        }
      }

      async function selectCategory(categoryId) {
        const selection = getCategorySelection(state.categories, categoryId);
        if (!selection.categoryId) {
          return;
        }
        if (selection.rootId === state.activeRootCategoryId && selection.categoryId === state.activeCategoryId && !hasSearchKeyword()) {
          return;
        }
        window.clearTimeout(state.searchTimer);
        state.searchRequestId += 1;
        state.activeRootCategoryId = selection.rootId;
        state.activeCategoryId = selection.categoryId;
        state.search = "";
        state.searchResults = createEmptySearchResults("");
        state.sortMode = DEFAULT_SORT_MODE;
        const input = getElement("searchInput");
        if (input) input.value = "";
        const sortSelect = getElement("sortSelect");
        if (sortSelect) sortSelect.value = DEFAULT_SORT_MODE;
        renderCategories();
        scrollActiveCategoryIntoView();
        try {
          await loadProductsForActiveCategory({ reset: true });
        } catch (error) {
          handleError(error);
        }
      }

      function applyBrand() {
        setText("storeName", getDisplayStoreName());
        document.documentElement.style.setProperty("--brand", CONFIG.colors.brand);
        document.documentElement.style.setProperty("--brand-dark", CONFIG.colors.brandDark);
        document.documentElement.style.setProperty("--brand-soft", CONFIG.colors.brandSoft);
      }

      function handleError(error) {
        state.loading = false;
        state.error = error && error.message ? error.message : "Data gagal dimuat";
        setSync("error", "Gagal");
        renderEmpty("Data gagal dimuat", "Periksa token Open API atau koneksi internet.");
        updateLoadMoreButton(false);
        showToast(state.error);
      }

      function bindEvents() {
        const strip = getElement("categoryStrip");
        const subStrip = getElement("subCategoryStrip");
        const searchInput = getElement("searchInput");
        const sortSelect = getElement("sortSelect");
        const productList = getElement("productList");
        const printButton = getElement("printButton");
        const globalSettingsButton = getElement("globalSettingsButton");
        const settingsModal = getElement("printSettingsModal");
        const closePrintButton = getElement("closePrintSettingsButton");
        const previewModal = getElement("printPreviewModal");
        const closePrintPreviewButton = getElement("closePrintPreviewButton");
        const storeNameInput = getElement("printStoreName");
        const markupTypeSelect = getElement("markupType");
        const markupValueInput = getElement("markupValue");
        const previewButton = getElement("previewButton");
        const savePrintSettingsButton = getElement("savePrintSettingsButton");
        const downloadPreviewButton = getElement("downloadPreviewButton");
        const copyDownloadLinkButton = getElement("copyDownloadLinkButton");
        const refreshButton = getElement("refreshButton");
        const loadMoreButton = getElement("loadMoreButton");

        if (strip) {
          strip.addEventListener("click", (event) => {
            const button = event.target.closest("[data-category-id]");
            if (button) {
              selectCategory(button.getAttribute("data-category-id"));
            }
          });
        }

        if (subStrip) {
          subStrip.addEventListener("click", (event) => {
            const button = event.target.closest("[data-category-id]");
            if (button) {
              selectCategory(button.getAttribute("data-category-id"));
            }
          });
        }

        if (searchInput) {
          searchInput.addEventListener("input", (event) => {
            state.search = event.target.value;
            scheduleGlobalSearch();
          });
        }

        if (sortSelect) {
          sortSelect.addEventListener("change", (event) => {
            state.sortMode = event.target.value;
            renderProducts();
          });
        }

        if (productList) {
          productList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-open-search-category]");
            if (button) {
              openCategoryFromSearch(button.getAttribute("data-open-search-category"));
            }
          });
        }

        if (printButton) {
          printButton.addEventListener("click", openPrintPreview);
        }

        if (globalSettingsButton) {
          globalSettingsButton.addEventListener("click", openPrintSettings);
        }

        if (settingsModal) {
          settingsModal.addEventListener("click", (event) => {
            if (event.target.closest("[data-close-print-settings]")) {
              closePrintSettings();
            }
          });
        }

        if (closePrintButton) {
          closePrintButton.addEventListener("click", closePrintSettings);
        }

        if (previewModal) {
          previewModal.addEventListener("click", (event) => {
            if (event.target.closest("[data-close-print-preview]")) {
              closePrintPreview();
            }
          });
        }

        if (closePrintPreviewButton) {
          closePrintPreviewButton.addEventListener("click", closePrintPreview);
        }

        [storeNameInput, markupTypeSelect, markupValueInput].forEach((input) => {
          if (input) {
            input.addEventListener("input", () => {
              state.previewCanvas = null;
            });
            input.addEventListener("change", () => {
              state.previewCanvas = null;
            });
          }
        });

        if (previewButton) {
          previewButton.addEventListener("click", renderPrintPreview);
        }

        if (savePrintSettingsButton) {
          savePrintSettingsButton.addEventListener("click", saveCurrentPrintSettings);
        }

        if (downloadPreviewButton) {
          downloadPreviewButton.addEventListener("click", createDownloadLink);
        }

        if (copyDownloadLinkButton) {
          copyDownloadLinkButton.addEventListener("click", copyDownloadLink);
        }

        if (refreshButton) {
          refreshButton.addEventListener("click", async () => {
            window.clearTimeout(state.searchTimer);
            state.productsByCategory.clear();
            state.searchRequestId += 1;
            state.search = "";
            state.searchResults = createEmptySearchResults("");
            if (searchInput) searchInput.value = "";
            try {
              await loadCategories();
            } catch (error) {
              handleError(error);
            }
          });
        }

        if (loadMoreButton) {
          loadMoreButton.addEventListener("click", async () => {
            try {
              if (hasSearchKeyword()) {
                await loadSearchProducts({ reset: false });
                return;
              }
              await loadProductsForActiveCategory({ reset: false });
            } catch (error) {
              handleError(error);
            }
          });
        }
      }

      async function init() {
        applyBrand();
        bindEvents();
        try {
          await loadCategories();
        } catch (error) {
          handleError(error);
        }
      }

      if (document && typeof document.addEventListener === "function") {
        document.addEventListener("DOMContentLoaded", init);
      }
    })();

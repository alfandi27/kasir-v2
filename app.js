/**
 * POS Kasir App
 * Vanilla JS Application Logic
 */

// Database wrapper for LocalStorage
const DB = {
    // Keys
    KEYS: {
        PRODUCTS: 'pos_products',
        CATEGORIES: 'pos_categories',
        TRANSACTIONS: 'pos_transactions',
        SETTINGS: 'pos_settings',
        COUNTERS: 'pos_counters',
        PROMOS: 'pos_promos'
    },

    // Initialize initial default data if none exists
    init() {
        if (!localStorage.getItem(this.KEYS.PRODUCTS)) this.save(this.KEYS.PRODUCTS, []);
        if (!localStorage.getItem(this.KEYS.CATEGORIES)) {
            // Default categories
            this.save(this.KEYS.CATEGORIES, [
                { id: 'cat_1', name: 'Makanan', color: 'bg-orange-100 text-orange-700' },
                { id: 'cat_2', name: 'Minuman', color: 'bg-blue-100 text-blue-700' },
                { id: 'cat_3', name: 'Snack', color: 'bg-yellow-100 text-yellow-700' }
            ]);
        }
        if (!localStorage.getItem(this.KEYS.TRANSACTIONS)) this.save(this.KEYS.TRANSACTIONS, []);
        if (!localStorage.getItem(this.KEYS.COUNTERS)) this.save(this.KEYS.COUNTERS, { receiptNo: 1 });
        if (!localStorage.getItem(this.KEYS.PROMOS)) this.save(this.KEYS.PROMOS, []);
        // Don't auto-init settings, we use it to check first run
    },

    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || null;
        } catch (e) {
            console.error('Error parsing localStorage key:', key);
            return null;
        }
    },

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    clearData() {
        if (confirm('Yakin ingin mereset seluruh data aplikasi? Ini tidak bisa dibatalkan.')) {
            localStorage.clear();
            window.location.reload();
        }
    }
};

// Application State
const State = {
    currentView: null,
    cart: [],
    settings: null,
};

// ============================================================
// THEME SYSTEM
// 5 shades per color: 50 (bg light), 100 (badge), 500, 600 (main), 700 (dark)
// ============================================================
const THEMES = {
    blue: { name: 'Biru', 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
    indigo: { name: 'Indigo', 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
    purple: { name: 'Ungu', 50: '#f5f3ff', 100: '#ede9fe', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
    pink: { name: 'Pink', 50: '#fdf2f8', 100: '#fce7f3', 500: '#ec4899', 600: '#db2777', 700: '#be185d' },
    rose: { name: 'Rose', 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
    red: { name: 'Merah', 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
    orange: { name: 'Orange', 50: '#fff7ed', 100: '#ffedd5', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
    amber: { name: 'Amber', 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
    green: { name: 'Hijau', 50: '#f0fdf4', 100: '#dcfce7', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
    teal: { name: 'Teal', 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
    cyan: { name: 'Cyan', 50: '#ecfeff', 100: '#cffafe', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490' },
    lime: { name: 'Lime', 50: '#f7fee7', 100: '#ecfccb', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f' },
};

function applyTheme(colorKey) {
    const t = THEMES[colorKey] || THEMES.blue;
    const root = document.documentElement;
    root.style.setProperty('--p-50', t[50]);
    root.style.setProperty('--p-100', t[100]);
    root.style.setProperty('--p-500', t[500]);
    root.style.setProperty('--p-600', t[600]);
    root.style.setProperty('--p-700', t[700]);
}

// Main App Controller
const app = {
    container: document.getElementById('appContainer'),
    headerTitle: document.getElementById('headerTitle'),
    headerActions: document.getElementById('headerActions'),

    init() {
        DB.init();
        State.settings = DB.get(DB.KEYS.SETTINGS);

        // Apply saved theme immediately
        applyTheme(State.settings?.theme || 'blue');
        if (!State.settings) {
            // First run, hide nav and show setup
            document.querySelector('nav').style.display = 'none';
            this.renderView('setup');
        } else {
            // Normal run
            document.querySelector('nav').style.display = 'flex';
            this.navigate('cashier'); // Default route
        }

        // Setup global event delegation
        this.setupEvents();
    },

    setupEvents() {
        // Form submit on setup
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'setupForm') {
                e.preventDefault();
                const storeName = document.getElementById('setupStoreName').value.trim();
                if (storeName) {
                    State.settings = {
                        storeName: storeName,
                        currency: 'IDR',
                        taxRate: 0,
                        taxEnabled: false,
                        setupDate: new Date().toISOString()
                    };
                    DB.save(DB.KEYS.SETTINGS, State.settings);

                    document.querySelector('nav').style.display = 'flex';
                    this.navigate('cashier');
                }
            }
        });
    },

    navigate(viewName) {
        if (State.currentView === viewName) return;

        // Update nav UI
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            if (btn.dataset.target === viewName) {
                btn.classList.add('active', 'text-blue-600');
                btn.classList.remove('text-gray-500');
                // Change icon to bold version
                const icon = btn.querySelector('i');
                icon.classList.remove('ph');
                icon.classList.add('ph-fill');
            } else {
                btn.classList.remove('active', 'text-blue-600');
                btn.classList.add('text-gray-500');
                // Change icon back to regular
                const icon = btn.querySelector('i');
                icon.classList.add('ph');
                icon.classList.remove('ph-fill');
            }
        });

        this.renderView(viewName);
        State.currentView = viewName;
    },

    renderView(viewName) {
        // Clear current app container
        this.container.innerHTML = '';
        this.headerActions.innerHTML = '';

        const template = document.getElementById(`tpl-${viewName}`);
        if (template) {
            this.container.appendChild(template.content.cloneNode(true));
        } else {
            this.container.innerHTML = `<div class="p-4 text-center text-red-500">View ${viewName} tidak ditemukan.</div>`;
        }

        // View specific logic
        switch (viewName) {
            case 'setup':
                this.headerTitle.textContent = 'Setup Aplikasi';
                break;
            case 'cashier':
                this.headerTitle.textContent = State.settings?.storeName || 'Kasir';
                setTimeout(() => cashierController.init(), 0);
                break;
            case 'products':
                this.headerTitle.textContent = 'Kelola Produk';
                this.headerActions.innerHTML = `<button onclick="productsController.showAddForm()" class="bg-blue-100 text-blue-700 p-2 rounded-lg active:bg-blue-200 transition-colors"><i class="ph-bold ph-plus"></i></button>`;

                // Use setTimeout to ensure DOM is updated before init
                setTimeout(() => productsController.init(), 0);
                break;
            case 'history':
                this.headerTitle.textContent = 'Riwayat Transaksi';
                setTimeout(() => historyController.init(), 0);
                break;
            case 'reports':
                this.headerTitle.textContent = 'Laporan Hari Ini';
                setTimeout(() => reportsController.init(), 0);
                break;
            case 'settings':
                this.headerTitle.textContent = 'Pengaturan';
                setTimeout(() => settingsController.init(), 0);
                break;
        }
    },

    // Formatting utilities
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount).replace('Rp', 'Rp ');
    },

    formatDate(dateString) {
        const d = new Date(dateString);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    },

    generateId() {
        return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    },

    // Modal System
    showModal(contentHtml) {
        const container = document.getElementById('modalContainer');
        const content = document.getElementById('modalContent');
        content.innerHTML = contentHtml;
        container.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        const container = document.getElementById('modalContainer');
        container.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

// Products Controller
const productsController = {
    activeCategory: 'all',
    searchQuery: '',

    init() {
        this.renderCategories();
        this.renderList();
    },

    renderCategories() {
        const container = document.getElementById('productCategoriesList');
        if (!container) return;

        const categories = DB.get(DB.KEYS.CATEGORIES) || [];

        let html = `<button onclick="productsController.setCategory('all')" class="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${this.activeCategory === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}">Semua</button>`;

        categories.forEach(cat => {
            const isActive = this.activeCategory === cat.id;
            html += `<button onclick="productsController.setCategory('${cat.id}')" class="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}">${cat.name}</button>`;
        });

        container.innerHTML = html;
    },

    setCategory(catId) {
        this.activeCategory = catId;
        this.renderCategories();
        this.renderList();
    },

    filterList() {
        this.searchQuery = document.getElementById('productSearch').value.toLowerCase();
        this.renderList();
    },

    renderList() {
        const container = document.getElementById('productLists');
        const emptyState = document.getElementById('productEmptyState');
        if (!container) return;

        const allProducts = DB.get(DB.KEYS.PRODUCTS) || [];
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];

        let filtered = allProducts.reverse(); // Show newest first

        if (this.activeCategory !== 'all') {
            filtered = filtered.filter(p => p.categoryId === this.activeCategory);
        }

        if (this.searchQuery) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(this.searchQuery));
        }

        if (filtered.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            return;
        }

        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');

        let html = '';
        filtered.forEach(p => {
            const cat = categories.find(c => c.id === p.categoryId) || { name: 'Uncategorized', color: 'bg-gray-100 text-gray-600' };
            const imgHtml = p.image
                ? `<div class="aspect-square w-full rounded-t-xl bg-cover bg-center" style="background-image: url('${p.image}')"></div>`
                : '';

            html += `
            <div onclick="productsController.showEditForm('${p.id}')" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:scale-95 transition-transform">
                ${imgHtml}
                <div class="p-3">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${cat.color} mb-1.5 inline-block">${cat.name}</span>
                    <h3 class="font-semibold text-gray-800 text-sm leading-tight mb-1 truncate">${p.name}</h3>
                    <p class="text-blue-600 font-bold text-sm">${app.formatCurrency(p.price)}</p>
                    ${p.stock !== undefined && p.stock !== '' ? `<p class="text-xs text-gray-500 mt-1">Stok: ${p.stock}</p>` : ''}
                </div>
            </div>`;
        });

        container.innerHTML = html;
    },

    showAddForm() {
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];
        const catOptions = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">Tambah Produk</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <form id="productForm" class="flex flex-col gap-4 pb-safe">
                    <input type="hidden" id="prodId" value="">
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                        <input type="text" id="prodName" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Harga Jual *</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                            <input type="number" id="prodPrice" required min="0" class="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Harga Modal (Opsional)</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                            <input type="number" id="prodCostPrice" min="0" placeholder="0" class="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select id="prodCategory" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                                ${catOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Stok (Opsional)</label>
                            <input type="number" id="prodStock" placeholder="Infinity" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                        </div>
                    </div>
                    
                    <div class="mt-4 flex gap-3">
                        <button type="button" onclick="app.closeModal()" class="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl active:bg-gray-200">Batal</button>
                        <button type="submit" class="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700">Simpan</button>
                    </div>
                </form>
            </div>
        `;
        app.showModal(html);

        // Setup form submit
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });
    },

    showEditForm(id) {
        const products = DB.get(DB.KEYS.PRODUCTS) || [];
        const p = products.find(p => p.id === id);
        if (!p) return;

        const categories = DB.get(DB.KEYS.CATEGORIES) || [];
        const catOptions = categories.map(c => `<option value="${c.id}" ${p.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');

        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">Edit Produk</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <form id="productForm" class="flex flex-col gap-4 pb-safe">
                    <input type="hidden" id="prodId" value="${p.id}">
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nama Produk *</label>
                        <input type="text" id="prodName" value="${p.name}" required class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Harga Jual *</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                            <input type="number" id="prodPrice" value="${p.price}" required min="0" class="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Harga Modal (Opsional)</label>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                            <input type="number" id="prodCostPrice" value="${p.costPrice || ''}" min="0" placeholder="0" class="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select id="prodCategory" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                                ${catOptions}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Stok (Opsional)</label>
                            <input type="number" id="prodStock" value="${p.stock !== undefined ? p.stock : ''}" placeholder="Infinity" class="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                        </div>
                    </div>
                    
                    <div class="mt-4 flex gap-3">
                        <button type="button" onclick="productsController.deleteProduct('${p.id}')" class="px-4 py-3 bg-red-50 text-red-600 font-semibold rounded-xl active:bg-red-100 flex items-center justify-center"><i class="ph-bold ph-trash text-lg"></i></button>
                        <button type="submit" class="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700">Simpan Perubahan</button>
                    </div>
                </form>
            </div>
        `;
        app.showModal(html);

        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });
    },

    saveProduct() {
        const id = document.getElementById('prodId').value;
        const name = document.getElementById('prodName').value.trim();
        const price = parseFloat(document.getElementById('prodPrice').value);
        const costPriceStr = document.getElementById('prodCostPrice').value.trim();
        const costPrice = costPriceStr === '' ? 0 : parseFloat(costPriceStr);
        const categoryId = document.getElementById('prodCategory').value;
        const stockStr = document.getElementById('prodStock').value.trim();
        const stock = stockStr === '' ? '' : parseInt(stockStr);

        if (!name || isNaN(price) || price < 0) return alert('Nama dan Harga valid wajib diisi.');

        const products = DB.get(DB.KEYS.PRODUCTS) || [];

        if (id) {
            // Edit
            const index = products.findIndex(p => p.id === id);
            if (index !== -1) {
                products[index] = { ...products[index], name, price, costPrice, categoryId, stock, updatedAt: new Date().toISOString() };
            }
        } else {
            // New
            products.push({
                id: app.generateId(),
                name, price, costPrice, categoryId, stock,
                image: '',
                createdAt: new Date().toISOString()
            });
        }

        DB.save(DB.KEYS.PRODUCTS, products);
        app.closeModal();
        this.renderList();
    },

    deleteProduct(id) {
        if (!confirm('Hapus produk ini?')) return;

        const products = DB.get(DB.KEYS.PRODUCTS) || [];
        const filtered = products.filter(p => p.id !== id);
        DB.save(DB.KEYS.PRODUCTS, filtered);

        app.closeModal();
        this.renderList();
    }
};

// Settings Controller
const settingsController = {
    init() {
        if (!State.settings) return;

        const storeNameEl = document.getElementById('settingStoreName');
        if (storeNameEl) storeNameEl.textContent = State.settings.storeName;

        const taxToggle = document.getElementById('settingTaxToggle');
        const taxDesc = document.getElementById('taxDescText');

        if (taxToggle && taxDesc) {
            taxToggle.checked = State.settings.taxEnabled || false;
            taxDesc.textContent = taxToggle.checked ? 'Pajak PPN 11% Aktif' : 'Tidak Aktif';
        }

        // Render theme picker and category list
        this.renderThemePicker();
        categoryController.renderList();
    },

    renderThemePicker() {
        const container = document.getElementById('themeColorPicker');
        if (!container) return;
        const current = State.settings?.theme || 'blue';
        let html = '';
        Object.entries(THEMES).forEach(([key, t]) => {
            const isActive = key === current;
            html += `
            <button onclick="settingsController.setTheme('${key}')" title="${t.name}"
                style="background-color:${t[600]}"
                class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-transform active:scale-90 ${isActive ? 'ring-2 ring-offset-2 scale-110' : ''}">
                ${isActive ? '<i class="ph-bold ph-check text-white text-sm"></i>' : ''}
            </button>`;
        });
        container.innerHTML = html;
    },

    setTheme(colorKey) {
        if (!State.settings) return;
        State.settings.theme = colorKey;
        DB.save(DB.KEYS.SETTINGS, State.settings);
        applyTheme(colorKey);
        this.renderThemePicker();
    },

    toggleTax(el) {
        State.settings.taxEnabled = el.checked;
        State.settings.taxRate = el.checked ? 11 : 0; // standard 11%
        DB.save(DB.KEYS.SETTINGS, State.settings);

        const taxDesc = document.getElementById('taxDescText');
        if (taxDesc) {
            taxDesc.textContent = el.checked ? 'Pajak PPN 11% Aktif' : 'Tidak Aktif';
        }
    },

    exportData() {
        const data = {
            products: DB.get(DB.KEYS.PRODUCTS),
            categories: DB.get(DB.KEYS.CATEGORIES),
            transactions: DB.get(DB.KEYS.TRANSACTIONS),
            settings: DB.get(DB.KEYS.SETTINGS),
            counters: DB.get(DB.KEYS.COUNTERS)
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);

        const d = new Date();
        const datesStr = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;

        downloadAnchorNode.setAttribute("download", `pos_backup_${datesStr}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    importData(input) {
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);

                // Simple validation
                if (!data.settings || !data.products) {
                    throw new Error("Format data tidak valid.");
                }

                if (confirm('Import data akan menimpa data saat ini. Lanjutkan?')) {
                    if (data.products) DB.save(DB.KEYS.PRODUCTS, data.products);
                    if (data.categories) DB.save(DB.KEYS.CATEGORIES, data.categories);
                    if (data.transactions) DB.save(DB.KEYS.TRANSACTIONS, data.transactions);
                    if (data.settings) DB.save(DB.KEYS.SETTINGS, data.settings);
                    if (data.counters) DB.save(DB.KEYS.COUNTERS, data.counters);

                    alert('Data berhasil di-restore! Aplikasi akan dimuat ulang.');
                    window.location.reload();
                }
            } catch (error) {
                alert('Gagal membaca file backup: ' + error.message);
            }
            // Reset input
            input.value = '';
        };

        reader.readAsText(file);
    },

    resetData() {
        DB.clearData();
    }
};

// Category Controller
const categoryController = {
    COLOR_OPTIONS: [
        { label: 'Biru', cls: 'bg-blue-100 text-blue-700' },
        { label: 'Hijau', cls: 'bg-green-100 text-green-700' },
        { label: 'Merah', cls: 'bg-red-100 text-red-700' },
        { label: 'Kuning', cls: 'bg-yellow-100 text-yellow-700' },
        { label: 'Ungu', cls: 'bg-purple-100 text-purple-700' },
        { label: 'Orange', cls: 'bg-orange-100 text-orange-700' },
        { label: 'Pink', cls: 'bg-pink-100 text-pink-700' },
        { label: 'Abu', cls: 'bg-gray-100 text-gray-600' },
    ],

    // Opens full bottom-sheet showing the full category manager
    openCategoryManager() {
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];

        let listHtml = '';
        if (categories.length === 0) {
            listHtml = `<p class="py-6 text-sm text-gray-400 text-center">Belum ada kategori.</p>`;
        } else {
            categories.forEach(cat => {
                listHtml += `
                <div class="flex items-center justify-between py-3 border-b border-gray-50">
                    <span class="text-xs font-bold px-2.5 py-1 rounded-full ${cat.color}">${cat.name}</span>
                    <div class="flex items-center gap-2">
                        <button onclick="categoryController.showEditForm('${cat.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 active:bg-blue-100">
                            <i class="ph-bold ph-pencil-simple text-sm"></i>
                        </button>
                        <button onclick="categoryController.deleteCategory('${cat.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 active:bg-red-100">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    </div>
                </div>`;
            });
        }

        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">Kelola Kategori</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>

                <div class="mb-4">${listHtml}</div>

                <button onclick="categoryController.showAddForm()"
                    class="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700 flex items-center justify-center gap-2">
                    <i class="ph-bold ph-plus"></i> Tambah Kategori
                </button>
            </div>`;
        app.showModal(html);
    },

    // Called after add/delete to re-render the manager modal in-place
    refreshCategoryManager() {
        app.closeModal();
        setTimeout(() => this.openCategoryManager(), 50);
    },


    _buildColorPicker(selected) {
        return this.COLOR_OPTIONS.map(opt => `
            <label class="cursor-pointer flex flex-col items-center gap-1">
                <input type="radio" name="catColor" value="${opt.cls}" class="sr-only peer" ${selected === opt.cls ? 'checked' : ''}>
                <div class="w-8 h-8 rounded-full ${opt.cls} flex items-center justify-center text-xs font-bold peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-blue-500 transition-all">${opt.label.charAt(0)}</div>
                <span class="text-[10px] text-gray-500">${opt.label}</span>
            </label>`
        ).join('');
    },

    showAddForm() {
        const defaultColor = this.COLOR_OPTIONS[0].cls;
        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">Tambah Kategori</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nama Kategori</label>
                <input id="catNameInput" type="text" placeholder="cth: Minuman Panas" maxlength="30"
                    class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-5">
                <label class="block text-sm font-semibold text-gray-700 mb-3">Warna Label</label>
                <div class="flex flex-wrap gap-4 mb-6">
                    ${this._buildColorPicker(defaultColor)}
                </div>
                <button onclick="categoryController.saveCategory(null)"
                    class="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700">
                    Simpan Kategori
                </button>
            </div>`;
        app.showModal(html);
        setTimeout(() => document.getElementById('catNameInput')?.focus(), 100);
    },

    showEditForm(id) {
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];
        const cat = categories.find(c => c.id === id);
        if (!cat) return;

        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">Edit Kategori</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Nama Kategori</label>
                <input id="catNameInput" type="text" value="${cat.name}" maxlength="30"
                    class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-5">
                <label class="block text-sm font-semibold text-gray-700 mb-3">Warna Label</label>
                <div class="flex flex-wrap gap-4 mb-6">
                    ${this._buildColorPicker(cat.color)}
                </div>
                <button onclick="categoryController.saveCategory('${id}')"
                    class="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700">
                    Simpan Perubahan
                </button>
            </div>`;
        app.showModal(html);
        setTimeout(() => document.getElementById('catNameInput')?.focus(), 100);
    },

    saveCategory(id) {
        const nameInput = document.getElementById('catNameInput');
        const colorInput = document.querySelector('input[name="catColor"]:checked');

        const name = nameInput?.value.trim();
        if (!name) return alert('Nama kategori tidak boleh kosong.');

        const color = colorInput?.value || this.COLOR_OPTIONS[0].cls;
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];

        if (id) {
            const idx = categories.findIndex(c => c.id === id);
            if (idx !== -1) { categories[idx].name = name; categories[idx].color = color; }
        } else {
            categories.push({ id: app.generateId(), name, color });
        }

        DB.save(DB.KEYS.CATEGORIES, categories);
        this.refreshCategoryManager();
    },

    deleteCategory(id) {
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];
        const cat = categories.find(c => c.id === id);
        if (!cat) return;

        const products = DB.get(DB.KEYS.PRODUCTS) || [];
        if (products.some(p => p.categoryId === id)) {
            return alert(`Kategori "${cat.name}" masih digunakan oleh produk.`);
        }

        if (!confirm(`Hapus kategori "${cat.name}"?`)) return;

        DB.save(DB.KEYS.CATEGORIES, categories.filter(c => c.id !== id));
        this.refreshCategoryManager();
    }
};


// Promo / Discount Template Controller
const promoController = {

    openPromoManager() {
        const promos = DB.get(DB.KEYS.PROMOS) || [];

        let listHtml = '';
        if (promos.length === 0) {
            listHtml = `<p class="py-6 text-sm text-gray-400 text-center">Belum ada template promo.</p>`;
        } else {
            promos.forEach(promo => {
                const badge = promo.type === 'percentage'
                    ? `<span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">${promo.value}%</span>`
                    : `<span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">${app.formatCurrency(promo.value)}</span>`;
                listHtml += `
                <div class="flex items-center justify-between py-3 border-b border-gray-50">
                    <div>
                        <span class="font-semibold text-gray-800 text-sm">${promo.name}</span>
                        <span class="ml-2">${badge}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="promoController.showEditForm('${promo.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-50 text-blue-500 active:bg-blue-100">
                            <i class="ph-bold ph-pencil-simple text-sm"></i>
                        </button>
                        <button onclick="promoController.deletePromo('${promo.id}')" class="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 active:bg-red-100">
                            <i class="ph-bold ph-trash text-sm"></i>
                        </button>
                    </div>
                </div>`;
            });
        }

        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">Template Promo</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                <div class="mb-4">${listHtml}</div>
                <button onclick="promoController.showAddForm()"
                    class="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700 flex items-center justify-center gap-2">
                    <i class="ph-bold ph-plus"></i> Tambah Template Promo
                </button>
            </div>`;
        app.showModal(html);
    },

    refreshPromoManager() {
        app.closeModal();
        setTimeout(() => this.openPromoManager(), 50);
    },

    _buildForm(promo = null) {
        const isEdit = !!promo;
        const type = promo?.type || 'percentage';
        return `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">${isEdit ? 'Edit' : 'Tambah'} Template Promo</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>

                <label class="block text-sm font-semibold text-gray-700 mb-1">Nama Promo</label>
                <input id="promoNameInput" type="text" value="${promo?.name || ''}" placeholder="cth: Diskon Weekend" maxlength="40"
                    class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-4">

                <label class="block text-sm font-semibold text-gray-700 mb-2">Jenis Diskon</label>
                <div class="flex gap-2 mb-4 p-1 bg-gray-100 rounded-xl">
                    <button onclick="promoController._toggleType('percentage')" id="promoBtnPerc"
                        class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${type === 'percentage' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}">Persen (%)</button>
                    <button onclick="promoController._toggleType('fixed')" id="promoBtnFix"
                        class="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${type === 'fixed' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}">Nominal (Rp)</button>
                </div>

                <label class="block text-sm font-semibold text-gray-700 mb-1">Nilai Diskon</label>
                <div class="relative mb-6">
                    <span id="promoSign" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">${type === 'fixed' ? 'Rp' : '%'}</span>
                    <input type="number" id="promoValueInput" value="${promo?.value || ''}" min="0" placeholder="0"
                        class="w-full pl-10 p-4 font-bold text-xl border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                </div>

                <button onclick="promoController.savePromo('${promo?.id || ''}')"
                    class="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700">
                    ${isEdit ? 'Simpan Perubahan' : 'Simpan Template'}
                </button>
            </div>`;
    },

    _toggleType(type) {
        document.getElementById('promoBtnPerc').className = `flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${type === 'percentage' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`;
        document.getElementById('promoBtnFix').className = `flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${type === 'fixed' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`;
        document.getElementById('promoSign').textContent = type === 'fixed' ? 'Rp' : '%';
        document.getElementById('promoBtnPerc').dataset.selected = type === 'percentage' ? '1' : '';
        document.getElementById('promoBtnFix').dataset.selected = type === 'fixed' ? '1' : '';
    },

    showAddForm() {
        app.showModal(this._buildForm());
        setTimeout(() => document.getElementById('promoNameInput')?.focus(), 100);
    },

    showEditForm(id) {
        const promos = DB.get(DB.KEYS.PROMOS) || [];
        const promo = promos.find(p => p.id === id);
        if (!promo) return;
        app.showModal(this._buildForm(promo));
        setTimeout(() => document.getElementById('promoNameInput')?.focus(), 100);
    },

    savePromo(id) {
        const name = document.getElementById('promoNameInput').value.trim();
        const valueStr = document.getElementById('promoValueInput').value;
        const value = parseFloat(valueStr);
        // Determine active type from button state
        const fixBtn = document.getElementById('promoBtnFix');
        const type = fixBtn && fixBtn.className.includes('text-blue-600') ? 'fixed' : 'percentage';

        if (!name) return alert('Nama promo wajib diisi.');
        if (isNaN(value) || value <= 0) return alert('Nilai diskon wajib diisi.');

        const promos = DB.get(DB.KEYS.PROMOS) || [];
        if (id) {
            const idx = promos.findIndex(p => p.id === id);
            if (idx !== -1) { promos[idx] = { ...promos[idx], name, type, value }; }
        } else {
            promos.push({ id: app.generateId(), name, type, value });
        }
        DB.save(DB.KEYS.PROMOS, promos);
        this.refreshPromoManager();
    },

    deletePromo(id) {
        const promos = DB.get(DB.KEYS.PROMOS) || [];
        const promo = promos.find(p => p.id === id);
        if (!promo) return;
        if (!confirm(`Hapus template "${promo.name}"?`)) return;
        DB.save(DB.KEYS.PROMOS, promos.filter(p => p.id !== id));
        this.refreshPromoManager();
    },

    // Called directly from cart tag button
    showPromoPicker() {
        const promos = DB.get(DB.KEYS.PROMOS) || [];
        const hasDiscount = cashierController.discountValue > 0;

        let listHtml = '';
        if (promos.length === 0) {
            listHtml = `
            <div class="py-8 text-center text-gray-400">
                <i class="ph ph-lightning text-3xl mb-2 block"></i>
                <p class="text-sm font-medium">Belum ada template promo</p>
                <p class="text-xs mt-1">Buat di Pengaturan → Template Promo / Diskon</p>
            </div>`;
        } else {
            promos.forEach(promo => {
                const badge = promo.type === 'percentage'
                    ? `<span class="font-bold text-blue-600 text-sm">${promo.value}%</span>`
                    : `<span class="font-bold text-green-600 text-sm">${app.formatCurrency(promo.value)}</span>`;
                const isActive = hasDiscount
                    && cashierController.discountType === promo.type
                    && cashierController.discountValue === promo.value;
                listHtml += `
                <button onclick="promoController.applyPromoTemplate('${promo.id}')"
                    class="w-full flex items-center justify-between px-4 py-3.5 border-b border-gray-50 active:bg-blue-50 transition-colors ${isActive ? 'bg-blue-50' : ''}">
                    <div class="flex items-center gap-2">
                        ${isActive ? '<i class="ph-bold ph-check-circle text-blue-500"></i>' : '<i class="ph ph-lightning text-yellow-500"></i>'}
                        <span class="font-semibold text-gray-800 text-sm">${promo.name}</span>
                    </div>
                    ${badge}
                </button>`;
            });
        }

        const removeBtn = hasDiscount
            ? `<button onclick="promoController.removeDiscount()" class="w-full mt-3 py-3 text-red-500 font-medium active:bg-red-50 rounded-xl text-sm">Hapus Diskon Aktif</button>`
            : '';

        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Promo / Diskon</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                <div class="bg-gray-50 rounded-2xl overflow-hidden">${listHtml}</div>
                ${removeBtn}
            </div>`;
        app.showModal(html);
    },

    removeDiscount() {
        cashierController.discountValue = 0;
        cashierController.discountType = 'percentage';
        app.closeModal();
        cashierController.updateCartUI();
    },


    applyPromoTemplate(id) {
        const promos = DB.get(DB.KEYS.PROMOS) || [];
        const promo = promos.find(p => p.id === id);
        if (!promo) return;
        cashierController.discountType = promo.type;
        cashierController.discountValue = promo.value;
        app.closeModal();
        cashierController.updateCartUI();
    }
};

// Reports Controller
const reportsController = {
    currentFilter: 'today', // today, month, year

    init() {
        this.renderStats();
    },

    setFilter(filter) {
        this.currentFilter = filter;

        // Update button styles
        const btns = ['today', 'month', 'year'];
        btns.forEach(b => {
            const btnEl = document.getElementById('btnFilter' + b.charAt(0).toUpperCase() + b.slice(1));
            if (btnEl) {
                if (b === filter) {
                    btnEl.className = 'flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors bg-blue-50 text-blue-600';
                } else {
                    btnEl.className = 'flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors text-gray-500 hover:bg-gray-50';
                }
            }
        });

        // Update Labels
        let labelText = 'Hari Ini';
        if (filter === 'month') labelText = 'Bulan Ini';
        if (filter === 'year') labelText = 'Tahun Ini';

        const lOmzet = document.getElementById('reportOmzetLabel');
        const lPay = document.getElementById('reportPaymentLabel');
        const lTop = document.getElementById('reportTopLabel');

        if (lOmzet) lOmzet.textContent = 'Omzet ' + labelText;
        if (lPay) lPay.textContent = 'Metode Pembayaran (' + labelText + ')';
        if (lTop) lTop.textContent = 'Top 5 Produk (' + labelText + ')';

        this.renderStats();
    },

    renderStats() {
        const transactions = DB.get(DB.KEYS.TRANSACTIONS) || [];

        // Determine start time based on filter
        const now = new Date();
        let startTime = 0;

        if (this.currentFilter === 'today') {
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        } else if (this.currentFilter === 'month') {
            startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        } else if (this.currentFilter === 'year') {
            startTime = new Date(now.getFullYear(), 0, 1).getTime();
        }

        const filteredTxs = transactions.filter(t => {
            return new Date(t.createdAt).getTime() >= startTime && t.status !== 'voided';
        });

        // Calculate Revenue and Count
        const revenue = filteredTxs.reduce((sum, t) => sum + t.totals.total, 0);
        const count = filteredTxs.length;

        // Calculate total modal (cost) and profit from item snapshots
        let totalCost = 0;
        filteredTxs.forEach(t => {
            t.items.forEach(item => {
                totalCost += (item.costPrice || 0) * item.qty;
            });
        });
        const profit = revenue - totalCost;

        // Breakdown Payment Method
        let cashTotal = 0;
        let nonCashTotal = 0;

        filteredTxs.forEach(t => {
            if (t.payment.method === 'cash') cashTotal += t.totals.total;
            else nonCashTotal += t.totals.total;
        });

        // Top 5 Products
        const productCounts = {};
        filteredTxs.forEach(t => {
            t.items.forEach(item => {
                if (!productCounts[item.productId]) {
                    productCounts[item.productId] = { name: item.name, qty: 0, revenue: 0 };
                }
                productCounts[item.productId].qty += item.qty;
                productCounts[item.productId].revenue += item.subtotal;
            });
        });

        const topProducts = Object.values(productCounts)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // Update DOM
        const elRev = document.getElementById('reportRevenue');
        const elProfit = document.getElementById('reportProfit');
        const elCount = document.getElementById('reportCount');
        const elCost = document.getElementById('reportCost');
        const elCash = document.getElementById('reportCash');
        const elNonCash = document.getElementById('reportNonCash');
        const elTopProds = document.getElementById('reportTopProducts');

        if (elRev) elRev.textContent = app.formatCurrency(revenue);
        if (elProfit) elProfit.textContent = app.formatCurrency(profit);
        if (elCount) elCount.textContent = count;
        if (elCost) elCost.textContent = app.formatCurrency(totalCost);
        if (elCash) elCash.textContent = app.formatCurrency(cashTotal);
        if (elNonCash) elNonCash.textContent = app.formatCurrency(nonCashTotal);

        if (elTopProds) {
            if (topProducts.length === 0) {
                let emptyText = 'Belum ada data penjualan hari ini.';
                if (this.currentFilter === 'month') emptyText = 'Belum ada data penjualan bulan ini.';
                if (this.currentFilter === 'year') emptyText = 'Belum ada data penjualan tahun ini.';
                elTopProds.innerHTML = `<p class="text-sm text-gray-500 text-center py-4">${emptyText}</p>`;
            } else {
                let html = '';
                topProducts.forEach((p, idx) => {
                    html += `
                        <div class="flex items-center justify-between py-3 ${idx !== topProducts.length - 1 ? 'border-b border-gray-100' : ''}">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">${idx + 1}</div>
                                <div>
                                    <p class="font-semibold text-gray-800 text-sm truncate max-w-[150px]">${p.name}</p>
                                    <p class="text-xs text-gray-500">${p.qty} Terjual</p>
                                </div>
                            </div>
                            <div class="font-bold text-gray-800 text-sm">${app.formatCurrency(p.revenue)}</div>
                        </div>
                    `;
                });
                elTopProds.innerHTML = html;
            }
        }
    }
};

// Cashier Controller
const cashierController = {
    activeCategory: 'all',
    activeCategoryName: 'Semua Produk',
    searchQuery: '',
    discountType: 'percentage',
    discountValue: 0,

    init() {
        this.searchQuery = '';
        this.renderCategoryRows();
        this.showScreen('categories');
        this.updateCartUI();
    },

    // --- Screen Navigation ---
    showScreen(screen) {
        const catScreen = document.getElementById('cashierCategoryScreen');
        const prodScreen = document.getElementById('cashierProductScreen');
        const searchScreen = document.getElementById('cashierSearchScreen');
        if (catScreen) catScreen.classList.toggle('hidden', screen !== 'categories');
        if (prodScreen) {
            prodScreen.classList.toggle('hidden', screen !== 'products');
            prodScreen.classList.toggle('flex', screen === 'products');
        }
        if (searchScreen) searchScreen.classList.toggle('hidden', screen !== 'search');
    },

    // --- Category Screen ---
    renderCategoryRows() {
        const container = document.getElementById('cashierCategoryList');
        const countAllEl = document.getElementById('countAll');
        if (!container) return;

        const allProducts = DB.get(DB.KEYS.PRODUCTS) || [];
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];

        if (countAllEl) countAllEl.textContent = allProducts.length;

        // Color icon map – cycles through a few colors
        const iconColors = [
            'bg-orange-100 text-orange-500',
            'bg-green-100 text-green-600',
            'bg-purple-100 text-purple-600',
            'bg-pink-100 text-pink-500',
            'bg-yellow-100 text-yellow-600',
            'bg-red-100 text-red-500',
        ];

        let html = '';
        if (categories.length === 0) {
            html = `<div class="p-6 text-center text-gray-400 text-sm">Belum ada kategori. Tambahkan di Pengaturan.</div>`;
        } else {
            categories.forEach((cat, i) => {
                const count = allProducts.filter(p => p.categoryId === cat.id).length;
                const colors = iconColors[i % iconColors.length];
                html += `
                <div onclick="cashierController.openCategory('${cat.id}')" class="bg-white border-b border-gray-100 p-4 flex items-center justify-between active:bg-blue-50 transition-colors cursor-pointer">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${colors} flex items-center justify-center">
                            <i class="ph-fill ph-tag text-lg"></i>
                        </div>
                        <span class="font-semibold text-gray-800">${cat.name}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">${count}</span>
                        <i class="ph ph-caret-right text-gray-400"></i>
                    </div>
                </div>`;
            });
        }
        container.innerHTML = html;
    },

    openCategory(catId) {
        const categories = DB.get(DB.KEYS.CATEGORIES) || [];
        const cat = categories.find(c => c.id === catId);
        this.activeCategory = catId;
        this.activeCategoryName = catId === 'all' ? 'Semua Produk' : (cat?.name || '');

        const titleEl = document.getElementById('cashierProductScreenTitle');
        if (titleEl) titleEl.textContent = this.activeCategoryName;

        this.renderProductGrid();
        this.showScreen('products');
    },

    backToCategories() {
        this.activeCategory = 'all';
        this.showScreen('categories');
    },

    // --- Search ---
    onSearch(value) {
        this.searchQuery = value.toLowerCase().trim();
        const clearBtn = document.getElementById('cashierSearchClear');
        if (clearBtn) clearBtn.classList.toggle('hidden', !value);

        if (!this.searchQuery) {
            this.showScreen('categories');
            return;
        }
        this.renderSearchResults();
        this.showScreen('search');
    },

    clearSearch() {
        const searchEl = document.getElementById('cashierSearch');
        if (searchEl) searchEl.value = '';
        this.searchQuery = '';
        const clearBtn = document.getElementById('cashierSearchClear');
        if (clearBtn) clearBtn.classList.add('hidden');
        this.showScreen('categories');
    },

    renderSearchResults() {
        const grid = document.getElementById('cashierSearchGrid');
        const empty = document.getElementById('cashierSearchEmpty');
        if (!grid) return;

        const allProducts = DB.get(DB.KEYS.PRODUCTS) || [];
        const filtered = allProducts.filter(p => p.name.toLowerCase().includes(this.searchQuery));

        if (filtered.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            empty.classList.add('flex');
            return;
        }
        empty.classList.add('hidden');
        empty.classList.remove('flex');
        grid.innerHTML = this._buildProductCards(filtered);
    },

    // --- Product Grid ---
    renderProductGrid() {
        const container = document.getElementById('cashierProductGrid');
        if (!container) return;

        const allProducts = DB.get(DB.KEYS.PRODUCTS) || [];
        const filtered = this.activeCategory === 'all'
            ? allProducts
            : allProducts.filter(p => p.categoryId === this.activeCategory);

        if (filtered.length === 0) {
            container.innerHTML = `<div class="text-center py-10 text-gray-400">Tidak ada produk di kategori ini.</div>`;
            return;
        }
        container.innerHTML = this._buildProductCards(filtered);
    },

    _buildProductCards(products) {
        return products.map(p => {
            return `
            <div onclick="cashierController.addToCart('${p.id}')" class="bg-white flex items-center gap-3 px-4 py-3.5 active:bg-blue-50 transition-colors cursor-pointer">
                <div class="flex-1 min-w-0">
                    <h3 class="font-semibold text-gray-800 text-sm leading-snug">${p.name}</h3>
                    <p class="text-blue-600 font-bold text-sm mt-0.5">${app.formatCurrency(p.price)}</p>
                </div>
                <div class="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                    <i class="ph-bold ph-plus text-white text-base"></i>
                </div>
            </div>`;
        }).join('');
    },

    addToCart(productId) {
        const products = DB.get(DB.KEYS.PRODUCTS) || [];
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = State.cart.find(item => item.productId === productId);
        if (existingItem) {
            if (product.stock !== '' && existingItem.qty >= product.stock) {
                return alert('Stok tidak mencukupi.');
            }
            existingItem.qty += 1;
            existingItem.subtotal = existingItem.qty * existingItem.price;
        } else {
            if (product.stock !== '' && product.stock <= 0) {
                return alert('Produk habis.');
            }
            State.cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                costPrice: product.costPrice || 0,
                qty: 1,
                subtotal: product.price,
                note: ''
            });
        }

        this.updateCartUI();

        // Vibrate if supported
        if (navigator.vibrate) navigator.vibrate(50);
    },

    updateCartQty(productId, delta) {
        const itemIndex = State.cart.findIndex(item => item.productId === productId);
        if (itemIndex === -1) return;

        const item = State.cart[itemIndex];
        const products = DB.get(DB.KEYS.PRODUCTS) || [];
        const product = products.find(p => p.id === productId);

        const newQty = item.qty + delta;

        if (newQty <= 0) {
            // Remove item
            State.cart.splice(itemIndex, 1);
        } else {
            if (delta > 0 && product && product.stock !== '' && newQty > product.stock) {
                return alert('Stok tidak mencukupi.');
            }
            item.qty = newQty;
            item.subtotal = item.qty * item.price;
        }

        this.updateCartUI();
    },

    clearCart() {
        if (!confirm('Kosongkan keranjang?')) return;
        State.cart = [];
        this.discountValue = 0;
        this.updateCartUI();
        this.closeCartDrawer();
    },

    calculateTotals() {
        const subtotal = State.cart.reduce((sum, item) => sum + item.subtotal, 0);

        let discountAmount = 0;
        if (this.discountType === 'percentage') {
            discountAmount = subtotal * (this.discountValue / 100);
        } else {
            discountAmount = this.discountValue;
        }

        let afterDiscount = subtotal - discountAmount;
        if (afterDiscount < 0) afterDiscount = 0;

        let taxAmount = 0;
        if (State.settings && State.settings.taxEnabled) {
            taxAmount = afterDiscount * (State.settings.taxRate / 100);
        }

        const total = afterDiscount + taxAmount;

        return { subtotal, discountAmount, taxAmount, total };
    },

    updateCartUI() {
        const cartBadge = document.getElementById('cartBadge');
        const cartTotalText = document.getElementById('cartTotalText');
        const floatingCart = document.getElementById('floatingCart');

        const itemQtyCount = State.cart.reduce((sum, item) => sum + item.qty, 0);
        const { total } = this.calculateTotals();

        if (itemQtyCount > 0) {
            if (floatingCart) floatingCart.classList.remove('translate-y-24');
            if (cartBadge) cartBadge.textContent = itemQtyCount;
            if (cartTotalText) cartTotalText.textContent = app.formatCurrency(total);
        } else {
            if (floatingCart) floatingCart.classList.add('translate-y-24');
        }

        this.renderCartItems();
    },

    renderCartItems() {
        const container = document.getElementById('cartItemsList');
        if (!container) return;

        if (State.cart.length === 0) {
            container.innerHTML = `<div class="py-10 text-center text-gray-400">Keranjang kosong</div>`;
            document.getElementById('cartTotalsSection').classList.add('hidden');
            document.getElementById('checkoutBtn').disabled = true;
            document.getElementById('checkoutBtn').classList.add('opacity-50');
            return;
        }

        document.getElementById('cartTotalsSection').classList.remove('hidden');
        document.getElementById('checkoutBtn').disabled = false;
        document.getElementById('checkoutBtn').classList.remove('opacity-50');

        let html = '';
        State.cart.forEach(item => {
            html += `
            <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div class="flex-1 pr-3">
                    <h4 class="font-semibold text-gray-800 text-sm leading-tight">${item.name}</h4>
                    <p class="text-blue-600 font-medium text-xs mt-0.5">${app.formatCurrency(item.price)}</p>
                </div>
                <div class="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                    <button onclick="cashierController.updateCartQty('${item.productId}', -1)" class="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 active:bg-gray-100">
                        <i class="ph-bold ${item.qty === 1 ? 'ph-trash text-red-500' : 'ph-minus'}"></i>
                    </button>
                    <span class="font-bold text-sm w-4 text-center">${item.qty}</span>
                    <button onclick="cashierController.updateCartQty('${item.productId}', 1)" class="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 active:bg-gray-100">
                        <i class="ph-bold ph-plus"></i>
                    </button>
                </div>
            </div>`;
        });

        container.innerHTML = html;

        // Update totals
        const { subtotal, discountAmount, taxAmount, total } = this.calculateTotals();

        document.getElementById('cartSubtotal').textContent = app.formatCurrency(subtotal);

        const discEl = document.getElementById('cartDiscountRow');
        if (discountAmount > 0) {
            discEl.classList.remove('hidden');
            discEl.classList.add('flex');
            document.getElementById('cartDiscount').textContent = '-' + app.formatCurrency(discountAmount);
        } else {
            discEl.classList.add('hidden');
            discEl.classList.remove('flex');
        }

        const taxEl = document.getElementById('cartTaxRow');
        if (taxAmount > 0) {
            taxEl.classList.remove('hidden');
            taxEl.classList.add('flex');
            document.getElementById('cartTax').textContent = app.formatCurrency(taxAmount);
        } else {
            taxEl.classList.add('hidden');
            taxEl.classList.remove('flex');
        }

        document.getElementById('cartFinalTotal').textContent = app.formatCurrency(total);
        if (document.getElementById('checkoutBtnTotal')) {
            document.getElementById('checkoutBtnTotal').textContent = app.formatCurrency(total);
        }
    },

    openCartDrawer() {
        document.getElementById('cartDrawer').classList.remove('translate-y-full');
        document.getElementById('cartOverlay').classList.remove('hidden');
        this.renderCartItems();
    },

    closeCartDrawer() {
        document.getElementById('cartDrawer').classList.add('translate-y-full');
        document.getElementById('cartOverlay').classList.add('hidden');
    },

    showDiscountModal() {
        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5">
                    <h3 class="text-lg font-bold text-gray-800">Tambah Diskon</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <div class="flex gap-2 mb-4 p-1 bg-gray-100 rounded-xl">
                    <button onclick="cashierController.setDiscountType('percentage')" id="btnDiscPerc" class="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${this.discountType === 'percentage' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}">Persen (%)</button>
                    <button onclick="cashierController.setDiscountType('fixed')" id="btnDiscFix" class="flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${this.discountType === 'fixed' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}">Nominal (Rp)</button>
                </div>
                
                <div class="relative mb-6">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium" id="discSign">${this.discountType === 'fixed' ? 'Rp' : '%'}</span>
                    <input type="number" id="discInput" value="${this.discountValue || ''}" min="0" placeholder="0" class="w-full pl-10 p-4 font-bold text-xl border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-center">
                </div>
                
                <button onclick="cashierController.applyDiscount()" class="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl shadow-md active:bg-blue-700">Terapkan Diskon</button>
                <button onclick="promoController.showPromoPicker()" class="w-full py-3 mt-2 bg-gray-100 text-gray-700 font-semibold rounded-xl active:bg-gray-200 flex items-center justify-center gap-2"><i class="ph-fill ph-lightning"></i> Pilih dari Template Promo</button>
                ${this.discountValue > 0 ? `<button onclick="cashierController.removeDiscount()" class="w-full py-3 mt-1 text-red-500 font-medium active:bg-red-50 rounded-xl">Hapus Diskon</button>` : ''}
            </div>
        `;
        app.showModal(html);
    },

    setDiscountType(type) {
        this.discountType = type;
        document.getElementById('btnDiscPerc').className = `flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${this.discountType === 'percentage' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`;
        document.getElementById('btnDiscFix').className = `flex-1 py-1.5 rounded-lg text-sm font-semibold transition-colors ${this.discountType === 'fixed' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`;
        document.getElementById('discSign').textContent = type === 'fixed' ? 'Rp' : '%';
    },

    applyDiscount() {
        const val = parseFloat(document.getElementById('discInput').value);
        if (isNaN(val) || val < 0) {
            this.discountValue = 0;
        } else {
            this.discountValue = val;
        }
        app.closeModal();
        this.updateCartUI();
    },

    removeDiscount() {
        this.discountValue = 0;
        app.closeModal();
        this.updateCartUI();
    },

    showPaymentModal() {
        if (State.cart.length === 0) return;

        const { total } = this.calculateTotals();

        const html = `
            <div class="p-5 h-[90vh] flex flex-col">
                <div class="flex justify-between items-center mb-5 shrink-0">
                    <h3 class="text-lg font-bold text-gray-800">Pembayaran</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <div class="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-5 flex flex-col items-center justify-center shrink-0">
                    <p class="text-blue-600/80 font-medium text-sm mb-1">Total Tagihan</p>
                    <h2 class="text-3xl font-bold text-blue-700">${app.formatCurrency(total)}</h2>
                </div>
                
                <div class="flex-1 overflow-y-auto pb-6">
                    <h4 class="text-sm font-bold text-gray-700 mb-3">Metode Pembayaran</h4>
                    <div class="grid grid-cols-3 gap-2 mb-6">
                        <label class="cursor-pointer relative">
                            <input type="radio" name="payMethod" value="cash" class="peer sr-only" checked onchange="cashierController.togglePaymentMethod(this.value)">
                            <div class="border-2 border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all">
                                <i class="ph-fill ph-money text-2xl text-green-500"></i>
                                <span class="text-xs font-semibold text-gray-700">Tunai</span>
                            </div>
                            <div class="absolute top-2 right-2 hidden peer-checked:block text-blue-600"><i class="ph-fill ph-check-circle"></i></div>
                        </label>
                        
                        <label class="cursor-pointer relative">
                            <input type="radio" name="payMethod" value="qris" class="peer sr-only" onchange="cashierController.togglePaymentMethod(this.value)">
                            <div class="border-2 border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all">
                                <i class="ph-fill ph-qr-code text-2xl text-blue-500"></i>
                                <span class="text-xs font-semibold text-gray-700">QRIS</span>
                            </div>
                            <div class="absolute top-2 right-2 hidden peer-checked:block text-blue-600"><i class="ph-fill ph-check-circle"></i></div>
                        </label>
                        
                        <label class="cursor-pointer relative">
                            <input type="radio" name="payMethod" value="transfer" class="peer sr-only" onchange="cashierController.togglePaymentMethod(this.value)">
                            <div class="border-2 border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all">
                                <i class="ph-fill ph-bank text-2xl text-orange-500"></i>
                                <span class="text-xs font-semibold text-gray-700">Transfer</span>
                            </div>
                            <div class="absolute top-2 right-2 hidden peer-checked:block text-blue-600"><i class="ph-fill ph-check-circle"></i></div>
                        </label>
                    </div>

                    <!-- Cash Input Area -->
                    <div id="cashInputArea" class="animate-fade-in block">
                        <h4 class="text-sm font-bold text-gray-700 mb-2">Uang Diterima</h4>
                        <div class="relative mb-3">
                            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                            <input type="number" id="cashAmount" placeholder="0" oninput="cashierController.calculateChange()" class="w-full pl-12 p-4 font-bold text-2xl border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-colors">
                        </div>
                        
                        <div class="flex flex-wrap gap-2 mb-4">
                            <button onclick="cashierController.setCashExact(${total})" class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold active:bg-gray-200">Uang Pas</button>
                            <button onclick="cashierController.setCashQuick(10000)" class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold active:bg-gray-200">10rb</button>
                            <button onclick="cashierController.setCashQuick(20000)" class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold active:bg-gray-200">20rb</button>
                            <button onclick="cashierController.setCashQuick(50000)" class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold active:bg-gray-200">50rb</button>
                            <button onclick="cashierController.setCashQuick(100000)" class="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold active:bg-gray-200">100rb</button>
                        </div>
                        
                        <div class="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100">
                            <span class="font-semibold text-gray-600">Kembalian</span>
                            <span class="font-bold text-xl text-gray-800" id="changeAmount">Rp 0</span>
                        </div>
                    </div>
                </div>
                
                <div class="pt-4 border-t border-gray-100 shrink-0">
                    <button id="btnProcessPayment" onclick="cashierController.processPayment()" disabled class="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2">
                        <i class="ph-bold ph-check"></i> Proses Pembayaran
                    </button>
                </div>
            </div>
        `;
        app.showModal(html);
        this.closeCartDrawer();

        // Setup initial state target
        setTimeout(() => this.setCashExact(total), 100);
    },

    togglePaymentMethod(method) {
        const cashArea = document.getElementById('cashInputArea');
        const btnProcess = document.getElementById('btnProcessPayment');

        if (method === 'cash') {
            cashArea.classList.remove('hidden');
            this.calculateChange(); // will enable/disable process button
        } else {
            cashArea.classList.add('hidden');
            btnProcess.disabled = false; // Non-cash is auto lunas
        }
    },

    setCashExact(amount) {
        document.getElementById('cashAmount').value = amount;
        this.calculateChange();
    },

    setCashQuick(amount) {
        document.getElementById('cashAmount').value = amount;
        this.calculateChange();
    },

    calculateChange() {
        const input = document.getElementById('cashAmount');
        const btnProcess = document.getElementById('btnProcessPayment');
        const changeEl = document.getElementById('changeAmount');
        if (!input || !btnProcess || !changeEl) return;

        const { total } = this.calculateTotals();
        const cash = parseFloat(input.value) || 0;

        if (cash >= total) {
            btnProcess.disabled = false;
            changeEl.textContent = app.formatCurrency(cash - total);
            changeEl.classList.remove('text-red-500');
            changeEl.classList.add('text-green-600');
        } else {
            btnProcess.disabled = true;
            changeEl.textContent = 'Rp 0';
            changeEl.classList.add('text-red-500');
            changeEl.classList.remove('text-green-600');
        }
    },

    processPayment() {
        const { subtotal, discountAmount, taxAmount, total } = this.calculateTotals();
        const method = document.querySelector('input[name="payMethod"]:checked').value;

        let paidAmount = total;
        let change = 0;

        if (method === 'cash') {
            paidAmount = parseFloat(document.getElementById('cashAmount').value) || total;
            change = paidAmount - total;
        }

        const counters = DB.get(DB.KEYS.COUNTERS);
        const receiptNo = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(counters.receiptNo).padStart(4, '0')}`;

        const tx = {
            id: app.generateId(),
            receiptNo,
            createdAt: new Date().toISOString(),
            items: [...State.cart],
            discount: { type: this.discountType, value: this.discountValue, amount: discountAmount },
            tax: { enabled: State.settings?.taxEnabled, rate: State.settings?.taxRate, amount: taxAmount },
            payment: { method, paidAmount, change },
            totals: { subtotal, total }
        };

        // Save Tx
        const transactions = DB.get(DB.KEYS.TRANSACTIONS) || [];
        transactions.push(tx);
        DB.save(DB.KEYS.TRANSACTIONS, transactions);

        // Update Counter
        counters.receiptNo++;
        DB.save(DB.KEYS.COUNTERS, counters);

        // Deduct Stock
        const products = DB.get(DB.KEYS.PRODUCTS) || [];
        State.cart.forEach(cartItem => {
            const p = products.find(p => p.id === cartItem.productId);
            if (p && p.stock !== '') {
                p.stock = p.stock - cartItem.qty;
                if (p.stock < 0) p.stock = 0;
            }
        });
        DB.save(DB.KEYS.PRODUCTS, products);

        // Reset Cart
        State.cart = [];
        this.discountValue = 0;

        // Immediately hide the floating cart before showing receipt
        this.updateCartUI();

        // Show Receipt
        this.showReceipt(tx);
    },

    showReceipt(tx) {
        let itemsHtml = '';
        tx.items.forEach(item => {
            itemsHtml += `
                <div class="flex justify-between py-1.5">
                    <div class="text-sm">
                        <div class="font-medium text-gray-800">${item.name}</div>
                        <div class="text-xs text-gray-500">${item.qty} x ${app.formatCurrency(item.price)}</div>
                    </div>
                    <div class="font-medium text-gray-800">${app.formatCurrency(item.subtotal)}</div>
                </div>
            `;
        });

        const isVoided = tx.status === 'voided';
        
        // Load config from HTML
        const cfg = window.BukaOlshopConfig || {
            baseUrl: "",
            printUrl: "/print_halaman?aksi=print",
            shareUrl: "/print_halaman?aksi=share",
            saveUrl: "/print_halaman?aksi=save",
            saveSuccessMessage: "Struk%20Berhasil%20Disimpan"
        };
        
        const buildUrl = (path, withMessage = false) => {
            let url = cfg.baseUrl + path;
            if (withMessage && cfg.saveSuccessMessage) {
                url += (url.includes('?') ? '&' : '?') + 'pesan=' + cfg.saveSuccessMessage;
            }
            return url;
        };

        // Buttons using BukaOlshop Print API from config + Print Mode Wrapper
        const btnPrint = `<button onclick="cashierController.triggerBukaOlshopPrint('${buildUrl(cfg.printUrl)}')" class="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl active:bg-blue-100 gap-1"><i class="ph-bold ph-printer text-xl"></i><span class="text-xs font-bold">Cetak</span></button>`;
        const btnShare = `<button onclick="cashierController.triggerBukaOlshopPrint('${buildUrl(cfg.shareUrl)}')" class="flex flex-col items-center justify-center p-3 bg-green-50 text-green-600 rounded-xl active:bg-green-100 gap-1"><i class="ph-bold ph-share-network text-xl"></i><span class="text-xs font-bold">Bagikan</span></button>`;
        const btnDownload = `<button onclick="cashierController.triggerBukaOlshopPrint('${buildUrl(cfg.saveUrl, true)}')" class="flex flex-col items-center justify-center p-3 bg-purple-50 text-purple-600 rounded-xl active:bg-purple-100 gap-1"><i class="ph-bold ph-download-simple text-xl"></i><span class="text-xs font-bold">Unduh</span></button>`;
        
        const btnVoid = isVoided
            ? `<div class="flex flex-col items-center justify-center p-3 bg-gray-100 text-gray-500 rounded-xl gap-1 col-span-1"><i class="ph-bold ph-prohibit text-xl"></i><span class="text-xs font-bold uppercase">VOIDED</span></div>`
            : `<button onclick="cashierController.voidTransaction('${tx.id}')" class="flex flex-col items-center justify-center p-3 bg-red-50 text-red-600 rounded-xl active:bg-red-100 gap-1"><i class="ph-bold ph-x-circle text-xl"></i><span class="text-xs font-bold">Void</span></button>`;

        const html = `
            <div class="bg-gray-100 h-full w-full flex flex-col fixed top-0 left-0 z-[100] animate-slide-up">
                <!-- Header -->
                <div class="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <h3 class="font-bold text-gray-800 text-lg">Struk Transaksi</h3>
                    <button onclick="cashierController.closeReceiptModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 active:bg-gray-200"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <!-- Scrollable Content -->
                <div class="flex-1 overflow-y-auto p-4 flex flex-col items-center pb-8">
                    <!-- Receipt Paper optimized for 58mm Bluetooth Printer (~32 chars width) -->
                    <div id="receiptPaper" class="bg-white p-4 text-black w-full max-w-[300px] relative overflow-hidden mb-6" style="font-family: monospace; font-size: 12px; line-height: 1.2;">
                        <!-- Header -->
                        <div class="text-center mb-4">
                            <h2 class="font-bold text-lg uppercase mb-1 leading-tight">${State.settings?.storeName || 'Toko'}</h2>
                            <p class="text-[10px] mb-1">${app.formatDate(tx.createdAt)}</p>
                            <p class="text-[10px] border-b border-black border-dotted pb-2 mb-2">No: ${tx.receiptNo}</p>
                            ${isVoided ? '<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-black font-black text-4xl border-4 border-black p-1 rounded z-10">VOID</div>' : ''}
                        </div>
                        
                        <!-- Items -->
                        <div class="border-b border-black border-dotted pb-2 mb-2">
                            ${tx.items.map(item => `
                                <div class="flex justify-between items-start mb-1">
                                    <div class="pr-2 w-3/4">
                                        <div class="font-bold whitespace-nowrap overflow-hidden text-ellipsis">${item.name}</div>
                                        <div class="text-[10px]">${item.qty} x ${app.formatCurrency(item.price)}</div>
                                    </div>
                                    <div class="font-bold text-right pl-1 w-1/4">${app.formatCurrency(item.subtotal)}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <!-- Totals -->
                        <div class="border-b border-black border-dotted pb-2 mb-2 space-y-1 text-[11px]">
                            <div class="flex justify-between">
                                <span>Subtotal</span>
                                <span>${app.formatCurrency(tx.totals.subtotal)}</span>
                            </div>
                            ${tx.discount.amount > 0 ? `
                            <div class="flex justify-between">
                                <span>Diskon</span>
                                <span>-${app.formatCurrency(tx.discount.amount)}</span>
                            </div>` : ''}
                            ${tx.tax.amount > 0 ? `
                            <div class="flex justify-between">
                                <span>PPN</span>
                                <span>${app.formatCurrency(tx.tax.amount)}</span>
                            </div>` : ''}
                        </div>
                        
                        <div class="flex justify-between font-extrabold text-sm mb-3">
                            <span>TOTAL</span>
                            <span>${app.formatCurrency(tx.totals.total)}</span>
                        </div>
                        
                        <!-- Payment -->
                        <div class="space-y-1 text-[11px] pt-1">
                            <div class="flex justify-between">
                                <span>Tunai/Lunas</span>
                                <span>${app.formatCurrency(tx.payment.paidAmount)}</span>
                            </div>
                            <div class="flex justify-between font-bold pt-1">
                                <span>Kembali</span>
                                <span>${app.formatCurrency(tx.payment.change)}</span>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div class="text-center mt-6 pt-3 border-t border-black border-dotted">
                            <p class="text-[10px] font-bold uppercase">Terima Kasih</p>
                        </div>
                    </div>
                </div>
                
                <!-- Bottom Action Grid -->
                <div class="bg-white p-4 border-t border-gray-200 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] shrink-0 w-full z-50 rounded-t-2xl pb-safe">
                    <div class="grid grid-cols-4 gap-3 max-w-sm mx-auto">
                        ${btnPrint}
                        ${btnShare}
                        ${btnDownload}
                        ${btnVoid}
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('fullReceiptModal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'fullReceiptModal';
        modal.innerHTML = html;
        document.body.appendChild(modal);

        document.body.style.overflow = 'hidden';
    },

    closeReceiptModal() {
        const modal = document.getElementById('fullReceiptModal');
        if (modal) modal.remove();
        document.body.style.overflow = '';
    },

    triggerBukaOlshopPrint(url) {
        // 1. Activate Clean Print Mode (Hides UI, centers receipt)
        document.body.classList.add('print-mode');
        
        // 2. Wait for UI to hide, then trigger BukaOlshop screen capture
        setTimeout(() => {
            window.location.href = url;
            
            // 3. Restore UI after 3 seconds (assuming APK has finished capturing)
            setTimeout(() => {
                document.body.classList.remove('print-mode');
            }, 3000);
            
        }, 500);
    },

    voidTransaction(id) {
        if (!confirm('Batalkan / void transaksi ini? Stok produk akan dikembalikan.')) return;

        const transactions = DB.get(DB.KEYS.TRANSACTIONS) || [];
        const txIdx = transactions.findIndex(t => t.id === id);
        if (txIdx === -1) return alert('Transaksi tidak ditemukan.');

        const tx = transactions[txIdx];
        if (tx.status === 'voided') return alert('Transaksi ini sudah divoid sebelumnya.');

        // Mark as voided
        transactions[txIdx].status = 'voided';
        transactions[txIdx].voidedAt = new Date().toISOString();
        DB.save(DB.KEYS.TRANSACTIONS, transactions);

        // Restore stock
        const products = DB.get(DB.KEYS.PRODUCTS) || [];
        tx.items.forEach(cartItem => {
            const p = products.find(p => p.id === cartItem.productId);
            if (p && p.stock !== '') {
                p.stock = parseInt(p.stock) + cartItem.qty;
            }
        });
        DB.save(DB.KEYS.PRODUCTS, products);

        // Close modal and refresh history if on history view
        app.closeModal();

        // If currently on history view, re-render
        if (State.currentView === 'history') {
            historyController.renderList();
        }

        alert('Transaksi berhasil di-void. Stok produk telah dikembalikan.');
    },

    finishTransaction() {
        app.closeModal();

        // Cart is already empty (cleared in processPayment); reset discount
        this.discountValue = 0;
        State.cart = [];

        // Clear search and go back to categories
        const searchEl = document.getElementById('cashierSearch');
        if (searchEl) searchEl.value = '';
        this.searchQuery = '';

        // Re-render category rows and reset to category screen
        this.renderCategoryRows();
        this.showScreen('categories');
        this.updateCartUI();
    }
};

// History Controller
const historyController = {
    selectedDate: '',

    init() {
        const today = new Date();
        this.selectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const dateInput = document.getElementById('historyDateFilter');
        if (dateInput) {
            dateInput.value = this.selectedDate;
        }

        this.renderList();
    },

    filterByDate(dateStr) {
        if (!dateStr) return;
        this.selectedDate = dateStr;
        this.renderList();
    },

    renderList() {
        const container = document.getElementById('historyList');
        const emptyState = document.getElementById('historyEmpty');

        if (!container || !emptyState) return;

        const allTxs = DB.get(DB.KEYS.TRANSACTIONS) || [];

        // Target date boundaries
        const [year, month, day] = this.selectedDate.split('-').map(Number);
        const startOfSelected = new Date(year, month - 1, day).getTime();
        const endOfSelected = new Date(year, month - 1, day + 1).getTime();

        const filteredTxs = allTxs.filter(t => {
            const tTime = new Date(t.createdAt).getTime();
            return tTime >= startOfSelected && tTime < endOfSelected;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

        // Update Stats - only count non-voided transactions for revenue
        const totalRev = filteredTxs.filter(t => t.status !== 'voided').reduce((sum, t) => sum + t.totals.total, 0);
        document.getElementById('historyTotalRev').textContent = app.formatCurrency(totalRev);
        document.getElementById('historyCount').textContent = `${filteredTxs.length} Transaksi`;

        if (filteredTxs.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            emptyState.classList.add('flex');
            return;
        }

        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');

        let html = '';
        filteredTxs.forEach(tx => {
            const tDate = new Date(tx.createdAt);
            const timeStr = `${String(tDate.getHours()).padStart(2, '0')}:${String(tDate.getMinutes()).padStart(2, '0')}`;

            const isVoided = tx.status === 'voided';
            let methodIcon = 'ph-money text-green-500';
            if (tx.payment.method === 'qris') methodIcon = 'ph-qr-code text-blue-500';
            else if (tx.payment.method === 'transfer') methodIcon = 'ph-bank text-orange-500';
            if (isVoided) methodIcon = 'ph-x-circle text-red-400';

            html += `
            <div onclick="historyController.showDetail('${tx.id}')" class="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border ${isVoided ? 'border-red-200 opacity-70' : 'border-gray-100'} p-4 active:scale-95 transition-transform flex items-center gap-3 cursor-pointer">
                <div class="w-10 h-10 rounded-full ${isVoided ? 'bg-red-50' : 'bg-gray-50'} flex items-center justify-center shrink-0">
                    <i class="ph-fill ${methodIcon} text-xl"></i>
                </div>
                <div class="flex-1 pr-2">
                    <div class="flex items-center gap-2 mb-0.5">
                        <p class="font-bold text-gray-800 text-sm">${tx.receiptNo}</p>
                        ${isVoided ? '<span class="text-[10px] bg-red-100 text-red-500 font-bold px-1.5 py-0.5 rounded">VOID</span>' : ''}
                    </div>
                    <p class="text-xs text-gray-500">${timeStr} • ${tx.items.length} item(s)</p>
                </div>
                <div class="text-right">
                    <p class="font-bold ${isVoided ? 'line-through text-gray-400' : 'text-blue-600'} text-sm">${app.formatCurrency(tx.totals.total)}</p>
                </div>
            </div>`;
        });

        container.innerHTML = html;
    },

    showDetail(id) {
        const txs = DB.get(DB.KEYS.TRANSACTIONS) || [];
        const tx = txs.find(t => t.id === id);
        if (!tx) return;

        // Reuse cashier receipt UI
        cashierController.showReceipt(tx);
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

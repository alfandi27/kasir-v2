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

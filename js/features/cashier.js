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
            const stockNum = typeof p.stock === 'number' ? p.stock : parseFloat(p.stock);
            const hasStockLimit = p.stock !== '' && !isNaN(stockNum);
            const isOutOfStock = hasStockLimit && stockNum <= 0;
            const isLowStock = hasStockLimit && stockNum > 0 && stockNum <= 5;
            
            let stockBadge = '';
            if (isOutOfStock) {
                stockBadge = `<span class="px-2 py-0.5 mt-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full w-max">Habis</span>`;
            } else if (isLowStock) {
                stockBadge = `<span class="px-2 py-0.5 mt-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full w-max animate-pulse">Sisa: ${stockNum}</span>`;
            }

            const cursorClass = isOutOfStock ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:bg-blue-50';
            const clickHandler = isOutOfStock ? '' : `onclick="cashierController.addToCart('${p.id}')"`;
            const iconBg = isOutOfStock ? 'bg-gray-300' : 'bg-blue-600';

            return `
            <div ${clickHandler} class="bg-white flex items-center gap-3 px-4 py-3.5 transition-colors ${cursorClass}">
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 class="font-semibold text-gray-800 text-sm leading-snug">${p.name}</h3>
                    <p class="text-blue-600 font-bold text-sm mt-0.5">${app.formatCurrency(p.price)}</p>
                    ${stockBadge}
                </div>
                <div class="w-9 h-9 rounded-full ${iconBg} flex items-center justify-center shrink-0 shadow-sm">
                    <i class="ph-bold ${isOutOfStock ? 'ph-prohibit' : 'ph-plus'} text-white text-base"></i>
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
        const customers = DB.get(DB.KEYS.CUSTOMERS) || [];
        let customerOptions = '<option value="">-- Pilih Pelanggan (Opsional) --</option>';
        customers.sort((a, b) => a.name.localeCompare(b.name)).forEach(c => {
            customerOptions += `<option value="${c.id}">${c.name} - ${c.phone || '-'}</option>`;
        });

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
                    <div class="mb-5">
                        <h4 class="text-sm font-bold text-gray-700 mb-2">Pelanggan</h4>
                        <select id="checkoutCustomer" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-colors text-sm">
                            ${customerOptions}
                        </select>
                    </div>

                    <h4 class="text-sm font-bold text-gray-700 mb-3">Metode Pembayaran</h4>
                    <div class="grid grid-cols-4 gap-2 mb-6">
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

                        <label class="cursor-pointer relative">
                            <input type="radio" name="payMethod" value="debt" id="payMethodDebt" class="peer sr-only" onchange="cashierController.togglePaymentMethod(this.value)">
                            <div class="border-2 border-gray-100 rounded-xl p-3 flex flex-col items-center gap-2 peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all">
                                <i class="ph-fill ph-book-bookmark text-2xl text-red-500"></i>
                                <span class="text-xs font-semibold text-gray-700">Kasbon</span>
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
        } else if (method === 'debt') {
            paidAmount = 0;
            change = 0;
            const customerId = document.getElementById('checkoutCustomer') ? document.getElementById('checkoutCustomer').value : null;
            if (!customerId) {
                return alert('Untuk pembayaran Kasbon, Anda wajib memilih Nama Pelanggan di atas!');
            }
        }

        const counters = DB.get(DB.KEYS.COUNTERS);
        const receiptNo = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(counters.receiptNo).padStart(4, '0')}`;

        // Customer check
        const customerId = document.getElementById('checkoutCustomer') ? document.getElementById('checkoutCustomer').value : null;
        let customerInfo = null;
        if (customerId) {
            const customers = DB.get(DB.KEYS.CUSTOMERS) || [];
            const cust = customers.find(c => c.id === customerId);
            if (cust) customerInfo = { id: cust.id, name: cust.name, phone: cust.phone };
        }

        const txId = app.generateId();

        const tx = {
            id: txId,
            receiptNo,
            createdAt: new Date().toISOString(),
            customerId: customerId || null,
            customer: customerInfo,
            items: [...State.cart],
            discount: { type: this.discountType, value: this.discountValue, amount: discountAmount },
            tax: { enabled: State.settings?.taxEnabled, rate: State.settings?.taxRate, amount: taxAmount },
            payment: { method, paidAmount, change },
            totals: { subtotal, total }
        };

        // If Kasbon, save debt record
        if (method === 'debt') {
            const debts = DB.get(DB.KEYS.DEBTS) || [];
            debts.push({
                id: app.generateId(),
                customerId: customerId,
                transactionId: txId,
                amount: total,
                status: 'unpaid',
                createdAt: new Date().toISOString()
            });
            DB.save(DB.KEYS.DEBTS, debts);
        }

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
        // We pass 'true' as the second argument for the Print function to trigger Thermal Mode
        const btnPrint = `<button onclick="cashierController.triggerBukaOlshopPrint('${buildUrl(cfg.printUrl)}', true)" class="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl active:bg-blue-100 gap-1"><i class="ph-bold ph-printer text-xl"></i><span class="text-xs font-bold">Cetak</span></button>`;
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
                    <!-- Receipt Paper optimized for flexible designs -->
                    <div id="receiptPaper" class="bg-white p-6 shadow-sm w-full max-w-sm rounded-[5px] relative overflow-hidden mb-6 text-gray-800 transition-all duration-300">
                        <div class="text-center mb-6">
                            <h2 class="font-bold text-xl uppercase mb-1">${State.settings?.storeName || 'Toko'}</h2>
                            <p class="text-[10px] text-gray-500">${app.formatDate(tx.createdAt)}</p>
                            <p class="text-[10px] text-gray-500 border-b border-dashed border-gray-300 pb-3 mb-3">No: ${tx.receiptNo}</p>
                            ${isVoided ? '<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-red-500/20 font-black text-6xl border-8 border-red-500/20 p-2 rounded-xl pointer-events-none">VOID</div>' : ''}
                        </div>
                        
                        <div class="border-b border-dashed border-gray-300 pb-3 mb-3">
                            ${tx.items.map(item => `
                                <div class="flex justify-between items-start mb-2">
                                    <div class="text-sm w-3/4 pr-2">
                                        <div class="font-medium text-gray-800">${item.name}</div>
                                        <div class="text-xs text-gray-500">${item.qty} x ${app.formatCurrency(item.price)}</div>
                                    </div>
                                    <div class="font-medium text-gray-800 w-1/4 text-right">${app.formatCurrency(item.subtotal)}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1 text-sm">
                            <div class="flex justify-between text-gray-500">
                                <span>Subtotal</span>
                                <span>${app.formatCurrency(tx.totals.subtotal)}</span>
                            </div>
                            ${tx.discount.amount > 0 ? `
                            <div class="flex justify-between text-gray-500">
                                <span>Diskon</span>
                                <span>-${app.formatCurrency(tx.discount.amount)}</span>
                            </div>` : ''}
                            ${tx.tax.amount > 0 ? `
                            <div class="flex justify-between text-gray-500">
                                <span>Pajak PPN</span>
                                <span>${app.formatCurrency(tx.tax.amount)}</span>
                            </div>` : ''}
                        </div>
                        
                        <div class="flex justify-between font-bold text-lg mb-4">
                            <span>TOTAL</span>
                            <span>${app.formatCurrency(tx.totals.total)}</span>
                        </div>
                        
                        <div class="space-y-1 text-sm pt-2">
                            ${tx.customer ? `
                            <div class="flex justify-between text-gray-500 mb-2 border-b border-dashed border-gray-300 pb-2">
                                <span>Pelanggan</span>
                                <span class="font-bold text-gray-800">${tx.customer.name}</span>
                            </div>` : ''}
                            <div class="flex justify-between text-gray-500">
                                <span>Tunai / Lunas</span>
                                <span>${app.formatCurrency(tx.payment.paidAmount)}</span>
                            </div>
                            <div class="flex justify-between font-semibold text-gray-800 pt-1">
                                <span>Kembali</span>
                                <span>${app.formatCurrency(tx.payment.change)}</span>
                            </div>
                        </div>
                        
                        <div class="text-center mt-10 pt-4 border-t border-dashed border-gray-300">
                            <p class="text-xs text-gray-500 font-bold uppercase">Terima Kasih</p>
                        </div>
                        
                        <!-- Top/Bottom decorations -->
                        <div class="absolute top-0 left-0 w-full h-2" style="background-image: radial-gradient(circle at 5px 0, transparent 4px, white 5px); background-size: 10px 10px;"></div>
                        <div class="absolute bottom-0 left-0 w-full h-2" style="background-image: radial-gradient(circle at 5px 10px, transparent 4px, white 5px); background-size: 10px 10px; transform: rotate(180deg)"></div>
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

    triggerBukaOlshopPrint(url, isThermalPrint = false) {
        // 1. Activate Clean Print Mode (Hides UI)
        document.body.classList.add('print-mode');
        
        // If printing to Blueooth printer, apply strict monochrome/monospace limits
        if (isThermalPrint) {
            document.body.classList.add('thermal-mode');
        }
        
        // 2. Wait for UI to hide & css changes to apply
        setTimeout(() => {
            window.location.href = url;
            
            // 3. Restore UI after 3 seconds (assuming APK has finished capturing)
            setTimeout(() => {
                document.body.classList.remove('print-mode');
                document.body.classList.remove('thermal-mode');
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
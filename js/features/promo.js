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

// Customer Controller (CRM)
const customerController = {
    openCustomerManager() {
        const customers = DB.get(DB.KEYS.CUSTOMERS) || [];
        
        let listHtml = '';
        if (customers.length === 0) {
            listHtml = `<div class="p-8 text-center text-gray-400">Belum ada data pelanggan.</div>`;
        } else {
            // Sort by newest first
            customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).forEach(c => {
                listHtml += `
                <div class="flex items-center justify-between p-4 border-b border-gray-100 bg-white">
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${c.name}</p>
                        <p class="text-xs text-gray-500">${c.phone || '-'}</p>
                    </div>
                    <button onclick="customerController.deleteCustomer('${c.id}')" class="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>`;
            });
        }

        const html = `
            <div class="h-[90vh] flex flex-col bg-gray-50">
                <div class="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <h3 class="font-bold text-gray-800 text-lg">Kelola Pelanggan</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 active:bg-gray-200"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <div class="p-4 bg-white border-b border-gray-100 shrink-0">
                    <button onclick="customerController.showCustomerForm()" class="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md active:bg-blue-700 flex justify-center items-center gap-2">
                        <i class="ph-bold ph-plus"></i> Tambah Pelanggan
                    </button>
                </div>
                
                <div class="flex-1 overflow-y-auto pb-safe" id="customerManagerList">
                    ${listHtml}
                </div>
            </div>
        `;
        app.showModal(html);
    },

    showCustomerForm() {
        const html = `
            <div class="p-5">
                <div class="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                    <h3 class="text-lg font-bold text-gray-800">Tambah Pelanggan Baru</h3>
                    <button onclick="document.getElementById('customerFormModal').remove()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 active:bg-gray-200"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <form onsubmit="customerController.saveCustomer(event)" class="flex flex-col gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Pelanggan <span class="text-red-500">*</span></label>
                        <input type="text" id="custName" required placeholder="Contoh: Budi Santoso" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">No. Handphone</label>
                        <input type="tel" id="custPhone" placeholder="Contoh: 08123456789" class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-colors">
                    </div>
                    
                    <button type="submit" class="w-full py-3.5 mt-2 bg-blue-600 text-white font-bold rounded-xl shadow-md active:bg-blue-700">Simpan Pelanggan</button>
                </form>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'customerFormModal';
        modal.className = 'fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in';
        modal.innerHTML = `
            <div class="bg-white w-full max-w-md w-full rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up" onclick="event.stopPropagation()">
                ${html}
            </div>
        `;
        modal.onclick = () => modal.remove();
        document.body.appendChild(modal);
    },

    saveCustomer(e) {
        e.preventDefault();
        const name = document.getElementById('custName').value.trim();
        const phone = document.getElementById('custPhone').value.trim();
        
        if (!name) return alert('Nama pelanggan wajib diisi.');
        
        const customers = DB.get(DB.KEYS.CUSTOMERS) || [];
        customers.push({
            id: app.generateId(),
            name,
            phone,
            createdAt: new Date().toISOString()
        });
        
        DB.save(DB.KEYS.CUSTOMERS, customers);
        
        // Close form modal
        const formModal = document.getElementById('customerFormModal');
        if (formModal) formModal.remove();
        
        // Refresh manager if open
        const managerList = document.getElementById('customerManagerList');
        if (managerList) {
            this.openCustomerManager();
        }
        
        // If on cashier screen and payment modal is open, we might want to refresh the dropdown.
        // For simplicity, user can reopen payment modal.
        app.showToast('Pelanggan berhasil ditambahkan');
    },

    deleteCustomer(id) {
        if (!confirm('Hapus pelanggan ini? Histori transaksi tidak akan terhapus, namun nama pelanggan tidak akan tersambung lagi.')) return;
        
        let customers = DB.get(DB.KEYS.CUSTOMERS) || [];
        customers = customers.filter(c => c.id !== id);
        DB.save(DB.KEYS.CUSTOMERS, customers);
        
        this.openCustomerManager();
        app.showToast('Pelanggan dihapus');
    }
};

// Debt Controller (Kasbon)
const debtController = {
    openDebtManager() {
        const debts = DB.get(DB.KEYS.DEBTS) || [];
        const customers = DB.get(DB.KEYS.CUSTOMERS) || [];
        
        let listHtml = '';
        if (debts.length === 0) {
            listHtml = `<div class="p-8 text-center text-gray-400">Belum ada catatan kasbon.</div>`;
        } else {
            // Sort by unpaid first, then newest
            debts.sort((a, b) => {
                if (a.status !== b.status) return a.status === 'unpaid' ? -1 : 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            }).forEach(d => {
                const customer = customers.find(c => c.id === d.customerId);
                const isPaid = d.status === 'paid';
                const badge = isPaid 
                    ? `<span class="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">Lunas</span>` 
                    : `<span class="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">Belum Lunas</span>`;
                
                listHtml += `
                <div class="p-4 border-b border-gray-100 bg-white flex flex-col gap-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-gray-800 text-sm">${customer ? customer.name : 'Pelanggan Tidak Diketahui'}</p>
                            <p class="text-xs text-gray-500">${app.formatDate(d.createdAt)}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-blue-600 text-sm">${app.formatCurrency(d.amount)}</p>
                            ${badge}
                        </div>
                    </div>
                    ${!isPaid ? `
                    <button onclick="debtController.markAsPaid('${d.id}')" class="w-full py-2 bg-green-50 text-green-600 font-bold text-sm rounded-lg active:bg-green-100 border border-green-200">
                        Lunasi Kasbon
                    </button>
                    ` : `
                    <p class="text-xs text-gray-400 italic">Dilunasi pada: ${app.formatDate(d.paidAt)}</p>
                    `}
                </div>`;
            });
        }

        const html = `
            <div class="h-[90vh] flex flex-col bg-gray-50">
                <div class="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <h3 class="font-bold text-gray-800 text-lg">Buku Kasbon</h3>
                    <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 active:bg-gray-200"><i class="ph-bold ph-x"></i></button>
                </div>
                
                <div class="flex-1 overflow-y-auto pb-safe" id="debtManagerList">
                    ${listHtml}
                </div>
            </div>
        `;
        app.showModal(html);
    },

    markAsPaid(id) {
        if (!confirm('Tandai kasbon ini sebagai sudah lunas?')) return;
        
        let debts = DB.get(DB.KEYS.DEBTS) || [];
        const index = debts.findIndex(d => d.id === id);
        if (index > -1) {
            debts[index].status = 'paid';
            debts[index].paidAt = new Date().toISOString();
            DB.save(DB.KEYS.DEBTS, debts);
            
            // Re-render
            this.openDebtManager();
            app.showToast('Kasbon berhasil dilunasi');
        }
    }
};

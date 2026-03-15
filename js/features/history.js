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

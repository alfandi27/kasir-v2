// Reports Controller
const reportsController = {
    currentFilter: 'today', // today, month, year
    chartInstance: null,

    init() {
        this.renderStats();
        this.renderChart();
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
    },

    renderChart() {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const period = parseInt(document.getElementById('reportChartPeriod').value || '7');
        const transactions = DB.get(DB.KEYS.TRANSACTIONS) || [];
        
        // Generate last N days data
        const labels = [];
        const data = [];
        const now = new Date();

        for (let i = period - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            // Format label (e.g. "12 Mar")
            const labelStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
            labels.push(labelStr);

            // Calculate revenue for that day
            const startOfDay = d.getTime();
            const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
            
            const dayRevenue = transactions.filter(t => {
                const tTime = new Date(t.createdAt).getTime();
                return tTime >= startOfDay && tTime < endOfDay && t.status !== 'voided';
            }).reduce((sum, t) => sum + t.totals.total, 0);

            data.push(dayRevenue);
        }

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pendapatan',
                    data: data,
                    borderColor: '#2563eb', // blue-600
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2563eb',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return app.formatCurrency(context.raw);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af', font: { size: 10 } }
                    },
                    y: {
                        border: { display: false },
                        grid: { color: '#f3f4f6' },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 10 },
                            callback: function(value) {
                                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'jt';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                return value;
                            }
                        }
                    }
                }
            }
        });
    },

    async exportExcel() {
        const transactions = DB.get(DB.KEYS.TRANSACTIONS) || [];
        
        // Determine start time based on filter
        const now = new Date();
        let startTime = 0;
        let filenamePrefix = 'hari_ini';

        if (this.currentFilter === 'today') {
            startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            filenamePrefix = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        } else if (this.currentFilter === 'month') {
            startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
            filenamePrefix = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        } else if (this.currentFilter === 'year') {
            startTime = new Date(now.getFullYear(), 0, 1).getTime();
            filenamePrefix = `${now.getFullYear()}`;
        }

        const filteredTxs = transactions.filter(t => {
            return new Date(t.createdAt).getTime() >= startTime && t.status !== 'voided';
        });

        if (filteredTxs.length === 0) {
            return alert('Tidak ada transaksi untuk diekspor pada rentang waktu ini.');
        }

        // Generate JSON data for the sheet
        const sheetData = filteredTxs.map(tx => {
            const dateObj = new Date(tx.createdAt);
            const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
            const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
            
            return {
                "Tanggal": dateStr,
                "Waktu": timeStr,
                "No Struk": tx.receiptNo,
                "Pelanggan": tx.customer ? tx.customer.name : '-',
                "Metode Bayar": tx.payment.method.toUpperCase(),
                "Subtotal": tx.totals.subtotal,
                "Diskon": tx.discount.amount,
                "Pajak PPN": tx.tax.amount || 0,
                "Total Transaksi": tx.totals.total
            };
        });

        // Initialize workbook & worksheet using SheetJS
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sheetData);
        
        // Customize column widths
        const wscols = [
            {wch: 12}, // Tanggal
            {wch: 8},  // Waktu
            {wch: 22}, // No Struk
            {wch: 20}, // Pelanggan
            {wch: 15}, // Metode Bayar
            {wch: 15}, // Subtotal
            {wch: 15}, // Diskon
            {wch: 15}, // Pajak PPN
            {wch: 15}  // Total Transaksi
        ];
        ws['!cols'] = wscols;
        XLSX.utils.book_append_sheet(wb, ws, "Penjualan");

        // --- Unique filename (timestamp + random 8-char hex) ---
        const uid = Date.now().toString(16) + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
        const filename = `laporan_${filenamePrefix}_${uid}.xlsx`;

        // --- Convert workbook to Blob ---
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // --- Show loading indicator ---
        app.showToast('Menyiapkan file laporan...');

        try {
            // --- Upload to API ---
            const formData = new FormData();
            const fileObj = new File([blob], filename, { type: blob.type });
            formData.append('file', fileObj);

            const uploadRes = await fetch('https://upload-v2.vercel.app/api/upload', {
                method: 'POST',
                headers: { 'x-api-key': 'fanfanstore' },
                body: formData
            });

            const uploadJson = await uploadRes.json();

            if (!uploadRes.ok || !uploadJson.success) {
                throw new Error(uploadJson.error || 'Upload gagal');
            }

            const fileUrl = uploadJson.data.url;
            const downloadUrl = `https://upload-v2.vercel.app/api/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(filename)}`;

            // --- Show link in Modal instead of auto-download ---
            app.closeModal(); // close any existing modal just in case
            
            const modalHtml = `
                <div class="p-5">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="text-lg font-bold text-gray-800">Laporan Siap Diunduh</h3>
                        <button onclick="app.closeModal()" class="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600 active:bg-gray-200"><i class="ph-bold ph-x"></i></button>
                    </div>
                    
                    <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 text-center">
                        <i class="ph-fill ph-file-xls text-4xl text-green-600 mb-2"></i>
                        <p class="font-semibold text-gray-800 text-sm mb-1 truncate">${filename}</p>
                        <p class="text-xs text-gray-500">File laporan Anda sudah berhasil dibuat dan disimpan di server siap untuk diunduh.</p>
                    </div>

                    <div class="flex flex-col gap-3">
                        <div class="relative">
                            <input type="text" id="reportLinkInput" value="${downloadUrl}" readonly class="w-full p-3 pr-12 text-xs bg-gray-100 border border-gray-200 rounded-xl text-gray-500 outline-none">
                            <button onclick="reportsController.copyLink()" class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-blue-600 active:bg-blue-50 shadow-sm transition-all hover:scale-105">
                                <i class="ph-bold ph-copy"></i>
                            </button>
                        </div>
                        
                        <a href="${downloadUrl}&bukaolshop_open_browser=true" target="_blank" class="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-[0_4px_12px_rgba(37,99,235,0.3)] active:bg-blue-700 mt-2 flex justify-center items-center gap-2 text-sm transition-all hover:-translate-y-0.5" onclick="app.closeModal()">
                            <i class="ph-bold ph-download-simple text-lg"></i> Download Sekarang
                        </a>
                    </div>
                </div>
            `;
            app.showModal(modalHtml);
            app.showToast('Link laporan berhasil dibuat!');

        } catch (err) {
            console.error(err);
            alert('Gagal mengunduh laporan: ' + err.message);
        }
    },

    copyLink() {
        const input = document.getElementById('reportLinkInput');
        if (input) {
            input.select();
            input.setSelectionRange(0, 99999); // Untuk mobile
            navigator.clipboard.writeText(input.value).then(() => {
                app.showToast('Link berhasil disalin!');
            }).catch(err => {
                console.error('Gagal menyalin:', err);
                app.showToast('Gagal menyalin link');
            });
        }
    }
};

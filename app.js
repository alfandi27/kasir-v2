// Main App Controller
Object.assign(app, {
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
});

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

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
        PROMOS: 'pos_promos',
        CUSTOMERS: 'pos_customers',
        DEBTS: 'pos_debts'
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
        if (!localStorage.getItem(this.KEYS.CUSTOMERS)) this.save(this.KEYS.CUSTOMERS, []);
        if (!localStorage.getItem(this.KEYS.DEBTS)) this.save(this.KEYS.DEBTS, []);
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
    customerId: null, // Tracks selected customer for the current transaction
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
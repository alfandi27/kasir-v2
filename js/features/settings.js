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

        // Render theme picker
        this.renderThemePicker();
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

    resetData() {
        DB.clearData();
    }
};

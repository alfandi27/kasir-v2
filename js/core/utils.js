// Utils & Modal System
const app = {
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
    },

    // Toast System
    showToast(message, duration = 3000) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'fixed top-4 left-1/2 -translate-x-1/2 w-4/5 max-w-sm flex flex-col gap-2 z-[100] transition-all pointer-events-none';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'bg-gray-800 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg transform transition-all duration-300 translate-y-[-20px] opacity-0 flex items-center justify-center text-center';
        toast.textContent = message;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-[-20px]', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
    }
};

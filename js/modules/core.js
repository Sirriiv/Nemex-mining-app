// Core functionality and utilities
const Core = {
    API_BASE: 'https://nemex-backend.onrender.com',
    countdownInterval: null,
    currentUserId: null,
    isLoading: false,

    init() {
        this.currentUserId = this.getStableUserId();
        console.log('Core module initialized');
    },

    getStableUserId() {
        let userId = localStorage.getItem('userId');
        if (userId) {
            console.log('Found existing user ID:', userId);
            return userId;
        }
        userId = this.generateStableUserId();
        localStorage.setItem('userId', userId);
        if (!localStorage.getItem('joinDate')) {
            localStorage.setItem('joinDate', new Date().toISOString());
        }
        console.log('Created new stable user ID:', userId);
        return userId;
    },

    generateStableUserId() {
        const components = [
            navigator.userAgent, navigator.language,
            navigator.hardwareConcurrency || 'unknown',
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset()
        ];
        let hash = 0;
        const str = components.join('|');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'user_' + Math.abs(hash).toString(36) + '_' + Date.now();
    },

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    showLoading(message = 'Loading...') {
        const loading = document.getElementById('loading');
        const status = loading.querySelector('.loading-status');
        status.textContent = message;
        loading.classList.remove('hidden');
    },

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 500);
    },

    copyToClipboard(elementId) {
        const text = document.getElementById(elementId).textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        }).catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Copied to clipboard!');
        });
    }
};
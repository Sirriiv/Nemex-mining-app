// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    Core.init();
    Navigation.init();
    Settings.init();
    User.init();
    
    // Make functions globally available
    window.copyToClipboard = Core.copyToClipboard;
    window.Utils = Utils;
    window.API = API;
    
    console.log('🚀 NEMEXCOIN App initialized successfully!');
});

// Handle page visibility changes (for countdown accuracy)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && User.startCountdown) {
        // Page became visible, refresh countdown if needed
        const savedCountdown = localStorage.getItem('backupCountdown');
        const savedLastUpdate = localStorage.getItem('backupLastUpdate');
        
        if (savedCountdown && savedLastUpdate) {
            const elapsedSeconds = Math.floor((Date.now() - parseInt(savedLastUpdate)) / 1000);
            const remainingTime = Math.max(0, parseInt(savedCountdown) - elapsedSeconds);
            User.startCountdown(remainingTime);
        }
    }
});

// Handle online/offline status
window.addEventListener('online', function() {
    Utils.showNotification('Connection restored', 'success');
    // Try to sync data with backend
    User.initializeUser().catch(console.error);
});

window.addEventListener('offline', function() {
    Utils.showNotification('You are currently offline', 'error');
});
// Core Application Logic
function initializeApp() {
    initializeNavigation();
    initializeSettings();
    initializeUser();
    
    // Load home section by default
    loadSection('home');
}

// Make functions globally available for HTML onclick events
window.copyToClipboard = copyToClipboard;
window.claimReward = claimReward;
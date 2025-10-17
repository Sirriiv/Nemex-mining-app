// Utility Functions
class Utils {
    static formatNumber(number, decimals = 2) {
        return parseFloat(number).toFixed(decimals);
    }
    
    static copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard: ' + text);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }
    
    static showNotification(message, type = 'info') {
        // Simple notification implementation
        alert(message);
    }
}

// Copy referral code function
function copyReferralCode() {
    Utils.copyToClipboard('NMX-USER-1234');
}
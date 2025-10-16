export function initSection(userId) {
    console.log('Wallet section loaded for user:', userId);
    updateWalletBalance();
}

function updateWalletBalance() {
    const savedBalance = localStorage.getItem('nmxBalance') || '0';
    const walletBalance = document.getElementById('walletBalance');
    if (walletBalance) {
        walletBalance.textContent = `${savedBalance} NMXp`;
    }
}
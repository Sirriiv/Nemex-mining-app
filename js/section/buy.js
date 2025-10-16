export function initSection(userId) {
    console.log('Buy section loaded for user:', userId);
    setupBuyButtons();
}

function setupBuyButtons() {
    const buyButtons = document.querySelectorAll('.buy-btn');
    buyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const option = this.closest('.buy-option');
            const method = option.querySelector('h3').textContent;
            initiatePurchase(method);
        });
    });
}

function initiatePurchase(method) {
    alert(`🚀 Redirecting to ${method} payment gateway...\n\nThis feature will be available soon!`);
}
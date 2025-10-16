export function initSection(userId) {
    console.log('Referrals section loaded for user:', userId);
    updateReferralCode(userId);
}

function updateReferralCode(userId) {
    const referralCodeElement = document.querySelector('.referral-code');
    if (referralCodeElement) {
        referralCodeElement.textContent = `NMX-${userId.substring(0, 8).toUpperCase()}`;
    }
}
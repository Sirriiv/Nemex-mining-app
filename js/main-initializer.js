updateUserProfileUI() {
    // Update username, email, etc. in the UI
    const userData = window.UserDataManager.getUserData();
    const auth = window.AuthManager;
    
    if (userData && auth) {
        // Calculate days since member joined (for demo, use join date)
        const joinDate = auth.currentUser.joinDate ? new Date(auth.currentUser.joinDate) : new Date();
        const today = new Date();
        const daysMining = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Update profile section
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileUserId = document.getElementById('profileUserId');
        const profileMiningDays = document.getElementById('profileMiningDays');
        const profileMemberSince = document.getElementById('profileMemberSince');
        
        if (profileName) profileName.textContent = userData.username || auth.currentUser.name || 'User';
        if (profileEmail) profileEmail.textContent = userData.email || auth.currentUser.email || 'Not set';
        if (profileUserId) profileUserId.textContent = userData.id || auth.currentUser.id || 'Unknown';
        if (profileMiningDays) profileMiningDays.textContent = `${daysMining} day${daysMining !== 1 ? 's' : ''}`;
        if (profileMemberSince) {
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            profileMemberSince.textContent = joinDate.toLocaleDateString(undefined, options);
        }
        
        console.log('✅ Profile UI updated with user data');
    } else {
        console.warn('⚠️ No user data available for profile UI');
    }
}
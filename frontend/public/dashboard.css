// dashboard.js - Simple functionality for now
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard loaded successfully!');
    
    // Mining toggle functionality
    const miningToggle = document.getElementById('mining-toggle');
    if (miningToggle) {
        miningToggle.addEventListener('click', function() {
            if (this.textContent === 'Start Mining') {
                this.textContent = 'Stop Mining';
                document.getElementById('mining-progress').style.width = '100%';
            } else {
                this.textContent = 'Start Mining';
                document.getElementById('mining-progress').style.width = '65%';
            }
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.textContent = 'Refreshing...';
            setTimeout(() => {
                this.textContent = 'Refresh Data';
                alert('Data refreshed!');
            }, 1000);
        });
    }
});
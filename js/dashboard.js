import { Navigation } from './modules/navigation.js';
import { User } from './modules/user.js';
import { Api } from './modules/api.js';

class Dashboard {
    constructor() {
        this.navigation = new Navigation();
        this.user = new User();
        this.api = new Api();
        this.init();
    }

    init() {
        this.loadDashboardContent();
        this.setupEventListeners();
        this.startDataUpdates();
    }

    loadDashboardContent() {
        this.loadStatsCards();
        this.loadMiningStatus();
        this.loadRecentActivity();
        this.loadCharts();
    }

    loadStatsCards() {
        const container = document.getElementById('stats-cards');
        if (!container) return;

        container.innerHTML = `
            <div class="card">
                <h3>TOTAL NMXp EARNED</h3>
                <div class="value">0 NMXp</div>
                <div class="change positive">+0% today</div>
            </div>
            <div class="card">
                <h3>MINING POWER</h3>
                <div class="value">1.2 KH/s</div>
                <div class="change positive">+15% this week</div>
            </div>
            <div class="card">
                <h3>DAYS MINING</h3>
                <div class="value">1 day</div>
                <div class="change">Just started!</div>
            </div>
            <div class="card">
                <h3>REFERRALS</h3>
                <div class="value">0 users</div>
                <div class="change">Earn 10% bonus</div>
            </div>
        `;
    }

    loadMiningStatus() {
        const container = document.getElementById('mining-status');
        if (!container) return;

        container.innerHTML = `
            <h3>Mining Status</h3>
            <div class="progress-container">
                <div class="progress-label">
                    <span>Current Session</span>
                    <span>65%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress" id="mining-progress"></div>
                </div>
            </div>
            <div class="mining-controls">
                <button class="btn btn-primary" id="mining-toggle">Start Mining</button>
                <button class="btn btn-outline" id="boost-mining">Boost Mining</button>
                <button class="btn btn-outline" id="withdraw-btn">Withdraw</button>
            </div>
        `;
    }

    loadRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        container.innerHTML = `
            <h3>Recent Activity</h3>
            <ul class="activity-list">
                <li class="activity-item">
                    <div class="activity-icon">⛏️</div>
                    <div class="activity-details">
                        <div class="activity-title">Mining Started</div>
                        <div class="activity-time">Today, 10:30 AM</div>
                    </div>
                    <div class="activity-amount">+0.5 NMXp</div>
                </li>
                <li class="activity-item">
                    <div class="activity-icon">👤</div>
                    <div class="activity-details">
                        <div class="activity-title">Account Created</div>
                        <div class="activity-time">Today, 10:15 AM</div>
                    </div>
                    <div class="activity-amount">Welcome!</div>
                </li>
            </ul>
        `;
    }

    loadCharts() {
        const container = document.getElementById('charts-section');
        if (!container) return;

        container.innerHTML = `
            <div class="chart-container">
                <h3>Earnings Overview</h3>
                <div class="chart-placeholder">
                    Earnings Chart Will Appear Here
                </div>
            </div>
            <div class="chart-container">
                <h3>Mining Performance</h3>
                <div class="chart-placeholder">
                    Performance Chart Will Appear Here
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Mining toggle
        document.addEventListener('click', (e) => {
            if (e.target.id === 'mining-toggle') {
                this.toggleMining();
            }
            if (e.target.id === 'refresh-btn') {
                this.refreshData();
            }
        });
    }

    toggleMining() {
        const button = document.getElementById('mining-toggle');
        const progress = document.getElementById('mining-progress');
        
        if (button.textContent === 'Start Mining') {
            button.textContent = 'Stop Mining';
            button.classList.add('mining-active');
            progress.style.width = '100%';
            // Start mining simulation
            this.startMiningSimulation();
        } else {
            button.textContent = 'Start Mining';
            button.classList.remove('mining-active');
            progress.style.width = '65%';
            // Stop mining simulation
            this.stopMiningSimulation();
        }
    }

    startMiningSimulation() {
        // Simulate mining progress
        this.miningInterval = setInterval(() => {
            // Update mining stats
            console.log('Mining in progress...');
        }, 5000);
    }

    stopMiningSimulation() {
        if (this.miningInterval) {
            clearInterval(this.miningInterval);
        }
    }

    refreshData() {
        // Show loading state
        const button = document.getElementById('refresh-btn');
        const originalText = button.textContent;
        button.textContent = 'Refreshing...';
        button.disabled = true;

        // Simulate API call
        setTimeout(() => {
            this.loadDashboardContent();
            button.textContent = originalText;
            button.disabled = false;
            
            // Show success message
            this.showNotification('Data refreshed successfully!', 'success');
        }, 1500);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    startDataUpdates() {
        // Update data every 30 seconds
        setInterval(() => {
            if (document.getElementById('mining-toggle')?.textContent === 'Stop Mining') {
                this.updateMiningStats();
            }
        }, 30000);
    }

    updateMiningStats() {
        // Update mining statistics
        console.log('Updating mining stats...');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
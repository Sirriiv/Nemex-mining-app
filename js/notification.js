// Notifications functionality
class NotificationsManager {
    constructor() {
        this.settings = this.loadSettings();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    loadSettings() {
        const saved = localStorage.getItem('notificationSettings');
        return saved ? JSON.parse(saved) : {
            pushNotifications: true,
            emailNotifications: false,
            miningAlerts: true,
            taskReminders: false,
            referralAlerts: true,
            systemUpdates: false
        };
    }

    saveSettings() {
        localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    }

    setupEventListeners() {
        // Toggle switches
        document.getElementById('pushNotifications')?.addEventListener('change', (e) => {
            this.settings.pushNotifications = e.target.checked;
            this.saveSettings();
            this.showToast('Push notifications ' + (e.target.checked ? 'enabled' : 'disabled'));
        });

        document.getElementById('emailNotifications')?.addEventListener('change', (e) => {
            this.settings.emailNotifications = e.target.checked;
            this.saveSettings();
            this.showToast('Email notifications ' + (e.target.checked ? 'enabled' : 'disabled'));
        });

        document.getElementById('miningAlerts')?.addEventListener('change', (e) => {
            this.settings.miningAlerts = e.target.checked;
            this.saveSettings();
            this.showToast('Mining alerts ' + (e.target.checked ? 'enabled' : 'disabled'));
        });

        document.getElementById('taskReminders')?.addEventListener('change', (e) => {
            this.settings.taskReminders = e.target.checked;
            this.saveSettings();
            this.showToast('Task reminders ' + (e.target.checked ? 'enabled' : 'disabled'));
        });

        document.getElementById('referralAlerts')?.addEventListener('change', (e) => {
            this.settings.referralAlerts = e.target.checked;
            this.saveSettings();
            this.showToast('Referral alerts ' + (e.target.checked ? 'enabled' : 'disabled'));
        });

        document.getElementById('systemUpdates')?.addEventListener('change', (e) => {
            this.settings.systemUpdates = e.target.checked;
            this.saveSettings();
            this.showToast('System updates ' + (e.target.checked ? 'enabled' : 'disabled'));
        });

        // Test notification button
        document.getElementById('testNotification')?.addEventListener('click', () => {
            this.sendTestNotification();
        });
    }

    updateUI() {
        // Set toggle states based on saved settings
        for (const [key, value] of Object.entries(this.settings)) {
            const element = document.getElementById(key);
            if (element) {
                element.checked = value;
            }
        }
    }

    sendTestNotification() {
        if (this.settings.pushNotifications) {
            this.showTestNotification();
        } else {
            alert('🔕 Push notifications are disabled. Enable them to test notifications.');
        }
    }

    showTestNotification() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                this.createNotification('Test Notification', 'This is a test notification from NemexCoin!');
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.createNotification('Test Notification', 'This is a test notification from NemexCoin!');
                    }
                });
            }
        }
        
        // Fallback alert for browsers without Notification API
        this.showToast('🔔 Test notification sent! Check your browser notifications.');
    }

    createNotification(title, message) {
        const notification = new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        setTimeout(() => {
            notification.close();
        }, 5000);
    }

    showToast(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

        // Add toast styles if not already added
        if (!document.querySelector('#toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                .notification-toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: var(--darker-bg);
                    border: 1px solid var(--gold);
                    border-radius: 8px;
                    padding: 15px;
                    max-width: 300px;
                    z-index: 10000;
                    animation: slideInRight 0.3s ease-out;
                }
                .toast-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .toast-close {
                    background: none;
                    border: none;
                    color: var(--muted);
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);

        // Close on click
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    }

    // Method to send actual notifications from other parts of the app
    sendNotification(title, message, type = 'info') {
        if (this.settings.pushNotifications) {
            this.createNotification(title, message);
        }
        
        // Also show toast for immediate feedback
        this.showToast(`🔔 ${message}`);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationsManager = new NotificationsManager();
});
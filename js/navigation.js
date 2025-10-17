// Notifications Management
function initNotifications() {
    loadNotifications();
    setupNotificationSettings();
}

function loadNotifications() {
    const notifications = [
        {
            id: 1,
            type: 'reward',
            title: 'Daily Reward Available',
            message: 'Your 24-hour mining reward is ready to claim!',
            time: '2 hours ago',
            read: false,
            icon: '💰'
        },
        {
            id: 2,
            type: 'system',
            title: 'Welcome to NEMEXCOIN',
            message: 'Start mining NMXp tokens and grow your portfolio',
            time: '1 day ago',
            read: true,
            icon: '🎉'
        },
        {
            id: 3,
            type: 'update',
            title: 'App Update Available',
            message: 'New version 1.1.0 with improved performance',
            time: '2 days ago',
            read: true,
            icon: '🔄'
        }
    ];

    displayNotifications(notifications);
}

function displayNotifications(notifications) {
    const container = document.querySelector('.notifications-container');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔔</div>
                <h3>No Notifications</h3>
                <p>You're all caught up! New notifications will appear here.</p>
            </div>
        `;
        return;
    }

    const notificationsHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}">
            <div class="notification-icon">${notification.icon}</div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${notification.time}</div>
                <div class="notification-actions">
                    <button class="notification-action-btn" onclick="markAsRead(${notification.id})">
                        Mark Read
                    </button>
                    <button class="notification-action-btn" onclick="deleteNotification(${notification.id})">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = notificationsHTML;
}

function setupNotificationSettings() {
    // Load saved settings
    const settings = {
        pushEnabled: true,
        emailEnabled: false,
        soundEnabled: true,
        vibrationEnabled: true
    };

    // Set initial toggle states
    Object.keys(settings).forEach(setting => {
        const toggle = document.querySelector(`#${setting}`);
        if (toggle) {
            toggle.checked = settings[setting];
        }
    });

    // Add change listeners
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const setting = e.target.id;
            const value = e.target.checked;
            saveNotificationSetting(setting, value);
        });
    });
}

function saveNotificationSetting(setting, value) {
    // Save to localStorage or send to server
    console.log(`Setting ${setting} changed to: ${value}`);
    // Here you would typically save to localStorage or make an API call
}

function markAsRead(notificationId) {
    console.log(`Marking notification ${notificationId} as read`);
    // Update UI
    const notification = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (notification) {
        notification.classList.remove('unread');
    }
    // Here you would typically update via API
}

function deleteNotification(notificationId) {
    console.log(`Deleting notification ${notificationId}`);
    // Remove from UI
    const notification = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (notification) {
        notification.remove();
    }
    // Here you would typically delete via API
}

function clearAllNotifications() {
    if (confirm('Are you sure you want to clear all notifications?')) {
        const container = document.querySelector('.notifications-container');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔔</div>
                <h3>No Notifications</h3>
                <p>You're all caught up! New notifications will appear here.</p>
            </div>
        `;
        // Here you would typically clear via API
    }
}
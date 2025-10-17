// Utility Functions
class AppUtils {
    static showLoading(message = 'Loading...') {
        // Create or update loading overlay
        let loadingEl = document.getElementById('global-loading');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'global-loading';
            loadingEl.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
            `;
            document.body.appendChild(loadingEl);
        }
        
        loadingEl.innerHTML = `
            <div class="loading-spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #333;
                border-top: 4px solid var(--gold);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 15px;
            "></div>
            <div>${message}</div>
        `;
        
        loadingEl.style.display = 'flex';
    }

    static hideLoading() {
        const loadingEl = document.getElementById('global-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    static showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const backgroundColor = type === 'error' ? 'var(--error)' : 
                              type === 'success' ? 'var(--success)' : 
                              'var(--gold)';
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${backgroundColor};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideDown 0.3s ease;
            max-width: 300px;
            text-align: center;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatDateTime(date) {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static animateValue(element, start, end, duration) {
        const range = end - start;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (range * progress);
            element.textContent = Math.round(current).toString().padStart(2, '0');
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }

    static createConfetti() {
        // Simple confetti effect
        const colors = ['#d4af37', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                top: -10px;
                left: ${Math.random() * 100}%;
                border-radius: 2px;
                z-index: 10000;
                pointer-events: none;
            `;
            
            document.body.appendChild(confetti);
            
            // Animate
            const animation = confetti.animate([
                { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
                { transform: `translateY(${window.innerHeight}px) rotate(${360 + Math.random() * 360}deg)`, opacity: 0 }
            ], {
                duration: 1000 + Math.random() * 2000,
                easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
            });
            
            animation.onfinish = () => confetti.remove();
        }
    }

    static copyToClipboard(text) {
        return navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard!', 'success');
            return true;
        }).catch(err => {
            console.error('Failed to copy: ', err);
            this.showToast('Failed to copy', 'error');
            return false;
        });
    }

    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    static getScreenSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: this.isMobile()
        };
    }
}

// CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// Initialize utils
window.AppUtils = AppUtils;
// Navigation Management
let isLoading = false;

function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            if (isLoading) return;
            
            const target = this.getAttribute('data-section');
            const loading = document.getElementById('loading');
            
            // Disable navigation
            isLoading = true;
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.style.pointerEvents = 'none';
            });
            
            loading.classList.remove('hidden');
            
            setTimeout(() => {
                loadSection(target);
                
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                
                setTimeout(() => {
                    loading.classList.add('hidden');
                    // Re-enable navigation
                    isLoading = false;
                    document.querySelectorAll('.nav-item').forEach(nav => {
                        nav.style.pointerEvents = 'auto';
                    });
                }, 300);
            }, 1500);
        });
    });
}

async function loadSection(sectionName) {
    try {
        const response = await fetch(`sections/${sectionName}.html`);
        const html = await response.text();
        document.getElementById('content-area').innerHTML = html;
        
        // Re-attach event listeners for home section
        if (sectionName === 'home') {
            const claimButton = document.getElementById('claimButton');
            if (claimButton) {
                claimButton.addEventListener('click', claimReward);
            }
        }
    } catch (error) {
        console.error('Error loading section:', error);
        document.getElementById('content-area').innerHTML = `<div class="section active"><h2>Error</h2><p>Failed to load ${sectionName} section</p></div>`;
    }
}
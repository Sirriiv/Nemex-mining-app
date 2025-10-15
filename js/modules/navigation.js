// Navigation functionality
const Navigation = {
    isLoading: false,

    init() {
        this.setupNavigation();
        console.log('Navigation module initialized');
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                if (Navigation.isLoading) return;

                const target = this.getAttribute('data-section');
                const loading = document.getElementById('loading');

                // Disable navigation
                Navigation.isLoading = true;
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.style.pointerEvents = 'none';
                });

                loading.classList.remove('hidden');

                setTimeout(() => {
                    Navigation.loadSection(target);
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    this.classList.add('active');

                    setTimeout(() => {
                        loading.classList.add('hidden');
                        // Re-enable navigation
                        Navigation.isLoading = false;
                        document.querySelectorAll('.nav-item').forEach(nav => {
                            nav.style.pointerEvents = 'auto';
                        });
                    }, 300);
                }, 1500);
            });
        });
    },

    loadSection(sectionName) {
        fetch(`sections/${sectionName}.html`)
            .then(response => {
                if (!response.ok) throw new Error('Section not found');
                return response.text();
            })
            .then(html => {
                document.getElementById('content').innerHTML = html;
                
                // Re-attach event listeners for home section
                if (sectionName === 'home') {
                    const claimButton = document.getElementById('claimButton');
                    if (claimButton) {
                        claimButton.addEventListener('click', User.claimReward);
                    }
                }
            })
            .catch(error => {
                console.error('Error loading section:', error);
                document.getElementById('content').innerHTML = '<div class="section active"><h2>Error</h2><p>Failed to load section</p></div>';
            });
    }
};
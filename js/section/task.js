export function initSection(userId) {
    console.log('Tasks section loaded for user:', userId);
    setupTaskButtons();
}

function setupTaskButtons() {
    const taskButtons = document.querySelectorAll('.claim-task-btn');
    taskButtons.forEach(button => {
        button.addEventListener('click', function() {
            const taskItem = this.closest('.task-item');
            const taskName = taskItem.querySelector('h3').textContent;
            claimTask(taskName, this);
        });
    });
}

function claimTask(taskName, button) {
    button.disabled = true;
    button.textContent = 'Claiming...';
    
    // Simulate API call
    setTimeout(() => {
        button.textContent = 'Claimed!';
        button.style.background = '#27ae60';
        alert(`✅ ${taskName} completed! Reward added to your balance.`);
    }, 1500);
}
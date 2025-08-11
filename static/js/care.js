let aiTimer;
let startTime;
let isProcessing = false;
let shouldStop = false;

async function coordinateCare(taskId) {
    if (isProcessing) {
        alert('Process already running. Use stop button to cancel.');
        return;
    }
    
    const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
    const patientName = taskCard.querySelector('h3').textContent;
    const taskType = taskCard.querySelector('p').textContent.split(': ')[1];
    
    isProcessing = true;
    shouldStop = false;
    
    // Update UI to show coordination in progress
    showAIProgress(`${patientName} - ${taskType}`, 'coordination');
    updateTaskStatus(taskCard, 'processing');
    
    try {
        const response = await fetch('/api/coordinate-care', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task_id: taskId })
        });
        
        const data = await response.json();
        
        // Simulate real-time coordination progress
        await simulateAIProgress(data.coordination_steps);
        
        if (!shouldStop) {
            // Show results
            showAIResults(data, 'coordination');
            updateTaskStatus(taskCard, 'completed');
        } else {
            // Process was stopped, don't show results
            return;
        }
        
    } catch (error) {
        console.error('Error coordinating care:', error);
        alert('Error occurred during coordination. Please try again.');
        hideAIProgress();
        updateTaskStatus(taskCard, 'stopped');
    }
    
    isProcessing = false;
}

function showAIProgress(taskName, taskType = 'coordination') {
    document.getElementById('ai-status').classList.add('hidden');
    document.getElementById('ai-results').classList.add('hidden');
    document.getElementById('ai-progress').classList.remove('hidden');
    
    document.querySelector('#current-task span').textContent = taskName;
    document.getElementById('monitor-title').textContent = `👥 Live Care Coordination Monitor - Processing`;
    
    // Start timer
    startTime = Date.now();
    aiTimer = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function simulateAIProgress(steps) {
    const progressContainer = document.getElementById('progress-steps');
    progressContainer.innerHTML = '';
    
    for (let i = 0; i < steps.length; i++) {
        if (shouldStop) {
            // Mark remaining steps as cancelled
            for (let j = i; j < steps.length; j++) {
                const cancelledStep = createProgressStep(steps[j].step, j);
                cancelledStep.classList.add('cancelled');
                cancelledStep.querySelector('.step-icon').textContent = '❌';
                progressContainer.appendChild(cancelledStep);
            }
            throw new Error('Process stopped by user');
        }
        
        const step = steps[i];
        const stepElement = createProgressStep(step.step, i);
        progressContainer.appendChild(stepElement);
        
        // Animate step activation
        await new Promise(resolve => setTimeout(resolve, 500));
        if (shouldStop) throw new Error('Process stopped by user');
        
        stepElement.classList.add('active');
        
        // Simulate processing time
        const processingTime = Math.random() * 2000 + 1000; // 1-3 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));
        if (shouldStop) throw new Error('Process stopped by user');
        
        stepElement.classList.remove('active');
        stepElement.classList.add('completed');
        stepElement.querySelector('.step-icon').textContent = '✅';
    }
}

function createProgressStep(stepText, index) {
    const stepElement = document.createElement('div');
    stepElement.className = 'progress-step';
    
    const coordinationIcons = ['🔍', '📝', '📞', '💬', '📋', '📅', '✅'];
    
    stepElement.innerHTML = `
        <span class="step-icon">${coordinationIcons[index] || '⏳'}</span>
        <span>${stepText}</span>
    `;
    
    return stepElement;
}

function showAIResults(data, resultType = 'coordination') {
    clearInterval(aiTimer);
    
    document.getElementById('ai-progress').classList.add('hidden');
    document.getElementById('ai-results').classList.remove('hidden');
    
    const cr = data.coordination_result;
    const isPhone = cr.contact_method === 'phone';
    
    document.getElementById('results-title').textContent = isPhone ? '✅ Coordination Complete' : '✅ Coordination Initiated';
    
    const resultsContent = document.getElementById('results-content');
    
    let resultHTML = `
        <div class="result-grid">
            <div class="result-item">
                <div class="result-label">Patient</div>
                <div class="result-value">${cr.patient_name}</div>
            </div>
            <div class="result-item">
                <div class="result-label">Task Type</div>
                <div class="result-value">${cr.task_type}</div>
            </div>
            <div class="result-item">
                <div class="result-label">Contact Method</div>
                <div class="result-value">
                    ${cr.contact_method === 'phone' ? '📞 Phone' : 
                      cr.contact_method === 'email' ? '📧 Email' : '📮 Mail'}
                </div>
            </div>
            <div class="result-item">
                <div class="result-label">${isPhone ? 'Contact Success' : 'Delivery Status'}</div>
                <div class="result-value">${cr.contact_successful ? '✅ Successful' : '❌ Failed'}</div>
            </div>
            <div class="result-item">
                <div class="result-label">Action Completed</div>
                <div class="result-value">${cr.action_completed}</div>
            </div>
            <div class="result-item">
                <div class="result-label">Next Step</div>
                <div class="result-value">${cr.next_step}</div>
            </div>`;
    
    if (cr.expected_response) {
        resultHTML += `
            <div class="result-item">
                <div class="result-label">Expected Response</div>
                <div class="result-value">${cr.expected_response}</div>
            </div>`;
    }
    
    resultHTML += `
            <div class="result-item">
                <div class="result-label">Processing Time</div>
                <div class="result-value">${cr.processing_time}</div>
            </div>
            <div class="result-item">
                <div class="result-label">AI Confidence</div>
                <div class="result-value">${cr.confidence_score}%</div>
            </div>
        </div>`;
    
    if (isPhone && cr.patient_satisfaction) {
        resultHTML += `
            <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px;">
                <strong>👥 Care Impact:</strong> Patient satisfaction: ${cr.patient_satisfaction}. 
                Manual coordination typically takes 20-30 minutes per task.
            </div>`;
    } else {
        const method = cr.contact_method === 'email' ? 'Email' : 'Mail';
        resultHTML += `
            <div style="margin-top: 15px; padding: 10px; background: #f0f9ff; border-radius: 6px; border: 1px solid #0ea5e9;">
                <strong>📋 ${method} Coordination:</strong> ${cr.action_completed}. 
                Patient will be contacted and response tracked automatically.
            </div>`;
    }
    
    resultsContent.innerHTML = resultHTML;
}

function updateTaskStatus(taskCard, status) {
    const statusBadge = taskCard.querySelector('.status-badge');
    const coordinateBtn = taskCard.querySelector('.btn-coordinate');
    
    statusBadge.className = 'status-badge';
    
    switch(status) {
        case 'processing':
            statusBadge.classList.add('status-processing');
            statusBadge.textContent = '🔄 AI Processing...';
            coordinateBtn.disabled = true;
            coordinateBtn.textContent = '🤖 In Progress...';
            break;
        case 'completed':
            statusBadge.classList.add('status-resolved');
            statusBadge.textContent = '✅ Completed';
            coordinateBtn.style.display = 'none';
            break;
        case 'stopped':
            statusBadge.classList.add('status-pending');
            statusBadge.textContent = 'Pending';
            coordinateBtn.disabled = false;
            coordinateBtn.textContent = '🎯 AI Coordinate Now';
            break;
    }
}

function closeResults() {
    document.getElementById('ai-results').classList.add('hidden');
    document.getElementById('ai-status').classList.remove('hidden');
    document.getElementById('monitor-title').textContent = '👥 Live Care Coordination Monitor';
}

function hideAIProgress() {
    clearInterval(aiTimer);
    document.getElementById('ai-progress').classList.add('hidden');
    document.getElementById('ai-status').classList.remove('hidden');
    document.getElementById('monitor-title').textContent = '👥 Live Care Coordination Monitor';
    isProcessing = false;
    shouldStop = false;
}

function stopProcess() {
    shouldStop = true;
    
    // Immediately clear any pending timeouts/intervals
    clearInterval(aiTimer);
    
    // Reset any processing states
    document.querySelectorAll('.status-processing').forEach(badge => {
        const card = badge.closest('.care-card');
        if (card) {
            updateTaskStatus(card, 'stopped');
        }
    });
    
    // Force hide progress and show inactive state
    document.getElementById('ai-progress').classList.add('hidden');
    document.getElementById('ai-results').classList.add('hidden');
    document.getElementById('ai-status').classList.remove('hidden');
    document.getElementById('monitor-title').textContent = '👥 Live Care Coordination Monitor';
    
    // Reset state after a brief delay to ensure all async operations complete
    setTimeout(() => {
        isProcessing = false;
        shouldStop = false;
    }, 100);
    
    // Stop API call (in real implementation)
    fetch('/api/stop-process', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
    }).catch(console.error);
}

// Filtering functionality
function filterTasks() {
    const priorityFilter = document.getElementById('priority-filter').value;
    const typeFilter = document.getElementById('type-filter').value;
    const contactFilter = document.getElementById('contact-filter').value;
    
    const tasks = document.querySelectorAll('.care-card');
    let visibleCount = 0;
    
    tasks.forEach(task => {
        const priority = task.dataset.priority;
        const type = task.dataset.type;
        const contact = task.dataset.contact;
        
        const priorityMatch = priorityFilter === 'all' || priority === priorityFilter;
        const typeMatch = typeFilter === 'all' || type === typeFilter;
        const contactMatch = contactFilter === 'all' || contact === contactFilter;
        
        if (priorityMatch && typeMatch && contactMatch) {
            task.style.display = 'flex';
            visibleCount++;
        } else {
            task.style.display = 'none';
        }
    });
    
    document.getElementById('task-count').textContent = `${visibleCount} tasks pending`;
}

// Coordinate all tasks functionality
document.getElementById('coordinate-all-btn').addEventListener('click', async function() {
    const visiblePendingTasks = Array.from(document.querySelectorAll('.care-card'))
        .filter(card => card.style.display !== 'none' && card.querySelector('.status-pending'));
    
    if (visiblePendingTasks.length === 0) {
        alert('No visible tasks pending coordination!');
        return;
    }
    
    if (isProcessing) {
        alert('Process already running. Use stop button to cancel.');
        return;
    }
    
    isProcessing = true;
    this.disabled = true;
    this.textContent = '🤖 Processing All...';
    
    for (let i = 0; i < visiblePendingTasks.length; i++) {
        if (shouldStop) break;
        
        const taskCard = visiblePendingTasks[i];
        const taskId = parseInt(taskCard.dataset.taskId);
        
        await coordinateCare(taskId);
        
        // Wait a bit before next task
        if (i < visiblePendingTasks.length - 1 && !shouldStop) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    this.disabled = false;
    this.textContent = shouldStop ? '🚫 Stopped' : '✅ All Coordinated';
    isProcessing = false;
});

// Initialize filters on page load
document.addEventListener('DOMContentLoaded', function() {
    filterTasks(); // Initialize count
});
let aiTimer;
let startTime;
let currentTab = 'verification';
let isProcessing = false;
let shouldStop = false;

async function verifyInsurance(patientId, bypassCheck = false) {
    if (isProcessing && !bypassCheck) {
        alert('Process already running. Use stop button to cancel.');
        return;
    }
    
    const patientCard = document.querySelector(`[data-patient-id="${patientId}"]`);
    const patientName = patientCard.querySelector('h3').textContent;
    
    isProcessing = true;
    shouldStop = false;
    
    // Update UI to show call in progress
    showAIProgress(patientName, 'verification');
    updatePatientStatus(patientCard, 'calling');
    
    try {
        const response = await fetch('/api/verify-insurance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ patient_id: patientId })
        });
        
        const data = await response.json();
        
        // Simulate real-time call progress
        await simulateAIProgress(data.call_steps);
        
        if (!shouldStop) {
            // Show results
            showAIResults(data, 'verification');
            const vr = data.verification_result;
            updatePatientStatus(patientCard, vr.verification_status === 'success' ? 'verified' : 'failed');
        } else {
            // Process was stopped, don't show results
            return;
        }
        
    } catch (error) {
        if (error.message === 'Process stopped by user') {
            updatePatientStatus(patientCard, 'stopped');
        } else {
            console.error('Error verifying insurance:', error);
            alert('Error occurred during verification. Please try again.');
            updatePatientStatus(patientCard, 'stopped');
        }
        hideAIProgress();
    }
    
    isProcessing = false;
}

async function followUpClaim(claimId, bypassCheck = false) {
    if (isProcessing && !bypassCheck) {
        alert('Process already running. Use stop button to cancel.');
        return;
    }
    
    const claimCard = document.querySelector(`[data-claim-id="${claimId}"]`);
    const patientName = claimCard.querySelector('h3').textContent;
    const claimNumber = claimCard.querySelector('p').textContent.split(': ')[1];
    
    isProcessing = true;
    shouldStop = false;
    
    // Update UI to show follow-up in progress
    showAIProgress(`${patientName} - ${claimNumber}`, 'followup');
    updateClaimStatus(claimCard, 'processing');
    
    try {
        const response = await fetch('/api/follow-up-claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ claim_id: claimId })
        });
        
        const data = await response.json();
        
        // Simulate real-time follow-up progress
        await simulateAIProgress(data.followup_steps);
        
        if (!shouldStop) {
            // Show results
            showAIResults(data, 'followup');
            updateClaimStatus(claimCard, 'resolved');
        } else {
            // Process was stopped, don't show results
            return;
        }
        
    } catch (error) {
        if (error.message === 'Process stopped by user') {
            updateClaimStatus(claimCard, 'stopped');
        } else {
            console.error('Error following up claim:', error);
            alert('Error occurred during follow-up. Please try again.');
            updateClaimStatus(claimCard, 'stopped');
        }
        hideAIProgress();
    }
    
    isProcessing = false;
}

function showAIProgress(taskName, taskType = 'verification') {
    document.getElementById('ai-status').classList.add('hidden');
    document.getElementById('ai-results').classList.add('hidden');
    document.getElementById('ai-progress').classList.remove('hidden');
    
    const title = taskType === 'verification' ? 'Verifying' : 'Following up';
    document.querySelector('#current-task span').textContent = taskName;
    document.getElementById('monitor-title').textContent = `📞 Live AI Monitor - ${title}`;
    
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
    
    const verificationIcons = ['📞', '🤖', '🔄', '👥', '🔍', '📋', '✅'];
    const followupIcons = ['🔐', '🔑', '🔍', '📊', '📄', '📤', '✅'];
    
    const icons = stepText.includes('portal') || stepText.includes('claim') ? followupIcons : verificationIcons;
    
    stepElement.innerHTML = `
        <span class="step-icon">${icons[index] || '⏳'}</span>
        <span>${stepText}</span>
    `;
    
    return stepElement;
}

function showAIResults(result, resultType = 'verification') {
    clearInterval(aiTimer);
    
    document.getElementById('ai-progress').classList.add('hidden');
    document.getElementById('ai-results').classList.remove('hidden');
    
    const title = resultType === 'verification' ? '✅ Verification Complete' : '✅ Follow-up Complete';
    document.getElementById('results-title').textContent = title;
    
    const resultsContent = document.getElementById('results-content');
    
    if (result.verification_result) {
        // Verification results
        const vr = result.verification_result;
        
        if (vr.verification_status === 'success') {
            resultsContent.innerHTML = `
                <div class="result-grid">
                    <div class="result-item">
                        <div class="result-label">Patient</div>
                        <div class="result-value">${vr.patient_name}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Insurance Status</div>
                        <div class="result-value">${vr.insurance_active ? '✅ Active' : '❌ Inactive'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Coverage Type</div>
                        <div class="result-value">${vr.coverage_type}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Copay</div>
                        <div class="result-value">${vr.copay}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Deductible Remaining</div>
                        <div class="result-value">${vr.deductible_remaining}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Prior Auth Required</div>
                        <div class="result-value">${vr.prior_auth_required ? '⚠️ Yes' : '✅ No'}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Call Duration</div>
                        <div class="result-value">${vr.call_duration}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">AI Confidence</div>
                        <div class="result-value">${vr.confidence_score}%</div>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px;">
                    <strong>💡 Time Saved:</strong> Typical manual verification takes 15-20 minutes. 
                    AI completed this in ${vr.call_duration} with ${vr.confidence_score}% accuracy.
                </div>
            `;
        } else {
            // Failed verification
            resultsContent.innerHTML = `
                <div class="result-grid">
                    <div class="result-item">
                        <div class="result-label">Patient</div>
                        <div class="result-value">${vr.patient_name}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Verification Status</div>
                        <div class="result-value">❌ Failed</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Failure Reason</div>
                        <div class="result-value">${vr.failure_reason}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Recommended Action</div>
                        <div class="result-value">${vr.recommended_action}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">Call Duration</div>
                        <div class="result-value">${vr.call_duration}</div>
                    </div>
                    <div class="result-item">
                        <div class="result-label">AI Confidence</div>
                        <div class="result-value">${vr.confidence_score}%</div>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 10px; background: #fee2e2; border-radius: 6px; border: 1px solid #dc2626;">
                    <strong>⚠️ Action Required:</strong> ${vr.recommended_action}
                </div>
            `;
        }
    } else if (result.followup_result) {
        // Claims follow-up results
        const fr = result.followup_result;
        resultsContent.innerHTML = `
            <div class="result-grid">
                <div class="result-item">
                    <div class="result-label">Claim Number</div>
                    <div class="result-value">${fr.claim_number}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Patient</div>
                    <div class="result-value">${fr.patient_name}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Previous Status</div>
                    <div class="result-value">${fr.original_status}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">New Status</div>
                    <div class="result-value">${fr.new_status}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Action Taken</div>
                    <div class="result-value">${fr.action_taken}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Expected Resolution</div>
                    <div class="result-value">${fr.expected_resolution}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">Processing Time</div>
                    <div class="result-value">${fr.processing_time}</div>
                </div>
                <div class="result-item">
                    <div class="result-label">AI Confidence</div>
                    <div class="result-value">${fr.confidence_score}%</div>
                </div>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: white; border-radius: 6px;">
                <strong>💰 Revenue Impact:</strong> Recovered ${fr.recovery_amount} in ${fr.processing_time}. 
                Manual follow-up typically takes 30-45 minutes per claim.
            </div>
        `;
    }
}

function updatePatientStatus(patientCard, status) {
    const statusBadge = patientCard.querySelector('.status-badge');
    const verifyBtn = patientCard.querySelector('.btn-verify');
    
    statusBadge.className = 'status-badge';
    
    switch(status) {
        case 'calling':
            statusBadge.classList.add('status-calling');
            statusBadge.textContent = '📞 AI Calling...';
            verifyBtn.disabled = true;
            verifyBtn.textContent = '🤖 In Progress...';
            break;
        case 'verified':
            statusBadge.classList.add('status-verified');
            statusBadge.textContent = '✅ Verified';
            verifyBtn.style.display = 'none';
            break;
        case 'failed':
            statusBadge.classList.add('status-denied');
            statusBadge.textContent = '❌ Failed';
            verifyBtn.style.display = 'none';
            break;
        case 'stopped':
            statusBadge.classList.add('status-pending');
            statusBadge.textContent = 'Pending Verification';
            verifyBtn.disabled = false;
            verifyBtn.textContent = '🎯 AI Verify Now';
            break;
    }
}

function updateClaimStatus(claimCard, status) {
    const statusBadge = claimCard.querySelector('.status-badge');
    const followupBtn = claimCard.querySelector('.btn-followup');
    
    statusBadge.className = 'status-badge';
    
    switch(status) {
        case 'processing':
            statusBadge.classList.add('status-processing');
            statusBadge.textContent = '🔄 AI Processing...';
            followupBtn.disabled = true;
            followupBtn.textContent = '🤖 In Progress...';
            break;
        case 'resolved':
            statusBadge.classList.add('status-resolved');
            statusBadge.textContent = '✅ Resolved';
            followupBtn.style.display = 'none';
            break;
        case 'stopped':
            const originalStatus = claimCard.dataset.status;
            statusBadge.classList.add(`status-${originalStatus}`);
            statusBadge.textContent = originalStatus.charAt(0).toUpperCase() + originalStatus.slice(1);
            followupBtn.disabled = false;
            followupBtn.textContent = '🔄 AI Follow-up Now';
            break;
    }
}

function closeResults() {
    document.getElementById('ai-results').classList.add('hidden');
    document.getElementById('ai-status').classList.remove('hidden');
    document.getElementById('monitor-title').textContent = '📞 Live AI Monitor';
}

function hideAIProgress() {
    clearInterval(aiTimer);
    document.getElementById('ai-progress').classList.add('hidden');
    document.getElementById('ai-status').classList.remove('hidden');
    document.getElementById('monitor-title').textContent = '📞 Live AI Monitor';
    isProcessing = false;
    shouldStop = false;
}

function stopProcess() {
    shouldStop = true;
    
    // Immediately clear any pending timeouts/intervals
    clearInterval(aiTimer);
    
    // Reset any processing states
    document.querySelectorAll('.status-calling, .status-processing').forEach(badge => {
        const card = badge.closest('.patient-card, .claim-card, .care-card');
        if (card?.classList.contains('patient-card')) {
            updatePatientStatus(card, 'stopped');
        } else if (card?.classList.contains('claim-card')) {
            updateClaimStatus(card, 'stopped');
        }
    });
    
    // Force hide progress and show inactive state
    document.getElementById('ai-progress').classList.add('hidden');
    document.getElementById('ai-results').classList.add('hidden');
    document.getElementById('ai-status').classList.remove('hidden');
    document.getElementById('monitor-title').textContent = '📞 Live AI Monitor';
    
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

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
    
    // Reset AI monitor
    closeResults();
}

// Verify all patients functionality (only visible/filtered patients)
document.getElementById('verify-all-btn')?.addEventListener('click', async function() {
    const visiblePendingPatients = Array.from(document.querySelectorAll('.patient-card'))
        .filter(card => card.style.display !== 'none' && card.querySelector('.status-pending'));
    
    if (visiblePendingPatients.length === 0) {
        alert('No visible patients pending verification!');
        return;
    }
    
    if (isProcessing) {
        alert('Process already running. Use stop button to cancel.');
        return;
    }
    
    isProcessing = true;
    this.disabled = true;
    this.textContent = '🤖 Processing All...';
    
    for (let i = 0; i < visiblePendingPatients.length; i++) {
        if (shouldStop) break;
        
        const patientCard = visiblePendingPatients[i];
        const patientId = parseInt(patientCard.dataset.patientId);
        
        await verifyInsurance(patientId, true);
        
        // Wait a bit before next call
        if (i < visiblePendingPatients.length - 1 && !shouldStop) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    this.disabled = false;
    this.textContent = shouldStop ? '🚫 Stopped' : '✅ All Verified';
    isProcessing = false;
});

// Follow-up all claims functionality (only visible/filtered claims)
document.getElementById('followup-all-btn')?.addEventListener('click', async function() {
    const visiblePendingClaims = Array.from(document.querySelectorAll('.claim-card'))
        .filter(card => card.style.display !== 'none' && 
                (card.querySelector('.status-denied') || card.querySelector('.status-pending')));
    
    if (visiblePendingClaims.length === 0) {
        alert('No visible claims need follow-up!');
        return;
    }
    
    if (isProcessing) {
        alert('Process already running. Use stop button to cancel.');
        return;
    }
    
    isProcessing = true;
    this.disabled = true;
    this.textContent = '🤖 Processing All...';
    
    for (let i = 0; i < visiblePendingClaims.length; i++) {
        if (shouldStop) break;
        
        const claimCard = visiblePendingClaims[i];
        const claimId = parseInt(claimCard.dataset.claimId);
        
        await followUpClaim(claimId, true);
        
        // Wait a bit before next follow-up
        if (i < visiblePendingClaims.length - 1 && !shouldStop) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    this.disabled = false;
    this.textContent = shouldStop ? '🚫 Stopped' : '✅ All Resolved';
    isProcessing = false;
});

// Patient filtering and sorting
function filterPatients() {
    const searchTerm = document.getElementById('patient-search')?.value.toLowerCase() || '';
    const insuranceFilter = document.getElementById('insurance-filter')?.value || 'all';
    
    const patients = document.querySelectorAll('.patient-card');
    let visibleCount = 0;
    
    patients.forEach(patient => {
        const name = patient.dataset.name.toLowerCase();
        const insurance = patient.dataset.insurance;
        
        const searchMatch = name.includes(searchTerm);
        const insuranceMatch = insuranceFilter === 'all' || insurance === insuranceFilter;
        
        if (searchMatch && insuranceMatch) {
            patient.style.display = 'flex';
            visibleCount++;
        } else {
            patient.style.display = 'none';
        }
    });
    
    const countElement = document.getElementById('patient-count');
    if (countElement) {
        countElement.textContent = `${visibleCount} patients pending verification`;
    }
}

function sortPatients() {
    const sortBy = document.getElementById('patient-sort')?.value || 'name';
    const container = document.getElementById('patient-list');
    if (!container) return;
    
    const patients = Array.from(container.querySelectorAll('.patient-card'));
    
    patients.sort((a, b) => {
        let aValue, bValue;
        
        switch(sortBy) {
            case 'name':
                aValue = a.dataset.name;
                bValue = b.dataset.name;
                break;
            case 'insurance':
                aValue = a.dataset.insurance;
                bValue = b.dataset.insurance;
                break;
            case 'dob':
                aValue = new Date(a.dataset.dob);
                bValue = new Date(b.dataset.dob);
                break;
            default:
                return 0;
        }
        
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
    });
    
    patients.forEach(patient => container.appendChild(patient));
}

// Claims filtering and sorting
function filterClaims() {
    const searchTerm = document.getElementById('claim-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('status-filter')?.value || 'all';
    const amountFilter = document.getElementById('amount-filter')?.value || 'all';
    
    const claims = document.querySelectorAll('.claim-card');
    let visibleCount = 0;
    
    claims.forEach(claim => {
        const patient = claim.dataset.patient.toLowerCase();
        const status = claim.dataset.status;
        const amount = parseFloat(claim.dataset.amount.replace('$', '').replace(',', ''));
        
        const searchMatch = patient.includes(searchTerm);
        const statusMatch = statusFilter === 'all' || status === statusFilter;
        
        let amountMatch = true;
        if (amountFilter === 'low') amountMatch = amount < 200;
        else if (amountFilter === 'medium') amountMatch = amount >= 200 && amount <= 500;
        else if (amountFilter === 'high') amountMatch = amount > 500;
        
        if (searchMatch && statusMatch && amountMatch) {
            claim.style.display = 'flex';
            visibleCount++;
        } else {
            claim.style.display = 'none';
        }
    });
    
    const countElement = document.getElementById('claim-count');
    if (countElement) {
        countElement.textContent = `${visibleCount} claims need follow-up`;
    }
}

function sortClaims() {
    const sortBy = document.getElementById('claim-sort')?.value || 'patient';
    const container = document.getElementById('claims-list');
    if (!container) return;
    
    const claims = Array.from(container.querySelectorAll('.claim-card'));
    
    claims.sort((a, b) => {
        let aValue, bValue;
        
        switch(sortBy) {
            case 'patient':
                aValue = a.dataset.patient;
                bValue = b.dataset.patient;
                break;
            case 'amount':
                aValue = parseFloat(a.dataset.amount.replace('$', '').replace(',', ''));
                bValue = parseFloat(b.dataset.amount.replace('$', '').replace(',', ''));
                return bValue - aValue; // Descending order for amounts
            case 'days':
                aValue = parseInt(a.dataset.days);
                bValue = parseInt(b.dataset.days);
                return bValue - aValue; // Descending order for days
            case 'date':
                aValue = new Date(a.dataset.date);
                bValue = new Date(b.dataset.date);
                break;
            default:
                return 0;
        }
        
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
    });
    
    claims.forEach(claim => container.appendChild(claim));
}

// Add some demo interactivity
document.addEventListener('DOMContentLoaded', function() {
    // Initialize filters if on insurance page
    if (document.getElementById('patient-search')) {
        filterPatients();
    }
    if (document.getElementById('claim-search')) {
        filterClaims();
    }
    
    // Simulate live stats updates
    setInterval(() => {
        const timeSavedElement = document.querySelector('.stat-number');
        if (timeSavedElement && timeSavedElement.textContent === '25%') {
            // Randomly fluctuate the time saved percentage slightly
            const variation = Math.random() * 2 - 1; // -1 to +1
            const newValue = Math.max(20, Math.min(30, 25 + variation));
            timeSavedElement.textContent = Math.round(newValue) + '%';
        }
    }, 5000);
});
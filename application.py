from flask import Flask, render_template, request, jsonify
import json
import time
import random
import os
from datetime import datetime

app = Flask(__name__)

# Mock patient data for demo
MOCK_PATIENTS = [
    {"id": 1, "name": "Sarah Johnson", "dob": "1985-03-15", "insurance": "Blue Cross Blue Shield", "policy_number": "BC123456789", "status": "pending_verification", "phone": "(555) 123-4567"},
    {"id": 2, "name": "Michael Chen", "dob": "1978-11-22", "insurance": "Aetna", "policy_number": "AET987654321", "status": "pending_verification", "phone": "(555) 987-6543"},
    {"id": 3, "name": "Emily Rodriguez", "dob": "1992-07-08", "insurance": "UnitedHealthcare", "policy_number": "UHC456789123", "status": "pending_verification", "phone": "(555) 456-7890"},
    {"id": 4, "name": "David Kim", "dob": "1990-12-03", "insurance": "Cigna", "policy_number": "CIG789012345", "status": "pending_verification", "phone": "(555) 234-5678"},
    {"id": 5, "name": "Lisa Thompson", "dob": "1987-05-20", "insurance": "Humana", "policy_number": "HUM345678901", "status": "pending_verification", "phone": "(555) 345-6789"},
    {"id": 6, "name": "Robert Wilson", "dob": "1975-09-14", "insurance": "Kaiser Permanente", "policy_number": "KP567890123", "status": "pending_verification", "phone": "(555) 456-7890"},
    {"id": 7, "name": "Maria Garcia", "dob": "1993-01-28", "insurance": "Blue Cross Blue Shield", "policy_number": "BC678901234", "status": "pending_verification", "phone": "(555) 567-8901"},
    {"id": 8, "name": "James Anderson", "dob": "1982-08-11", "insurance": "Aetna", "policy_number": "AET890123456", "status": "pending_verification", "phone": "(555) 678-9012"}
]

# Mock claims data for follow-up (different patients from verification)
MOCK_CLAIMS = [
    {"id": 101, "patient_name": "Amanda Foster", "claim_number": "CLM2024001", "service_date": "2024-01-15", "amount": "$450.00", "status": "denied", "days_pending": 12, "reason": "Missing prior authorization"},
    {"id": 102, "patient_name": "Brian Martinez", "claim_number": "CLM2024002", "service_date": "2024-01-18", "amount": "$275.50", "status": "pending", "days_pending": 8, "reason": "Under review"},
    {"id": 103, "patient_name": "Catherine Lee", "claim_number": "CLM2024003", "service_date": "2024-01-20", "amount": "$125.00", "status": "denied", "days_pending": 15, "reason": "Duplicate claim"},
    {"id": 104, "patient_name": "Daniel Park", "claim_number": "CLM2024004", "service_date": "2024-01-22", "amount": "$680.75", "status": "pending", "days_pending": 6, "reason": "Additional documentation requested"},
    {"id": 105, "patient_name": "Elena Vasquez", "claim_number": "CLM2024005", "service_date": "2024-01-25", "amount": "$320.25", "status": "denied", "days_pending": 18, "reason": "Service not covered"},
    {"id": 106, "patient_name": "Frank O'Connor", "claim_number": "CLM2024006", "service_date": "2024-01-28", "amount": "$195.00", "status": "pending", "days_pending": 4, "reason": "Processing delay"},
    {"id": 107, "patient_name": "Grace Liu", "claim_number": "CLM2024007", "service_date": "2024-02-01", "amount": "$540.00", "status": "denied", "days_pending": 22, "reason": "Incorrect billing code"},
    {"id": 108, "patient_name": "Henry Jackson", "claim_number": "CLM2024008", "service_date": "2024-02-03", "amount": "$385.50", "status": "pending", "days_pending": 10, "reason": "Awaiting provider response"}
]

# Mock care coordination data
MOCK_CARE_TASKS = [
    {"id": 201, "patient_name": "Jennifer Walsh", "task_type": "Follow-up Appointment", "priority": "high", "due_date": "2024-02-15", "status": "pending", "contact_method": "phone", "phone": "(555) 111-2222", "email": "j.walsh@email.com", "address": "123 Oak St, Boston, MA", "notes": "Post-surgery follow-up required"},
    {"id": 202, "patient_name": "Thomas Brown", "task_type": "Lab Results Review", "priority": "medium", "due_date": "2024-02-16", "status": "pending", "contact_method": "email", "phone": "(555) 222-3333", "email": "t.brown@email.com", "address": "456 Pine Ave, Cambridge, MA", "notes": "Discuss cholesterol levels"},
    {"id": 203, "patient_name": "Angela Martinez", "task_type": "Medication Refill", "priority": "high", "due_date": "2024-02-14", "status": "pending", "contact_method": "phone", "phone": "(555) 333-4444", "email": "a.martinez@email.com", "address": "789 Elm Dr, Somerville, MA", "notes": "Diabetes medication running low"},
    {"id": 204, "patient_name": "Kevin Lee", "task_type": "Specialist Referral", "priority": "medium", "due_date": "2024-02-17", "status": "pending", "contact_method": "mail", "phone": "(555) 444-5555", "email": "k.lee@email.com", "address": "321 Maple Ln, Newton, MA", "notes": "Cardiology referral needed"},
    {"id": 205, "patient_name": "Rachel Green", "task_type": "Appointment Reminder", "priority": "low", "due_date": "2024-02-18", "status": "pending", "contact_method": "email", "phone": "(555) 555-6666", "email": "r.green@email.com", "address": "654 Cedar St, Brookline, MA", "notes": "Annual physical next week"},
    {"id": 206, "patient_name": "Daniel Kim", "task_type": "Test Scheduling", "priority": "high", "due_date": "2024-02-15", "status": "pending", "contact_method": "phone", "phone": "(555) 666-7777", "email": "d.kim@email.com", "address": "987 Birch Rd, Quincy, MA", "notes": "MRI scheduling urgent"},
    {"id": 207, "patient_name": "Sophie Turner", "task_type": "Care Plan Review", "priority": "medium", "due_date": "2024-02-19", "status": "pending", "contact_method": "mail", "phone": "(555) 777-8888", "email": "s.turner@email.com", "address": "147 Spruce Ave, Medford, MA", "notes": "Chronic condition management"},
    {"id": 208, "patient_name": "Marcus Johnson", "task_type": "Discharge Follow-up", "priority": "high", "due_date": "2024-02-14", "status": "pending", "contact_method": "phone", "phone": "(555) 888-9999", "email": "m.johnson@email.com", "address": "258 Willow St, Arlington, MA", "notes": "Post-hospital discharge check"}
]

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/insurance')
def insurance():
    return render_template('insurance.html', patients=MOCK_PATIENTS, claims=MOCK_CLAIMS)

@app.route('/care-coordination')
def care_coordination():
    return render_template('care_coordination.html', care_tasks=MOCK_CARE_TASKS)

@app.route('/api/verify-insurance', methods=['POST'])
def verify_insurance():
    patient_id = request.json.get('patient_id')
    patient = next((p for p in MOCK_PATIENTS if p['id'] == patient_id), None)
    
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
    
    # Simulate AI call process
    call_steps = [
        {"step": "Dialing insurance provider", "status": "in_progress"},
        {"step": "Connected to automated system", "status": "in_progress"},
        {"step": "Navigating phone menu", "status": "in_progress"},
        {"step": "Speaking with representative", "status": "in_progress"},
        {"step": "Verifying patient information", "status": "in_progress"},
        {"step": "Obtaining coverage details", "status": "in_progress"},
        {"step": "Call completed successfully", "status": "completed"}
    ]
    
    # Mock verification result with 90% success rate
    if random.random() < 0.9:
        verification_result = {
            "patient_name": patient["name"],
            "insurance_active": True,
            "coverage_type": random.choice(["PPO", "HMO", "EPO"]),
            "copay": random.choice(["$15", "$25", "$35", "$50"]),
            "deductible_remaining": f"${random.randint(0, 500)}",
            "prior_auth_required": random.choice([True, False]),
            "effective_date": "2024-01-01",
            "call_duration": f"{random.randint(2, 5)}m {random.randint(10, 59)}s",
            "confidence_score": random.randint(95, 99),
            "verification_status": "success"
        }
    else:
        failure_scenarios = [
            {
                "patient_name": patient["name"],
                "insurance_active": False,
                "failure_reason": "Policy terminated - last active date: 2023-12-31",
                "recommended_action": "Contact patient to update insurance information",
                "call_duration": f"{random.randint(1, 3)}m {random.randint(10, 59)}s",
                "confidence_score": random.randint(92, 97),
                "verification_status": "failed"
            },
            {
                "patient_name": patient["name"],
                "insurance_active": None,
                "failure_reason": "Unable to verify - system maintenance at insurance provider",
                "recommended_action": "Retry verification in 2 hours or contact manually",
                "call_duration": f"{random.randint(1, 2)}m {random.randint(10, 59)}s",
                "confidence_score": random.randint(88, 94),
                "verification_status": "failed"
            }
        ]
        verification_result = random.choice(failure_scenarios)
    
    return jsonify({
        "call_steps": call_steps,
        "verification_result": verification_result,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/follow-up-claim', methods=['POST'])
def follow_up_claim():
    claim_id = request.json.get('claim_id')
    claim = next((c for c in MOCK_CLAIMS if c['id'] == claim_id), None)
    
    if not claim:
        return jsonify({"error": "Claim not found"}), 404
    
    # Simulate AI claim follow-up process
    followup_steps = [
        {"step": "Accessing insurance portal", "status": "in_progress"},
        {"step": "Authenticating with provider", "status": "in_progress"},
        {"step": "Locating claim in system", "status": "in_progress"},
        {"step": "Analyzing claim status", "status": "in_progress"},
        {"step": "Gathering required documentation", "status": "in_progress"},
        {"step": "Submitting appeal/correction", "status": "in_progress"},
        {"step": "Follow-up completed successfully", "status": "completed"}
    ]
    
    # Mock follow-up result
    followup_result = {
        "claim_number": claim["claim_number"],
        "patient_name": claim["patient_name"],
        "original_status": claim["status"],
        "new_status": "resubmitted" if claim["status"] == "denied" else "expedited",
        "action_taken": "Corrected billing code and resubmitted" if "billing code" in claim["reason"] else "Provided missing documentation",
        "expected_resolution": "3-5 business days",
        "recovery_amount": claim["amount"],
        "processing_time": "2m 15s",
        "confidence_score": random.randint(94, 99)
    }
    
    return jsonify({
        "followup_steps": followup_steps,
        "followup_result": followup_result,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/coordinate-care', methods=['POST'])
def coordinate_care():
    task_id = request.json.get('task_id')
    task = next((t for t in MOCK_CARE_TASKS if t['id'] == task_id), None)
    
    if not task:
        return jsonify({"error": "Task not found"}), 404
    
    contact_method = task['contact_method']
    
    # Different workflows based on contact method
    if contact_method == 'phone':
        coordination_steps = [
            {"step": "Analyzing patient care requirements", "status": "in_progress"},
            {"step": "Dialing patient phone number", "status": "in_progress"},
            {"step": "Speaking with patient", "status": "in_progress"},
            {"step": "Discussing care needs", "status": "in_progress"},
            {"step": "Scheduling/coordinating action", "status": "in_progress"},
            {"step": "Updating patient records", "status": "in_progress"},
            {"step": "Phone coordination completed", "status": "completed"}
        ]
        coordination_result = {
            "task_type": task["task_type"],
            "patient_name": task["patient_name"],
            "contact_method": contact_method,
            "contact_successful": True,
            "action_completed": "Appointment scheduled" if "Appointment" in task["task_type"] else "Task resolved immediately",
            "next_step": "Follow-up in 1 week" if task["priority"] == "high" else "Monitor as needed",
            "patient_satisfaction": random.choice(["Very satisfied", "Satisfied", "Neutral"]),
            "processing_time": f"{random.randint(2, 5)}m {random.randint(10, 59)}s",
            "confidence_score": random.randint(92, 99)
        }
    
    elif contact_method == 'email':
        coordination_steps = [
            {"step": "Analyzing patient care requirements", "status": "in_progress"},
            {"step": "Composing personalized email", "status": "in_progress"},
            {"step": "Sending email to patient", "status": "in_progress"},
            {"step": "Setting up response monitoring", "status": "in_progress"},
            {"step": "Scheduling follow-up reminder", "status": "in_progress"},
            {"step": "Email coordination initiated", "status": "completed"}
        ]
        coordination_result = {
            "task_type": task["task_type"],
            "patient_name": task["patient_name"],
            "contact_method": contact_method,
            "contact_successful": True,
            "action_completed": "Email sent successfully",
            "next_step": "Awaiting patient response (24-48 hours)",
            "expected_response": "Within 2 business days",
            "processing_time": f"{random.randint(1, 2)}m {random.randint(10, 45)}s",
            "confidence_score": random.randint(95, 99)
        }
    
    else:  # mail
        coordination_steps = [
            {"step": "Analyzing patient care requirements", "status": "in_progress"},
            {"step": "Generating personalized letter", "status": "in_progress"},
            {"step": "Preparing mail package", "status": "in_progress"},
            {"step": "Scheduling mail delivery", "status": "in_progress"},
            {"step": "Setting up response tracking", "status": "in_progress"},
            {"step": "Mail coordination initiated", "status": "completed"}
        ]
        coordination_result = {
            "task_type": task["task_type"],
            "patient_name": task["patient_name"],
            "contact_method": contact_method,
            "contact_successful": True,
            "action_completed": "Mail prepared and scheduled for delivery",
            "next_step": "Awaiting patient response (5-10 business days)",
            "expected_response": "Within 2 weeks",
            "processing_time": f"{random.randint(1, 3)}m {random.randint(15, 45)}s",
            "confidence_score": random.randint(90, 96)
        }
    
    return jsonify({
        "coordination_steps": coordination_steps,
        "coordination_result": coordination_result,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/stop-process', methods=['POST'])
def stop_process():
    # In a real implementation, this would stop the actual AI process
    return jsonify({"status": "stopped", "message": "AI process stopped by user"})

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))
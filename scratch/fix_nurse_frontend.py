import os

filepath = 'hpms_frontend/src/pages/Nurse.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add admitted badge and ward/bed info to the queue card
old_queue_card = '''                    <h4>{patient}</h4>
                    <div className="nurse-queue-meta">'''

new_queue_card = '''                    <h4>{patient}</h4>
                    {grouped[patient]?.[0]?.is_admitted && (
                      <div className="nurse-admitted-info">
                        <span className="queue-tag queue-tag-admitted">🏥 Admitted</span>
                        {grouped[patient][0].ward_name && (
                          <span className="ward-bed-tag">
                            {grouped[patient][0].ward_name} — Bed {grouped[patient][0].bed_number}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="nurse-queue-meta">'''

content = content.replace(old_queue_card, new_queue_card)

# Add admission note display in the right panel 
old_right_panel = '''              {!selectedPatient ? (
                <p className="nurse-placeholder">
                  Select a patient from your queue.'''

new_right_panel = '''              {!selectedPatient ? (
                <p className="nurse-placeholder">
                  Select a patient from your queue.'''

# Add admission info block in the task detail area
old_task_detail = '''                  <h2>{selectedPatient}</h2>'''

new_task_detail = '''                  <h2>{selectedPatient}</h2>
                  {selectedPatientTasks[0]?.is_admitted && (
                    <div className="nurse-admission-detail">
                      <h4>🏥 Admission Details</h4>
                      <p><strong>Ward:</strong> {selectedPatientTasks[0]?.ward_name || "—"}</p>
                      <p><strong>Bed:</strong> {selectedPatientTasks[0]?.bed_number || "—"}</p>
                      {selectedPatientTasks[0]?.admission_note && (
                        <p><strong>Note:</strong> {selectedPatientTasks[0]?.admission_note}</p>
                      )}
                    </div>
                  )}'''

if '<h2>{selectedPatient}</h2>' in content:
    content = content.replace(old_task_detail, new_task_detail, 1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Nurse.jsx updated successfully")

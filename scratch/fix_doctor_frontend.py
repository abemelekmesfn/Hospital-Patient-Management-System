import os

filepath = 'hpms_frontend/src/pages/Doctor.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add admission-related state variables after the nurseModal state
admission_state = '''
  const [admitModal, setAdmitModal] = useState(false);
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [admitNote, setAdmitNote] = useState("");
  const [examNote, setExamNote] = useState("");
'''

content = content.replace(
    '  const [assignedNurseInput, setAssignedNurseInput] = useState("");',
    '  const [assignedNurseInput, setAssignedNurseInput] = useState("");\n' + admission_state
)

# 2. Add fetchWards function after fetchAvailableNurses
fetch_wards = '''
  const fetchWards = useCallback(async () => {
    try {
      const res = await API.get("/admin/wards/");
      setWards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);
'''

content = content.replace(
    '  useEffect(() => {\n    void fetchLabNotifications();',
    fetch_wards + '\n  useEffect(() => {\n    void fetchLabNotifications();'
)

# 3. Add admission handler functions after handleCompleted
admission_handlers = '''
  const handleAdmitPatient = async () => {
    if (!selected || !selectedWard || !selectedBed) return;
    setBusy(true);
    try {
      await API.post(`/doctor/visit/${selected.id}/admit/`, {
        ward_id: selectedWard,
        bed_id: selectedBed,
        note: admitNote,
      });
      setAdmitModal(false);
      setSelectedWard("");
      setSelectedBed("");
      setAdmitNote("");
      await refreshVisit(selected.id);
      await fetchQueue();
      setToast({ message: "Patient admitted successfully", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Could not admit patient.");
    } finally {
      setBusy(false);
    }
  };

  const handleDischargePatient = async () => {
    if (!selected) return;
    if (!window.confirm("Are you sure you want to discharge this patient?")) return;
    setBusy(true);
    try {
      await API.post(`/doctor/visit/${selected.id}/discharge/`);
      await refreshVisit(selected.id);
      await fetchQueue();
      setToast({ message: "Patient discharged successfully", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Could not discharge patient.");
    } finally {
      setBusy(false);
    }
  };

  const handleAddExamination = async () => {
    if (!selected || !examNote.trim()) return;
    setBusy(true);
    try {
      await API.post(`/doctor/visit/${selected.id}/examination/`, {
        note: examNote,
      });
      setExamNote("");
      await refreshVisit(selected.id);
      setToast({ message: "Examination added", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Could not add examination.");
    } finally {
      setBusy(false);
    }
  };

  const openAdmitModal = async () => {
    await fetchWards();
    setAdmitModal(true);
  };
'''

content = content.replace(
    '  const removeLocalLab = (index) => {',
    admission_handlers + '\n  const removeLocalLab = (index) => {'
)

# 4. Add "Admitted" badge to queue card
content = content.replace(
    '''                    {visit.status === "IN_CONSULTATION" && (
                      <span className="queue-tag queue-tag-draft">
                        incomplete diagnosis
                      </span>
                    )}''',
    '''                    {visit.status === "IN_CONSULTATION" && (
                      <span className="queue-tag queue-tag-draft">
                        incomplete diagnosis
                      </span>
                    )}
                    {visit.is_admitted && (
                      <span className="queue-tag queue-tag-admitted">
                        🏥 Admitted
                      </span>
                    )}'''
)

# 5. Add "Admit Patient" and "Discharge" buttons next to "Completed" button
content = content.replace(
    '''                    <button
                      type="button"
                      className="completed-btn"
                      disabled={busy}
                      onClick={handleCompleted}
                    >
                      Completed
                    </button>
                  </div>
                  <p className="hint-text">
                    Save draft keeps the patient on your list for follow-up, labs, or
                    ongoing care. Completed finishes your work and removes them from
                    the doctor queue.
                  </p>''',
    '''                    <button
                      type="button"
                      className="completed-btn"
                      disabled={busy}
                      onClick={handleCompleted}
                    >
                      Completed
                    </button>
                    {!selected.is_admitted ? (
                      <button
                        type="button"
                        className="admit-btn"
                        disabled={busy}
                        onClick={openAdmitModal}
                      >
                        🏥 Admit Patient
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="discharge-btn"
                        disabled={busy}
                        onClick={handleDischargePatient}
                      >
                        Discharge Patient
                      </button>
                    )}
                  </div>
                  <p className="hint-text">
                    Save draft keeps the patient on your list for follow-up, labs, or
                    ongoing care. Completed finishes your work and removes them from
                    the doctor queue.
                  </p>

                  {selected.is_admitted && (
                    <div className="section admission-info-box">
                      <h3>🏥 Admission Info</h3>
                      <p><strong>Ward:</strong> {selected.admission?.ward_name || "—"}</p>
                      <p><strong>Bed:</strong> {selected.admission?.bed_number || "—"}</p>
                      <p><strong>Note:</strong> {selected.admission?.admission_note || "—"}</p>
                      <p><strong>Admitted:</strong> {selected.admission?.admitted_at ? new Date(selected.admission.admitted_at).toLocaleString() : "—"}</p>
                    </div>
                  )}

                  {selected.is_admitted && (
                    <div className="section">
                      <h3>Daily Physical Examination</h3>
                      <textarea
                        value={examNote}
                        onChange={(e) => setExamNote(e.target.value)}
                        placeholder="Enter daily examination notes..."
                      />
                      <button
                        type="button"
                        className="draft-btn"
                        disabled={busy || !examNote.trim()}
                        onClick={handleAddExamination}
                      >
                        Add Examination
                      </button>
                      {(selected.physical_examinations || []).length > 0 && (
                        <div className="exam-history">
                          <h4>Examination History</h4>
                          {(selected.physical_examinations || []).map((ex) => (
                            <div key={ex.id} className="exam-entry">
                              <div className="exam-entry-header">
                                <span>{new Date(ex.examined_at).toLocaleString()}</span>
                                <span className="exam-doctor">Dr. {ex.doctor_name}</span>
                              </div>
                              <p>{ex.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}'''
)

# 6. Add admission modal before the closing </div></div>
admit_modal_jsx = '''
        {admitModal && selected && (
          <div
            className="doctor-lab-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admit-modal-title"
          >
            <div className="doctor-lab-backdrop" onClick={() => setAdmitModal(false)} />
            <div className="doctor-lab-modal" style={{ maxWidth: "500px" }}>
              <div className="doctor-lab-modal-header" style={{ background: "#eff6ff", borderBottomColor: "#bfdbfe" }}>
                <h2 id="admit-modal-title" style={{ color: "#1e40af" }}>
                  Admit Patient — {selected.patient_name}
                </h2>
                <button
                  type="button"
                  className="doctor-lab-modal-x"
                  onClick={() => setAdmitModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="doctor-lab-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontWeight: 600, marginBottom: "6px", display: "block" }}>Select Ward</label>
                  <select
                    value={selectedWard}
                    onChange={(e) => { setSelectedWard(e.target.value); setSelectedBed(""); }}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="">-- Choose Ward --</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.ward_type})</option>
                    ))}
                  </select>
                </div>
                {selectedWard && (
                  <div>
                    <label style={{ fontWeight: 600, marginBottom: "6px", display: "block" }}>Select Bed</label>
                    <select
                      value={selectedBed}
                      onChange={(e) => setSelectedBed(e.target.value)}
                      style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="">-- Choose Bed --</option>
                      {(wards.find(w => String(w.id) === String(selectedWard))?.beds || [])
                        .filter(b => !b.is_occupied)
                        .map((b) => (
                          <option key={b.id} value={b.id}>{b.bed_number} (Available)</option>
                        ))
                      }
                    </select>
                  </div>
                )}
                <div>
                  <label style={{ fontWeight: 600, marginBottom: "6px", display: "block" }}>Admission Note</label>
                  <textarea
                    value={admitNote}
                    onChange={(e) => setAdmitNote(e.target.value)}
                    placeholder="Reason for admission..."
                    style={{ width: "100%", minHeight: "80px", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "vertical" }}
                  />
                </div>
                <button
                  type="button"
                  disabled={busy || !selectedWard || !selectedBed}
                  onClick={handleAdmitPatient}
                  style={{
                    padding: "12px",
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    opacity: (!selectedWard || !selectedBed) ? 0.5 : 1,
                  }}
                >
                  Confirm Admission
                </button>
              </div>
            </div>
          </div>
        )}
'''

# Insert before the very last </div></div>
content = content.replace(
    '''        {nurseModal && !historyPatientId && (''',
    admit_modal_jsx + '\n        {nurseModal && !historyPatientId && ('
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Doctor.jsx updated successfully")

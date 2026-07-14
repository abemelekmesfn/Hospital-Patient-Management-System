import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Styles/doctor.css";
import API from "../api/axios";
import TopNav from "../components/TopNav";
import NavPatientSearch from "../components/NavPatientSearch";
import PatientHistoryView from "../components/PatientHistoryView";

const LAB_PRESETS = ["CBC", "Urinalysis", "Blood Sugar"];

function mergeDoctorQueues(data) {
  if (Array.isArray(data)) return data;
  const newP = Array.isArray(data?.new_patients) ? data.new_patients : [];
  const bedP = Array.isArray(data?.bed_patients) ? data.bed_patients : [];
  const seen = new Set();
  const out = [];
  for (const v of [...newP, ...bedP]) {
    if (!v?.id || seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
  }
  return out;
}

export default function Doctor() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [queueError, setQueueError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [showMobileQueue, setShowMobileQueue] = useState(true);

  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [labs, setLabs] = useState([]);
  const [localPrescriptions, setLocalPrescriptions] = useState([]);
  const [localTasks, setLocalTasks] = useState([]);

  const [drugInput, setDrugInput] = useState("");
  const [rxDosageInput, setRxDosageInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [labInput, setLabInput] = useState("");

  const [busy, setBusy] = useState(false);

  const [labNotifications, setLabNotifications] = useState([]);
  const [labModal, setLabModal] = useState(null);
  const [historyPatientId, setHistoryPatientId] = useState(null);

  const [availableNurses, setAvailableNurses] = useState([]);
  const [nurseNotifications, setNurseNotifications] = useState([]);
  const [nurseModal, setNurseModal] = useState(null); // { visitId, type: 'NOTES'|'VITALS', data: [] }
  const [assignedNurseInput, setAssignedNurseInput] = useState("");

  const [admitModal, setAdmitModal] = useState(false);
  const [wards, setWards] = useState([]);
  const [selectedWard, setSelectedWard] = useState("");
  const [selectedBed, setSelectedBed] = useState("");
  const [admitNote, setAdmitNote] = useState("");
  const [examNote, setExamNote] = useState("");


  const refreshVisit = useCallback(async (visitId) => {
    const res = await API.get(`/doctor/visit/${visitId}/`);
    setSelected(res.data);
    return res.data;
  }, []);

  const fetchLabNotifications = useCallback(async () => {
    if (!localStorage.getItem("access")) return;
    try {
      const res = await API.get("/doctor/lab-notifications/");
      setLabNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchNurseNotifications = useCallback(async () => {
    if (!localStorage.getItem("access")) return;
    try {
      const res = await API.get("/doctor/nurse-notifications/");
      setNurseNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAvailableNurses = useCallback(async () => {
    if (!localStorage.getItem("access")) return;
    try {
      const res = await API.get("/doctor/available-nurses/");
      setAvailableNurses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);


  const fetchWards = useCallback(async () => {
    try {
      const res = await API.get("/admin/wards/");
      setWards(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    void fetchLabNotifications();
    void fetchNurseNotifications();
    void fetchAvailableNurses();
    const t = setInterval(() => {
      void fetchLabNotifications();
      void fetchNurseNotifications();
    }, 5000);
    return () => clearInterval(t);
  }, [fetchLabNotifications, fetchNurseNotifications, fetchAvailableNurses]);

  const openLabResultModal = async (visitId) => {
    try {
      const res = await API.get(`/doctor/visit/${visitId}/`);
      const visit = res.data;
      const orders = (visit.lab_orders || []).filter(
        (lo) => lo.status === "COMPLETED" && lo.result
      );
      if (!orders.length) {
        return;
      }
      setLabModal({ visit, orders });
    } catch (err) {
      console.error(err);
    }
  };

  const closeLabResultModal = async () => {
    if (!labModal) return;
    const { visit, orders } = labModal;
    const idsToAck = orders
      .filter((o) => !o.doctor_lab_result_modal_seen)
      .map((o) => o.id);
    try {
      if (idsToAck.length) {
        await API.post("/doctor/lab-results/acknowledge/", {
          visit_id: visit.id,
          order_ids: idsToAck,
        });
      }
    } catch (err) {
      console.error(err);
    }
    const vid = visit.id;
    setLabModal(null);
    await fetchLabNotifications();
    if (selected?.id === vid) {
      await refreshVisit(vid);
    }
  };

  const dismissLabToast = async (orderId, e) => {
    e.stopPropagation();
    try {
      await API.post(`/doctor/lab-notification/${orderId}/dismiss/`);
      await fetchLabNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const openNurseModal = async (visitId, type) => {
    try {
      const res = await API.get(`/doctor/visit/${visitId}/`);
      const visit = res.data;
      const obsList = (visit.nurse_observations || []).filter(o => o.commit_type === type);
      if (!obsList.length) return;
      setNurseModal({ visit, type, observations: obsList });
    } catch (err) {
      console.error(err);
    }
  };

  const closeNurseModal = async () => {
    if (!nurseModal) return;
    const { visit, observations } = nurseModal;
    const idsToAck = observations.filter(o => !o.doctor_seen).map(o => o.id);
    try {
      if (idsToAck.length) {
        await API.post("/doctor/nurse-observations/acknowledge/", {
          visit_id: visit.id,
          observation_ids: idsToAck
        });
      }
    } catch (err) {
      console.error(err);
    }
    const vid = visit.id;
    setNurseModal(null);
    await fetchNurseNotifications();
    if (selected?.id === vid) {
      await refreshVisit(vid);
    }
  };

  const dismissNurseToast = async (obsId, e) => {
    e.stopPropagation();
    try {
      const obs = nurseNotifications.find(n => n.id === obsId);
      if (obs) {
        await API.post("/doctor/nurse-observations/acknowledge/", {
          visit_id: obs.visit_id,
          observation_ids: [obsId]
        });
      }
      await fetchNurseNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const appendExamTemplate = (template) => {
    setNotes((prev) => {
      const current = (prev ?? "").trim();
      if (!current) return template;
      if (current.endsWith(",")) return `${current} ${template}`;
      return `${current}, ${template}`;
    });
  };

  const fetchQueue = useCallback(async () => {
    if (!localStorage.getItem("access")) {
      setQueueError("Not signed in.");
      setQueue([]);
      return;
    }
    try {
      const res = await API.get("/doctor/queue/");
      setQueueError(null);
      setQueue(mergeDoctorQueues(res.data));
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 401) {
        setQueueError("Session expired or not signed in. Please log in again.");
        setQueue([]);
      } else {
        setQueueError(
          err.response?.data?.detail ||
          "Could not load the doctor queue. Check that the server is running."
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access")) {
      navigate("/", { replace: true });
      return;
    }
    fetchQueue();
    const t = setInterval(fetchQueue, 5000);
    return () => clearInterval(t);
  }, [fetchQueue, navigate]);

  useEffect(() => {
    const visitId = selected?.id;
    if (!visitId || !localStorage.getItem("access")) return undefined;
    const t = setInterval(() => void refreshVisit(visitId), 5000);
    return () => clearInterval(t);
  }, [selected?.id, refreshVisit]);

  const handleSelect = async (id) => {
    try {
      await API.post(`/doctor/claim_patient/${id}/`);
      const data = await refreshVisit(id);
      setLabs([]);
      setLocalPrescriptions([]);
      setLocalTasks([]);
      setLabInput("");
      setDrugInput("");
      setRxDosageInput("");
      setRxFreqInput("");
      setRxDurInput("");
      setTaskInput("");
      setAssignedNurseInput("");
      setNotes(data.consultation?.physical_exam ?? "");
      setDiagnosis(data.consultation?.diagnosis ?? "");
      setExamNote("");
      setAdmitNote("");
      setSelectedWard("");
      setSelectedBed("");
      await fetchQueue();
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || "Could not open this visit.";
      setQueueError(detail);
      setTimeout(() => setQueueError(null), 4000);
      await fetchQueue();
    }
  };

  const addLabFromInput = () => {
    const t = labInput.trim();
    if (!t) return;
    setLabs((prev) => [...prev, t]);
    setLabInput("");
  };

  const postLabOrders = async (visitId, tests) => {
    await Promise.all(
      tests.map((test) =>
        API.post("/doctor/lab-order/", {
          visit_id: visitId,
          test_name: test,
        })
      )
    );
  };

  const rxPayload = (visitId, row) => ({
    visit_id: visitId,
    drug_name: typeof row === "string" ? row : row.drug_name,
    dosage: typeof row === "string" ? "-" : row.dosage?.trim() || "-",
    frequency: typeof row === "string" ? "-" : row.frequency?.trim() || "-",
    duration: typeof row === "string" ? "-" : row.duration?.trim() || "-",
  });

  const postPrescriptions = async (visitId, rows) => {
    await Promise.all(
      rows.map((row) => API.post("/doctor/prescription/", rxPayload(visitId, row)))
    );
  };

  const postNurseTasks = async (visitId, descriptions) => {
    await Promise.all(
      descriptions.map((task) => {
        const payload = {
          visit_id: visitId,
          task_description: task,
        };
        if (assignedNurseInput) {
          payload.assigned_nurse = assignedNurseInput;
        }
        return API.post("/doctor/nurse-task/", payload);
      })
    );
  };

  const saveConsultation = async (visitId) => {
    await API.post("/doctor/consultation/", {
      visit_id: visitId,
      chief_complaint: selected.chief_complaint || "",
      physical_exam: notes,
      diagnosis,
    });
  };

  /** Sends staged nurse tasks to the nurse queue immediately. */
  const handleOrderNurses = async () => {
    if (!selected || !localTasks.length) return;
    setBusy(true);
    try {
      await postNurseTasks(selected.id, localTasks);
      setLocalTasks([]);
      await refreshVisit(selected.id);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      alert("Could not send nurse tasks.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrescribeOne = async (row) => {
    if (!selected) return;
    setBusy(true);
    try {
      await API.post("/doctor/prescription/", rxPayload(selected.id, row));
      setLocalPrescriptions((prev) => prev.filter((r) => r.key !== row.key));
      await refreshVisit(selected.id);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      alert("Could not save prescription.");
    } finally {
      setBusy(false);
    }
  };

  const addStagedPrescription = () => {
    if (!drugInput.trim() || !rxDosageInput.trim()) return;

    setLocalPrescriptions((prev) => [
      ...prev,
      {
        key: Date.now(),
        drug_name: drugInput.trim(),
        dosage: rxDosageInput.trim(),
      },
    ]);
    setDrugInput("");
    setRxDosageInput("");
  };

  /** Sends staged lab tests to the lab immediately (does not finalize the visit). */
  const handleOrderLabs = async () => {
    if (!selected || !labs.length) return;
    setBusy(true);
    try {
      await postLabOrders(selected.id, labs);
      setLabs([]);
      await refreshVisit(selected.id);
      await fetchQueue();
    } catch (err) {
      console.error(err);
      alert("Could not place lab orders.");
    } finally {
      setBusy(false);
    }
  };

  /** Save encounter as draft: consultation + any staged orders, patient stays on your list. */
  const handleSaveEncounterDraft = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const visitId = selected.id;
      await saveConsultation(visitId);
      if (labs.length) await postLabOrders(visitId, labs);
      if (localPrescriptions.length)
        await postPrescriptions(visitId, localPrescriptions);
      if (localTasks.length) await postNurseTasks(visitId, localTasks);
      setLabs([]);
      setLocalPrescriptions([]);
      setLocalTasks([]);
      await refreshVisit(visitId);
      await fetchQueue();
      setToast({ message: "Patient saved in draft", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Error saving encounter.");
    } finally {
      setBusy(false);
    }
  };

  /** Finalize: release patient from doctor queue (backend sets lab/pharmacy/consultation status). */
  const handleCompleted = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const visitId = selected.id;
      await saveConsultation(visitId);
      if (labs.length) await postLabOrders(visitId, labs);
      if (localPrescriptions.length)
        await postPrescriptions(visitId, localPrescriptions);
      if (localTasks.length) await postNurseTasks(visitId, localTasks);
      await API.post("/doctor/complete-encounter/", { visit_id: visitId });

      setQueue((q) => q.filter((v) => v.id !== visitId));
      setSelected(null);
      setNotes("");
      setDiagnosis("");
      setLabs([]);
      setLocalPrescriptions([]);
      setLocalTasks([]);
      setLabInput("");
      setDrugInput("");
      setRxDosageInput("");
      setTaskInput("");
      setAssignedNurseInput("");
      await fetchQueue();
      alert("Visit completed and removed from your queue.");
    } catch (err) {
      console.error("handleCompleted error:", err);
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Error completing visit.";
      alert(detail);
    } finally {
      setBusy(false);
    }
  };


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

  const removeLocalLab = (index) => {
    setLabs((prev) => prev.filter((_, i) => i !== index));
  };

  const removeLocalRx = (index) => {
    setLocalPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const removeLocalTask = (index) => {
    setLocalTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const deleteServerLab = async (orderId) => {
    if (!selected) return;
    try {
      await API.delete(`/doctor/lab-order/${orderId}/`);
      await refreshVisit(selected.id);
    } catch (err) {
      console.error(err);
      alert("Could not remove lab order.");
    }
  };

  const deleteServerRx = async (rxId) => {
    if (!selected) return;
    try {
      await API.delete(`/doctor/prescription/${rxId}/`);
      await refreshVisit(selected.id);
    } catch (err) {
      console.error(err);
      alert("Could not remove prescription.");
    }
  };

  const deleteServerTask = async (taskId) => {
    if (!selected) return;
    try {
      await API.delete(`/doctor/nurse-task/${taskId}/`);
      await refreshVisit(selected.id);
    } catch (err) {
      console.error(err);
      alert("Could not remove task.");
    }
  };

  const labStatusLabel = (st) => {
    if (st === "COMPLETED") return "Done";
    if (st === "PROCESSING") return "Processing";
    return "Pending";
  };

  const rxAllergyHit = useMemo(() => {
    const a = (selected?.patient?.allergies || "").trim().toLowerCase();
    if (!a) return false;
    if (drugInput.toLowerCase().includes(a)) return true;
    return localPrescriptions.some((r) =>
      (r.drug_name || "").toLowerCase().includes(a)
    );
  }, [selected?.patient?.allergies, drugInput, localPrescriptions]);

  const nurseStatusClass = (st) => {
    if (st === "DONE") return "nurse-status nurse-done";
    return "nurse-status nurse-pending";
  };

  return (
    <div className="hpms-shell">
      <TopNav
        title="Doctor"
        center={
          <NavPatientSearch
            onSelect={(p) => setHistoryPatientId(p?.id ?? null)}
          />
        }
      />
      <div className="hpms-shell-content">
        {historyPatientId ? (
          <PatientHistoryView
            patientId={historyPatientId}
            variant="clinical"
            onBack={() => setHistoryPatientId(null)}
          />
        ) : (
          <div className={`doctor-container ${showMobileQueue ? 'mobile-show-queue' : 'mobile-hide-queue'}`}>
            {toast && (
              <div className={`doctor-toast ${toast.type}`}>
                {toast.message}
              </div>
            )}

            <div className="doctor-left">
              <h3>Doctor Queue</h3>

              {queueError && (
                <div className="doctor-queue-error" role="alert">
                  {queueError}
                </div>
              )}

              {!queueError && queue.length === 0 && (
                <p className="doctor-queue-empty">
                  No patients in your queue. Patients appear here after reception
                  finalizes registration (and triage is complete). This list refreshes
                  every few seconds.
                </p>
              )}

              {queue.map((visit) => (
                <div
                  key={visit.id}
                  className={`queue-card ${visit.priority} ${selected?.id === visit.id ? "active" : ""
                    }`}
                  onClick={() => {
                    handleSelect(visit.id);
                    setShowMobileQueue(false);
                  }}
                >
                  <div className="queue-top">
                    <h4 className="queue-name">{visit.name}</h4>
                    {visit.status === "IN_CONSULTATION" && (
                      <span className="queue-tag queue-tag-draft">
                        incomplete diagnosis
                      </span>
                    )}
                    {visit.is_admitted && (
                      <span className="queue-tag queue-tag-admitted">
                        🏥 Admitted
                      </span>
                    )}
                  </div>
                  <p className="queue-complaint">{visit.chief_complaint}</p>

                  <div className="queue-details">
                    <div className="queue-detail-row">
                      <span className="queue-detail-label">Arrived</span>
                      <span className="queue-detail-value">
                        {visit.arrival_time
                          ? new Date(visit.arrival_time).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    <div className="queue-detail-row">
                      <span className="queue-detail-label">Status</span>
                      <span className="queue-detail-value">{visit.status || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}

              {selected && (
                <div
                  className={`patient-card ${selected.triage_priority || selected.priority
                    }`}
                >
                  <h3>{selected.patient_name}</h3>

                  <p>
                    <strong>Age:</strong> {selected.patient?.age || "N/A"}
                  </p>
                  <p>
                    <strong>Sex:</strong> {selected.patient?.sex || "N/A"}
                  </p>

                  <div className="triage-badge">
                    {selected.triage_priority || selected.priority}
                  </div>

                  <div className="vitals-box">
                    <h4>Vitals</h4>

                    <p>Pulse: {selected.pulse ?? "N/A"}</p>
                    <p>BP: {selected.blood_pressure ?? "N/A"}</p>
                    <p>Temp: {selected.temperature ?? "N/A"}</p>
                    <p>Resp Rate: {selected.respiratory_rate ?? "N/A"}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="doctor-center">
              {!selected ? (
                <p>Select a patient</p>
              ) : (
                <>
                  <button
                    className="mobile-back-btn"
                    onClick={() => setShowMobileQueue(true)}
                  >
                    ⬅ Back to Queue
                  </button>
                  <h2>{selected.patient_name}</h2>

                  <p className="complaint">
                    <strong>Chief Complaint:</strong> {selected.chief_complaint}
                  </p>

                  <div className="section">
                    <h3>Physical Examination</h3>

                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter examination notes..."
                    />

                    <div className="templates">
                      {[
                        "HEENT Normal",
                        "Chest Clear",
                        "Abdomen Soft",
                        "No Neurological Deficit",
                      ].map((template) => (
                        <button
                          type="button"
                          key={template}
                          onClick={() => appendExamTemplate(template)}
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="section">
                    <h3>Diagnosis</h3>

                    <input
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="Search diagnosis (e.g. Malaria)"
                    />

                    {diagnosis && (
                      <div className="suggestions">
                        {["Malaria", "Typhoid", "Tuberculosis", "HIV/AIDS", "Hypertension", "Diabetes", "Asthma", "Heart Disease", "Measles", "Malnutrition", "Diarrhea", "Pneumonia", "Pregnancy Complications", "Postpartum Hemorrhage"]
                          .filter((d) =>
                            d.toLowerCase().includes(diagnosis.toLowerCase())
                          )
                          .map((item) => (
                            <div key={item} onClick={() => setDiagnosis(item)}>
                              {item}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="center-actions">
                    <button
                      type="button"
                      className="draft-btn"
                      disabled={busy}
                      onClick={handleSaveEncounterDraft}
                    >
                      Complete Encounter (save draft)
                    </button>
                    <button
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
                  )}
                </>
              )}
            </div>

            <div className="doctor-right">
              {!selected ? (
                <p>Select a patient</p>
              ) : (
                <>
                  <h3>Action Hub</h3>

                  <div className="card">
                    <h4>Lab Orders</h4>
                    <p className="card-hint">
                      Order sends tests to the lab now. You can add custom tests
                      below.
                    </p>

                    <div className="preset-row">
                      {LAB_PRESETS.map((test) => (
                        <button
                          type="button"
                          key={test}
                          onClick={() => setLabs((prev) => [...prev, test])}
                        >
                          + {test}
                        </button>
                      ))}
                    </div>

                    <div className="input-row">
                      <input
                        placeholder="Custom lab test name"
                        value={labInput}
                        onChange={(e) => setLabInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addLabFromInput()}
                      />
                      <button type="button" onClick={addLabFromInput}>
                        Add
                      </button>
                    </div>

                    <ul className="order-list">
                      {(selected.lab_orders || []).map((lo) => (
                        <li key={lo.id} className="order-row">
                          <span className="order-label">{lo.test_name}</span>
                          <span className={`lab-tag lab-tag-${lo.status}`}>
                            {labStatusLabel(lo.status)}
                          </span>
                          {lo.status === "PENDING" && (
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => deleteServerLab(lo.id)}
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      ))}
                      {(selected.lab_orders || []).some((lo) => lo.status === "COMPLETED" && lo.result) && (
                        <button
                          type="button"
                          className={
                            (selected.lab_orders || []).some(
                              (lo) => lo.status === "COMPLETED" && lo.result && !lo.doctor_lab_result_modal_seen
                            )
                              ? "lab-result-btn lab-result-btn-unread"
                              : "lab-result-btn"
                          }
                          style={{ width: "100%", marginTop: "10px" }}
                          onClick={() => openLabResultModal(selected.id)}
                        >
                          View All Results
                        </button>
                      )}
                      {labs.map((l, i) => (
                        <li key={`local-lab-${i}`} className="order-row">
                          <span className="order-label">{l}</span>
                          <span className="lab-tag lab-tag-staged">Staged</span>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => removeLocalLab(i)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="order-lab-btn"
                      disabled={busy || !labs.length}
                      onClick={handleOrderLabs}
                    >
                      Order labs
                    </button>
                  </div>

                  <div className="card">
                    <h4>Prescription</h4>
                    <p className="card-hint">
                      Enter drug, dosage, and frequency. Use Prescribe to send one
                      line to pharmacy now, or Add to stage for batch save.
                    </p>

                    <div className="rx-input-grid">
                      <input
                        placeholder="Drug name"
                        value={drugInput}
                        onChange={(e) => setDrugInput(e.target.value)}
                      />
                      <input
                        placeholder="Dosage"
                        value={rxDosageInput}
                        onChange={(e) => setRxDosageInput(e.target.value)}
                      />
                      <button type="button" onClick={addStagedPrescription}>
                        Add
                      </button>
                    </div>

                    {rxAllergyHit && (
                      <p className="warning">⚠️ Patient Allergy Detected!</p>
                    )}

                    <ul className="order-list">
                      {(selected.prescriptions || []).map((p) => (
                        <li key={p.id} className="order-row rx-order-row">
                          <span className="order-label">
                            <span className="rx-drug-line">{p.drug_name}</span>
                            <span className="rx-meta">
                              {p.dosage || "—"}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => deleteServerRx(p.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                      {localPrescriptions.map((p, i) => (
                        <li key={p.key} className="order-row rx-order-row">
                          <span className="order-label">
                            <span className="rx-drug-line">{p.drug_name}</span>
                            <span className="rx-meta">
                              {p.dosage}
                            </span>
                          </span>
                          <span className="lab-tag lab-tag-staged">Staged</span>
                          <button
                            type="button"
                            className="prescribe-rx-btn"
                            disabled={busy}
                            onClick={() => handlePrescribeOne(p)}
                          >
                            Prescribe
                          </button>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => removeLocalRx(i)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="card">
                    <h4>Nurse Tasks</h4>

                    <div className="input-row">
                      <input
                        placeholder="Enter task"
                        value={taskInput}
                        onChange={(e) => setTaskInput(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (taskInput.trim()) {
                            setLocalTasks((t) => [...t, taskInput.trim()]);
                            setTaskInput("");
                          }
                        }}
                      >
                        Add Task
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginTop: "10px", marginBottom: "15px" }}>
                      {(selected.nurse_observations || []).some(o => o.commit_type === "NOTES") && (
                        <button
                          type="button"
                          className="view-nurse-data-btn"
                          onClick={() => openNurseModal(selected.id, "NOTES")}
                        >
                          View Observation Notes
                          {(selected.nurse_observations || []).some(o => o.commit_type === "NOTES" && !o.doctor_seen) && (
                            <span className="nurse-unread-dot"></span>
                          )}
                        </button>
                      )}
                      {(selected.nurse_observations || []).some(o => o.commit_type === "VITALS") && (
                        <button
                          type="button"
                          className="view-nurse-data-btn"
                          onClick={() => openNurseModal(selected.id, "VITALS")}
                        >
                          View Vitals Snapshots
                          {(selected.nurse_observations || []).some(o => o.commit_type === "VITALS" && !o.doctor_seen) && (
                            <span className="nurse-unread-dot"></span>
                          )}
                        </button>
                      )}
                    </div>

                    <ul className="order-list">
                      {(selected.nurse_tasks || []).map((t) => (
                        <li key={t.id} className="order-row nurse-row">
                          <span className={nurseStatusClass(t.status)}>
                            {t.status === "DONE" ? "✓" : "●"}
                          </span>
                          <span className="order-label">{t.task_description}</span>
                          <span className={`nurse-tag nurse-tag-${t.status}`}>
                            {t.status === "DONE"
                              ? "Done"
                              : t.status === "IN_PROGRESS"
                                ? "In progress"
                                : "Pending"}
                          </span>
                          {t.status === "PENDING" && (
                            <button
                              type="button"
                              className="remove-btn"
                              onClick={() => deleteServerTask(t.id)}
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      ))}
                      {localTasks.map((t, i) => (
                        <li key={`local-task-${i}`} className="order-row nurse-row">
                          <span className="nurse-status nurse-pending">
                            <span className="nurse-blink">●</span>
                          </span>
                          <span className="order-label">{t}</span>
                          <span className="nurse-tag nurse-tag-PENDING">Staged</span>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => removeLocalTask(i)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="order-nurse-btn"
                      disabled={busy || !localTasks.length}
                      onClick={handleOrderNurses}
                    >
                      Order nurses
                    </button>

                    <div style={{ marginTop: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "14px", color: "#4b5563", fontWeight: 500 }}>Assign to:</span>
                      {(() => {
                        const existingAssigned = (selected.nurse_tasks || []).find(t => t.assigned_nurse);
                        if (existingAssigned) {
                          return (
                            <span className="nurse-assigned-badge">
                              Auto-assigned to: {existingAssigned.assigned_nurse.name}
                            </span>
                          );
                        }
                        return (
                          <select
                            value={assignedNurseInput}
                            onChange={(e) => setAssignedNurseInput(e.target.value)}
                            style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5e1", flex: 1 }}
                          >
                            <option value="">Any Nurse</option>
                            {availableNurses.map((nurse) => (
                              <option key={nurse.id} value={nurse.id}>
                                {nurse.name} ({nurse.queue_count} tasks)
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {labNotifications.length > 0 && !historyPatientId && (
          <div className="doctor-lab-toast-stack" aria-live="polite">
            {labNotifications.map((n) => (
              <div
                key={n.id}
                className="doctor-lab-toast custom-alert urgent"
                role="button"
                tabIndex={0}
                onClick={() => openLabResultModal(n.visit_id)}
                onKeyDown={(e) =>
                  e.key === "Enter" && openLabResultModal(n.visit_id)
                }
              >
                <div className="doctor-lab-toast-body">
                  <strong>New lab result</strong>
                  <span>
                    {n.patient_name} — {n.test_name}
                  </span>
                </div>
                <button
                  type="button"
                  className="doctor-lab-toast-close"
                  aria-label="Dismiss notification"
                  onClick={(e) => dismissLabToast(n.id, e)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {nurseNotifications.length > 0 && !historyPatientId && (
          <div className="doctor-lab-toast-stack nurse-toast-stack" aria-live="polite">
            {nurseNotifications.map((n) => (
              <div
                key={n.id}
                className="doctor-lab-toast custom-alert nurse-alert"
                role="button"
                tabIndex={0}
                onClick={() => openNurseModal(n.visit_id, n.commit_type)}
                onKeyDown={(e) =>
                  e.key === "Enter" && openNurseModal(n.visit_id, n.commit_type)
                }
              >
                <div className="doctor-lab-toast-body">
                  <strong>Nurse Data ({n.commit_type === "NOTES" ? "Notes" : "Vitals"})</strong>
                  <span>
                    {n.patient_name} — from {n.nurse_name}
                  </span>
                </div>
                <button
                  type="button"
                  className="doctor-lab-toast-close"
                  aria-label="Dismiss notification"
                  onClick={(e) => dismissNurseToast(n.id, e)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {labModal && !historyPatientId && (
          <div
            className="doctor-lab-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lab-result-title"
          >
            <div className="doctor-lab-backdrop" onClick={closeLabResultModal} />
            <div className="doctor-lab-modal">
              <div className="doctor-lab-modal-header">
                <h2 id="lab-result-title">
                  Lab results — {labModal.visit.patient_name}
                </h2>
                <button
                  type="button"
                  className="doctor-lab-modal-x"
                  aria-label="Close"
                  onClick={closeLabResultModal}
                >
                  ×
                </button>
              </div>
              <div className="doctor-lab-modal-body">
                {labModal.orders.map((lo) => {
                  let parsed = {};
                  try {
                    parsed = lo.result ? JSON.parse(lo.result) : {};
                  } catch {
                    parsed = { Raw: lo.result };
                  }
                  const entries = Object.entries(parsed);
                  return (
                    <div key={lo.id} className="doctor-lab-result-block">
                      <h4>{lo.test_name}</h4>
                      {entries.length === 0 ? (
                        <p className="doctor-lab-empty">No structured values.</p>
                      ) : (
                        <table className="doctor-lab-mini-table">
                          <thead>
                            <tr>
                              <th>Parameter</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map(([k, v]) => (
                              <tr key={k}>
                                <td>{k}</td>
                                <td>{String(v)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


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

        {nurseModal && !historyPatientId && (
          <div
            className="doctor-lab-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nurse-modal-title"
          >
            <div className="doctor-lab-backdrop" onClick={closeNurseModal} />
            <div className="doctor-lab-modal">
              <div className="doctor-lab-modal-header" style={{ background: "#f0fdf4", borderBottomColor: "#bbf7d0" }}>
                <h2 id="nurse-modal-title" style={{ color: "#166534" }}>
                  Nurse {nurseModal.type === "NOTES" ? "Notes" : "Vitals"} — {nurseModal.visit.patient_name}
                </h2>
                <button
                  type="button"
                  className="doctor-lab-modal-x"
                  onClick={closeNurseModal}
                >
                  ×
                </button>
              </div>
              <div className="doctor-lab-modal-body">
                {nurseModal.observations.map((obs) => (
                  <div key={obs.id} className="doctor-lab-result-block">
                    <h4 style={{ color: "#15803d" }}>
                      Committed by {obs.nurse_name} at {new Date(obs.committed_at).toLocaleTimeString()}
                    </h4>
                    {nurseModal.type === "NOTES" && (
                      <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", whiteSpace: "pre-wrap", fontSize: "14px" }}>
                        {obs.observation_notes}
                      </div>
                    )}
                    {nurseModal.type === "VITALS" && obs.vitals_snapshot && (
                      <table className="doctor-lab-mini-table">
                        <thead>
                          <tr>
                            <th>Vital Sign</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {obs.vitals_snapshot.pulse && (
                            <tr><td>Pulse</td><td>{obs.vitals_snapshot.pulse} bpm</td></tr>
                          )}
                          {obs.vitals_snapshot.blood_pressure && (
                            <tr><td>Blood Pressure</td><td>{obs.vitals_snapshot.blood_pressure}</td></tr>
                          )}
                          {obs.vitals_snapshot.temperature && (
                            <tr><td>Temperature</td><td>{obs.vitals_snapshot.temperature} °C</td></tr>
                          )}
                          {obs.vitals_snapshot.respiratory_rate && (
                            <tr><td>Resp Rate</td><td>{obs.vitals_snapshot.respiratory_rate}</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

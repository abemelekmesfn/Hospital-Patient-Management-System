import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Styles/doctor.css";
import API from "../api/axios";
import TopNav from "../components/TopNav";

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

  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [labs, setLabs] = useState([]);
  const [localPrescriptions, setLocalPrescriptions] = useState([]);
  const [localTasks, setLocalTasks] = useState([]);

  const [drugInput, setDrugInput] = useState("");
  const [rxDosageInput, setRxDosageInput] = useState("");
  const [rxFreqInput, setRxFreqInput] = useState("");
  const [rxDurInput, setRxDurInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [labInput, setLabInput] = useState("");

  const [busy, setBusy] = useState(false);

  const [labNotifications, setLabNotifications] = useState([]);
  const [labModal, setLabModal] = useState(null);

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

  useEffect(() => {
    void fetchLabNotifications();
    const t = setInterval(() => void fetchLabNotifications(), 5000);
    return () => clearInterval(t);
  }, [fetchLabNotifications]);

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
      setNotes(data.consultation?.physical_exam ?? "");
      setDiagnosis(data.consultation?.diagnosis ?? "");
      await fetchQueue();
    } catch (err) {
      console.error(err);
      alert("Could not open this visit.");
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
      descriptions.map((task) =>
        API.post("/doctor/nurse-task/", {
          visit_id: visitId,
          task_description: task,
        })
      )
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
    const drug = drugInput.trim();
    if (!drug) return;
    setLocalPrescriptions((p) => [
      ...p,
      {
        key: crypto.randomUUID(),
        drug_name: drug,
        dosage: rxDosageInput.trim() || "-",
        frequency: rxFreqInput.trim() || "-",
        duration: rxDurInput.trim() || "-",
      },
    ]);
    setDrugInput("");
    setRxDosageInput("");
    setRxFreqInput("");
    setRxDurInput("");
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
      alert("Encounter saved (draft).");
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
      setRxFreqInput("");
      setRxDurInput("");
      setTaskInput("");
      await fetchQueue();
      alert("Visit completed and removed from your queue.");
    } catch (err) {
      console.error(err);
      alert("Error completing visit.");
    } finally {
      setBusy(false);
    }
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
      <TopNav title="Doctor" />
      <div className="hpms-shell-content">
    <div className="doctor-container">
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
            className={`queue-card ${visit.priority} ${
              selected?.id === visit.id ? "active" : ""
            }`}
            onClick={() => handleSelect(visit.id)}
          >
            <div className="queue-top">
              <h4 className="queue-name">{visit.name}</h4>
              {visit.status === "IN_CONSULTATION" && (
                <span className="queue-tag queue-tag-draft">
                  incomplete diagnosis
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
            className={`patient-card ${
              selected.triage_priority || selected.priority
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
                  {["Malaria", "Pneumonia", "Typhoid", "Hypertension"]
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
            </div>
            <p className="hint-text">
              Save draft keeps the patient on your list for follow-up, labs, or
              ongoing care. Completed finishes your work and removes them from
              the doctor queue.
            </p>
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
                    {lo.status === "COMPLETED" && lo.result && (
                      <button
                        type="button"
                        className={
                          lo.doctor_lab_result_modal_seen
                            ? "lab-result-btn"
                            : "lab-result-btn lab-result-btn-unread"
                        }
                        onClick={() => openLabResultModal(selected.id)}
                      >
                        Results
                      </button>
                    )}
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
                <input
                  placeholder="Frequency"
                  value={rxFreqInput}
                  onChange={(e) => setRxFreqInput(e.target.value)}
                />
                <input
                  placeholder="Duration (optional)"
                  value={rxDurInput}
                  onChange={(e) => setRxDurInput(e.target.value)}
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
                        {p.dosage || "—"} · {p.frequency || "—"}
                        {p.duration && p.duration !== "-" ? ` · ${p.duration}` : ""}
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
                        {p.dosage} · {p.frequency}
                        {p.duration && p.duration !== "-" ? ` · ${p.duration}` : ""}
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
            </div>
          </>
        )}
      </div>
    </div>
      </div>

      {labNotifications.length > 0 && (
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

      {labModal && (
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
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Styles/doctor.css";
import API from "../api/axios";

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
  const [taskInput, setTaskInput] = useState("");
  const [labInput, setLabInput] = useState("");

  const [busy, setBusy] = useState(false);

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

  const refreshVisit = async (visitId) => {
    const res = await API.get(`/doctor/visit/${visitId}/`);
    setSelected(res.data);
    return res.data;
  };

  const handleSelect = async (id) => {
    try {
      await API.post(`/doctor/claim_patient/${id}/`);
      const data = await refreshVisit(id);
      setLabs([]);
      setLocalPrescriptions([]);
      setLocalTasks([]);
      setLabInput("");
      setDrugInput("");
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

  const postPrescriptions = async (visitId, drugs) => {
    await Promise.all(
      drugs.map((drug) =>
        API.post("/doctor/prescription/", {
          visit_id: visitId,
          drug_name: drug,
          dosage: "-",
          frequency: "-",
          duration: "-",
        })
      )
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

  const nurseStatusClass = (st) => {
    if (st === "DONE") return "nurse-status nurse-done";
    return "nurse-status nurse-pending";
  };

  return (
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

              <div className="input-row">
                <input
                  placeholder="Drug name"
                  value={drugInput}
                  onChange={(e) => setDrugInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (drugInput.trim()) {
                      setLocalPrescriptions((p) => [...p, drugInput.trim()]);
                      setDrugInput("");
                    }
                  }}
                >
                  Add
                </button>
              </div>

              {selected.allergies &&
                drugInput
                  .toLowerCase()
                  .includes(selected.allergies.toLowerCase()) && (
                  <p className="warning">⚠️ Patient Allergy Detected!</p>
                )}

              <ul className="order-list">
                {(selected.prescriptions || []).map((p) => (
                  <li key={p.id} className="order-row">
                    <span className="order-label">{p.drug_name}</span>
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
                  <li key={`local-rx-${i}`} className="order-row">
                    <span className="order-label">{p}</span>
                    <span className="lab-tag lab-tag-staged">Staged</span>
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}

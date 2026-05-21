import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import TopNav from "../components/TopNav";
import NavPatientSearch from "../components/NavPatientSearch";
import PatientHistoryView from "../components/PatientHistoryView";
import "./Styles/nurse.css";

function priorityClass(p) {
  return p && ["LOW", "MEDIUM", "URGENT", "CRITICAL"].includes(p) ? p : "";
}

export default function Nurse() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [selectedPatientTasks, setSelectedPatientTasks] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [note, setNote] = useState("");

  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitalsBusy, setVitalsBusy] = useState(false);
  const [vPulse, setVPulse] = useState("");
  const [vBP, setVBP] = useState("");
  const [vTemp, setVTemp] = useState("");
  const [vRR, setVRR] = useState("");
  const [vitalsVisitId, setVitalsVisitId] = useState(null);
  const [historyPatientId, setHistoryPatientId] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await API.get("/nurse/queue/");
      const list = Array.isArray(res.data) ? res.data : [];
      setTasks(list);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access")) {
      navigate("/", { replace: true });
      return;
    }
    const raw = localStorage.getItem("hpms_user");
    if (raw) {
      try {
        const role = JSON.parse(raw)?.role?.toLowerCase();
        if (role && role !== "nurse") {
          navigate("/", { replace: true });
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const initial = setTimeout(() => void fetchTasks(), 0);
    const t = setInterval(() => void fetchTasks(), 4000);
    return () => {
      clearTimeout(initial);
      clearInterval(t);
    };
  }, [fetchTasks, navigate]);

  useEffect(() => {
    if (!selectedPatient) {
      setSelectedPatientTasks([]);
      return;
    }
    const list = tasks.filter((task) => task.patient_name === selectedPatient);
    setSelectedPatientTasks(list);
  }, [tasks, selectedPatient]);

  const grouped = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (!acc[task.patient_name]) acc[task.patient_name] = [];
      acc[task.patient_name].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const selectedVisitIdFromTasks = selectedPatientTasks[0]?.visit_id ?? null;

  const handleSelectPatient = (name) => {
    setSelectedPatient(name);
    setSelectedPatientTasks(grouped[name] || []);
  };

  const updateStatus = async (id, status) => {
    await API.post(`/nurse/update/${id}/`, { status });
    await fetchTasks();
  };

  const statusLabel = (status) => {
    if (status === "DONE") return "Done";
    if (status === "IN_PROGRESS") return "In progress";
    return "Pending";
  };

  const openVitalsModal = async () => {
    const vid = selectedVisitIdFromTasks;
    if (!vid) return;
    setVitalsVisitId(vid);
    setVitalsOpen(true);
    try {
      const res = await API.get(`/nurse/visit/${vid}/vitals/`);
      const d = res.data || {};
      setVPulse(d.pulse != null ? String(d.pulse) : "");
      setVRR(d.respiratory_rate != null ? String(d.respiratory_rate) : "");
      setVBP(d.blood_pressure != null ? String(d.blood_pressure) : "");
      setVTemp(d.temperature != null ? String(d.temperature) : "");
    } catch (err) {
      console.error(err);
      setVPulse("");
      setVRR("");
      setVBP("");
      setVTemp("");
    }
  };

  const closeVitalsModal = () => {
    setVitalsOpen(false);
    setVitalsVisitId(null);
  };

  const submitVitals = async () => {
    if (!vitalsVisitId) return;
    const body = {};
    if (vPulse.trim() !== "") body.pulse = vPulse.trim();
    if (vBP.trim() !== "") body.blood_pressure = vBP.trim();
    if (vTemp.trim() !== "") body.temperature = vTemp.trim();
    if (vRR.trim() !== "") body.respiratory_rate = vRR.trim();
    if (Object.keys(body).length === 0) {
      alert("Enter at least one vital to save.");
      return;
    }
    setVitalsBusy(true);
    try {
      await API.patch(`/nurse/visit/${vitalsVisitId}/vitals/`, body);
      closeVitalsModal();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.detail ||
          "Could not save vitals. Check values and try again."
      );
    } finally {
      setVitalsBusy(false);
    }
  };

  return (
    <div className="hpms-shell">
      <TopNav
        title="Nurse"
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
        <div className="nurse-container">
          <div className="nurse-left">
            <h3>Work queue</h3>
            {!Object.keys(grouped).length ? (
              <p className="nurse-queue-empty">No pending nurse tasks.</p>
            ) : (
              Object.keys(grouped).map((patient) => (
                <div
                  key={patient}
                  className={`queue-card ${priorityClass(
                    grouped[patient]?.[0]?.priority
                  )} ${selectedPatient === patient ? "active" : ""}`}
                  onClick={() => handleSelectPatient(patient)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSelectPatient(patient);
                  }}
                >
                  <h4>{patient}</h4>
                  <div className="nurse-queue-meta">
                    <span>
                      {
                        grouped[patient].filter((task) => task.status !== "DONE")
                          .length
                      }{" "}
                      active
                    </span>
                    <span>
                      {
                        grouped[patient].filter((task) => task.status === "DONE")
                          .length
                      }{" "}
                      done
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="nurse-right">
            {!selectedPatient ? (
              <p className="nurse-placeholder">
                Select a patient from your queue.
              </p>
            ) : (
              <>
                <h2>{selectedPatient}</h2>

                <div className="task-list">
                  {selectedPatientTasks.map((task) => (
                    <div key={task.id} className="task-item">
                      <div>
                        <strong>{task.task_description}</strong>
                        <p>Status: {statusLabel(task.status)}</p>
                      </div>

                      <div className="task-actions">
                        <button
                          type="button"
                          disabled={task.status === "IN_PROGRESS"}
                          onClick={() => updateStatus(task.id, "IN_PROGRESS")}
                        >
                          Start
                        </button>

                        <button
                          type="button"
                          disabled={task.status === "DONE"}
                          onClick={() => updateStatus(task.id, "DONE")}
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="notes-section nurse-notes">
                  <h4>Observation notes</h4>
                  <textarea
                    placeholder="Write observation notes..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <div className="vitals-record-wrap">
                  <button
                    type="button"
                    className="vitals-btn"
                    disabled={!selectedVisitIdFromTasks}
                    onClick={() => void openVitalsModal()}
                  >
                    + Record vitals
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        )}

        {vitalsOpen && !historyPatientId && (
          <div className="nurse-vitals-overlay" role="dialog" aria-modal="true">
            <div
              className="nurse-vitals-backdrop"
              aria-hidden="true"
              onClick={() => !vitalsBusy && closeVitalsModal()}
            />
            <div className="nurse-vitals-modal">
              <div className="nurse-vitals-head">
                <h3>Record vitals</h3>
                <button
                  type="button"
                  className="nurse-vitals-x"
                  disabled={vitalsBusy}
                  onClick={closeVitalsModal}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="nurse-vitals-body">
                <label>
                  Pulse (bpm)
                  <input
                    type="number"
                    inputMode="numeric"
                    value={vPulse}
                    onChange={(e) => setVPulse(e.target.value)}
                  />
                </label>
                <label>
                  Blood pressure
                  <input
                    placeholder="120/80"
                    value={vBP}
                    onChange={(e) => setVBP(e.target.value)}
                  />
                </label>
                <label>
                  Temperature (°C)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={vTemp}
                    onChange={(e) => setVTemp(e.target.value)}
                  />
                </label>
                <label>
                  Respiratory rate
                  <input
                    type="number"
                    inputMode="numeric"
                    value={vRR}
                    onChange={(e) => setVRR(e.target.value)}
                  />
                </label>
              </div>
              <div className="nurse-vitals-actions">
                <button
                  type="button"
                  className="nurse-vitals-cancel"
                  disabled={vitalsBusy}
                  onClick={closeVitalsModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="nurse-vitals-submit"
                  disabled={vitalsBusy}
                  onClick={() => void submitVitals()}
                >
                  {vitalsBusy ? "Saving…" : "Save vitals"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

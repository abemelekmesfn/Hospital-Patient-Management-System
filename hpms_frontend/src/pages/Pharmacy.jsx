import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import TopNav from "../components/TopNav";
import "./Styles/pharmacy.css";

function groupByVisit(queue) {
  const map = new Map();
  for (const row of queue) {
    const vid = row.visit_id;
    if (!map.has(vid)) {
      map.set(vid, {
        visit_id: vid,
        patient_name: row.patient_name,
        priority: row.priority,
        rows: [],
      });
    }
    map.get(vid).rows.push(row);
  }
  return [...map.values()].sort((a, b) => a.visit_id - b.visit_id);
}

export default function Pharmacy() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [queueError, setQueueError] = useState(null);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [checked, setChecked] = useState({});
  const [rxEdits, setRxEdits] = useState({});
  const [savingRxId, setSavingRxId] = useState(null);

  const fetchQueue = useCallback(async () => {
    if (!localStorage.getItem("access")) {
      setQueueError("Not signed in.");
      setQueue([]);
      return;
    }
    try {
      const res = await API.get("/pharmacy/queue/");
      setQueueError(null);
      setQueue(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 401) {
        setQueueError("Session expired. Please log in again.");
        setQueue([]);
      } else {
        setQueueError(
          err.response?.data?.detail ||
            "Could not load the pharmacy queue. Is the server running?"
        );
      }
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
        if (role && role !== "pharmacist") {
          navigate("/", { replace: true });
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const t0 = setTimeout(() => void fetchQueue(), 0);
    const t = setInterval(() => void fetchQueue(), 4000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [fetchQueue, navigate]);

  const visitGroups = useMemo(() => groupByVisit(queue), [queue]);

  const selectedGroup = visitGroups.find((g) => g.visit_id === selectedVisitId);

  useEffect(() => {
    setChecked({});
    setRxEdits({});
    setSavingRxId(null);
  }, [selectedVisitId]);

  useEffect(() => {
    if (!selectedGroup) return;
    setRxEdits((prev) => {
      const merged = { ...prev };
      for (const r of selectedGroup.rows) {
        if (merged[r.id] === undefined) {
          merged[r.id] = {
            dosage: r.dosage && r.dosage !== "—" ? String(r.dosage) : "",
            frequency:
              r.frequency && r.frequency !== "—" ? String(r.frequency) : "",
          };
        }
      }
      Object.keys(merged).forEach((idKey) => {
        if (
          !selectedGroup.rows.some((row) => String(row.id) === String(idKey))
        ) {
          delete merged[idKey];
        }
      });
      return merged;
    });
  }, [selectedGroup]);

  const toggleDrug = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFinalize = async () => {
    const ids = Object.keys(checked).filter((id) => checked[id]);
    if (!ids.length) return;
    try {
      for (const id of ids) {
        await API.post(`/pharmacy/dispense/${id}/`);
      }
      setSelectedVisitId(null);
      setChecked({});
      await fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const priorityClass = (p) =>
    p && ["LOW", "MEDIUM", "URGENT", "CRITICAL"].includes(p) ? p : "";

  const updateRxEdit = (id, field, value) => {
    setRxEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveRxEdits = async (id) => {
    const vals = rxEdits[id];
    if (!vals) return;
    setSavingRxId(id);
    try {
      await API.patch(`/pharmacy/prescription/${id}/`, {
        dosage: vals.dosage,
        frequency: vals.frequency,
      });
      await fetchQueue();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.detail ||
          "Could not save changes. Ensure dosage and frequency are filled."
      );
    } finally {
      setSavingRxId(null);
    }
  };

  return (
    <div className="hpms-shell">
      <TopNav title="Pharmacy" />
      <div className="hpms-shell-content">
        <div className="pharmacy-container">
          <div className="pharmacy-left">
            <h3>Prescription queue</h3>
            {queueError && (
              <div className="pharmacy-queue-error" role="alert">
                {queueError}
              </div>
            )}
            {!queueError && visitGroups.length === 0 && (
              <p className="pharmacy-queue-empty">No pending prescriptions.</p>
            )}
            {visitGroups.map((g) => (
              <div
                key={g.visit_id}
                className={`queue-card ${priorityClass(g.priority)} ${
                  selectedVisitId === g.visit_id ? "active" : ""
                }`}
                onClick={() => setSelectedVisitId(g.visit_id)}
              >
                <h4>{g.patient_name}</h4>
                <p className="queue-card-meta">
                  {g.rows.length} medication{g.rows.length === 1 ? "" : "s"}
                </p>
                <span className="status new">Pending</span>
              </div>
            ))}
          </div>

          <div className="pharmacy-right">
            {!selectedGroup ? (
              <p>Select a patient</p>
            ) : (
              <>
                <div className="dispense-header">
                  <h2>{selectedGroup.patient_name}</h2>
                </div>

                <table className="dispense-table">
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Dispense</th>
                      <th>Save edits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGroup.rows.map((drug) => {
                      const edits = rxEdits[drug.id] ?? {
                        dosage: drug.dosage ?? "",
                        frequency: drug.frequency ?? "",
                      };
                      const busyRx = savingRxId === drug.id;
                      return (
                        <tr key={drug.id}>
                          <td>{drug.drug_name}</td>
                          <td>
                            <input
                              type="text"
                              className="pharm-cell-input"
                              value={edits.dosage}
                              onChange={(e) =>
                                updateRxEdit(drug.id, "dosage", e.target.value)
                              }
                              aria-label={`Dosage for ${drug.drug_name}`}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="pharm-cell-input"
                              value={edits.frequency}
                              onChange={(e) =>
                                updateRxEdit(
                                  drug.id,
                                  "frequency",
                                  e.target.value
                                )
                              }
                              aria-label={`Frequency for ${drug.drug_name}`}
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={checked[drug.id] || false}
                              onChange={() => toggleDrug(drug.id)}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rx-save-inline"
                              disabled={busyRx}
                              onClick={() => void saveRxEdits(drug.id)}
                            >
                              {busyRx ? "…" : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <button
                  type="button"
                  className="finalize-btn"
                  onClick={handleFinalize}
                >
                  Finalize dispensing
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

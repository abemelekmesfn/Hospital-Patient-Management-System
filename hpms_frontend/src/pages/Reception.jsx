import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import "./Styles/reception.css";

function splitDisplayName(full) {
  const t = (full || "").trim();
  if (!t) return { first_name: "", last_name: "" };
  const parts = t.split(/\s+/);
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}


function namesFromVisitDetail(data) {
  const triageName = (data.triage_patient_name || "").trim();
  if (triageName) {
    return splitDisplayName(triageName);
  }
  const p = data.patient || {};
  const fn = (p.first_name || "").trim();
  const ln = (p.last_name || "").trim();
  const isQuickPlaceholder =
    fn === "Unknown" && (ln === "Male" || ln === "Female");
  if (isQuickPlaceholder || (!fn && !ln)) {
    return { first_name: "UNKNOWN", last_name: "" };
  }
  return { first_name: fn || "UNKNOWN", last_name: ln };
}

export default function Reception() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const toastDismissRef = useRef(null);

  const showToast = useCallback((message, variant = "info") => {
    if (toastDismissRef.current) {
      window.clearTimeout(toastDismissRef.current);
    }
    setToast({ message, variant });
    toastDismissRef.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access")) {
      navigate("/", { replace: true });
      return;
    }
    const fetchQueue = async () => {
      try {
        const res = await API.get("/reception/pending/");
        setQueue(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchQueue();
  }, [navigate]);

  const handleSelect = async (id) => {
    try {
      const res = await API.get(`/reception/visit/${id}/`);
      setSelected(res.data);
      const { first_name, last_name } = namesFromVisitDetail(res.data);
      setForm((prev) => ({
        ...prev,
        first_name,
        last_name,
      }));
    } catch (err) {
      console.error(err);
      showToast("Could not load patient details.", "error");
    }
  };

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    address: "",
    arrival_mode: "",
    kin_name: "",
    kin_phone: "",
    kin_relationship: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const isValid =
    Boolean(form.first_name?.trim()) &&
    Boolean(form.phone?.trim()) &&
    Boolean(form.arrival_mode);

  const handleFinalize = async () => {
    if (!isValid) {
      showToast("Please fill required fields (name, phone, arrival mode).", "error");
      return;
    }

    const arrivalModeBackend =
      form.arrival_mode === "AMBULANCE"
        ? "EMS"
        : form.arrival_mode === "PRIVATE"
          ? "PRIVATE"
          : form.arrival_mode === "WALKING"
            ? "TAXI"
            : "PRIVATE";

    try {
      await API.post("/reception/finalize/", {
        ...form,
        arrival_mode: arrivalModeBackend,
        triage_id: selected.triage_id,
      });

      showToast("Registration saved. Patient is queued for the doctor.", "success");

      setQueue((prev) => prev.filter((p) => p.id !== selected.id));

      setSelected(null);
      setForm({
        first_name: "",
        last_name: "",
        phone: "",
        date_of_birth: "",
        address: "",
        arrival_mode: "",
        kin_name: "",
        kin_phone: "",
        kin_relationship: "",
      });
    } catch (err) {
      console.error(err);
      showToast("Registration could not be completed. Try again.", "error");
    }
  };

  return (
    <div className="reception-container">
      {toast && (
        <div className={`reception-toast ${toast.variant}`} role="status">
          <span aria-hidden="true" className="reception-toast-icon">
            {toast.variant === "success" ? "✓" : toast.variant === "error" ? "!" : "i"}
          </span>
          <span>{toast.message}</span>
          <button
            type="button"
            className="reception-toast-close"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="triage-feed">
        <h3>Pending registration</h3>
        <p className="triage-feed-hint">Select a patient to open the form on the right.</p>

        {queue.length === 0 && (
          <p className="triage-feed-empty">No patients waiting.</p>
        )}

        {queue.map((patient) => {
          const isActive = selected?.id === patient.id;
          return (
            <div
              key={patient.id}
              role="button"
              tabIndex={0}
              className={`triage-card priority-${patient.priority || "unknown"} ${
                isActive ? "selected" : ""
              }`}
              onClick={() => handleSelect(patient.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(patient.id);
                }
              }}
            >
              <div className="triage-card-accent" aria-hidden="true" />
              <div className="triage-card-body">
                <h4>{patient.name}</h4>
                <p className="triage-card-complaint">{patient.chief_complaint}</p>
                {patient.priority && (
                  <span className="triage-card-pill">{patient.priority}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="reception-form">
        {!selected ? (
          <div className="reception-placeholder">
            <p>Select a patient from the list to begin registration.</p>
          </div>
        ) : (
          <>
            <h2>Patient registration</h2>

            <div className="form-group">
              <label>Triage category</label>
            </div>

            <div className="form-group">
              <label htmlFor="reg-first-name">
                First name
                <span className="label-hint">From triage when provided, or UNKNOWN</span>
              </label>
              <input
                id="reg-first-name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                autoComplete="given-name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-last-name">Last name</label>
              <input
                id="reg-last-name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                autoComplete="family-name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Phone</label>
              <input
                id="reg-phone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="09XXXXXXXX"
                inputMode="tel"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-dob">Date of birth</label>
              <input
                id="reg-dob"
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-address">Address</label>
              <input
                id="reg-address"
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Mode of arrival</label>

              <div className="arrival-tiles">
                {["AMBULANCE", "PRIVATE", "WALKING"].map((mode) => (
                  <div
                    key={mode}
                    role="button"
                    tabIndex={0}
                    className={`tile ${form.arrival_mode === mode ? "active" : ""}`}
                    onClick={() => setForm({ ...form, arrival_mode: mode })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setForm({ ...form, arrival_mode: mode });
                      }
                    }}
                  >
                    {mode}
                  </div>
                ))}
              </div>
            </div>

            <div className="kin-box">
              <h4>Next of kin</h4>

              <input
                name="kin_name"
                placeholder="Name"
                value={form.kin_name}
                onChange={handleChange}
              />

              <input
                name="kin_phone"
                placeholder="Phone"
                value={form.kin_phone}
                onChange={handleChange}
              />

              <select
                name="kin_relationship"
                value={form.kin_relationship}
                onChange={handleChange}
              >
                <option value="">Relationship</option>
                <option>Spouse</option>
                <option>Parent</option>
                <option>Sibling</option>
                <option>Other</option>
              </select>
            </div>

            <button
              type="button"
              className="finalize-btn"
              disabled={!isValid}
              onClick={handleFinalize}
            >
              Finalize & assign to doctor
            </button>
          </>
        )}
      </div>
    </div>
  );
}

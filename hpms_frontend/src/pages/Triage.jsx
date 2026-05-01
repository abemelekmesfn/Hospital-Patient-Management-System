import React, { useState } from "react";
import "./Styles/triage.css";
import API from "../api/axios";
import TopNav from "../components/TopNav";


const VITAL_RANGES = {
  pulse: "Normal: 60–100 bpm",
  bp: "Normal: ~90/60–120/80 mmHg",
  rr: "Normal: 12–20 breaths/min",
  spo2: "Normal: 95–100%",
  temp: "Normal: 36.1–37.2 °C",
};

const RESPIRATION = {
  NONE: "NONE",
  BRADY: "BRADY",
  NORMAL: "NORMAL",
  TACHY: "TACHY",
};

function parseBloodPressure(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  const m = String(raw).trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return null;
  const systolic = parseInt(m[1], 10);
  const diastolic = parseInt(m[2], 10);
  if (systolic <= 0 || diastolic <= 0) return null;
  return { systolic, diastolic };
}

function Triage() {
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [arrivalMode, setArrivalMode] = useState("");
  const [arrivalTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  });
  const [complaint, setComplaint] = useState("");

  const [vitals, setVitals] = useState({
    pulse: "",
    bp: "",
    rr: "",
    spo2: "",
    temp: "",
  });

  const handleVitalChange = (field, value) => {
    setVitals((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getVitalStatus = (type, value) => {
    if (value === "" || value == null) return { color: "", label: "" };

    switch (type) {
      case "pulse": {
        const n = parseFloat(value);
        if (Number.isNaN(n)) return { color: "", label: "" };
        if (n > 100) return { color: "red", label: "High (Tachycardia)" };
        if (n < 60) return { color: "orange", label: "Low (Bradycardia)" };
        return { color: "green", label: "Normal" };
      }

      case "temp": {
        const n = parseFloat(value);
        if (Number.isNaN(n)) return { color: "", label: "" };
        if (n > 38) return { color: "red", label: "High fever" };
        if (n > 37.2) return { color: "orange", label: "Elevated" };
        if (n < 36.1) return { color: "orange", label: "Low" };
        return { color: "green", label: "Normal" };
      }

      case "spo2": {
        const n = parseFloat(value);
        if (Number.isNaN(n)) return { color: "", label: "" };
        if (n < 90) return { color: "red", label: "Critical" };
        if (n < 95) return { color: "orange", label: "Low" };
        return { color: "green", label: "Normal" };
      }

      case "rr": {
        const n = parseFloat(value);
        if (Number.isNaN(n)) return { color: "", label: "" };
        if (n > 20) return { color: "red", label: "High (Tachypnea)" };
        if (n < 12) return { color: "orange", label: "Low (Bradypnea)" };
        return { color: "green", label: "Normal" };
      }

      case "bp": {
        const parsed = parseBloodPressure(value);
        if (!parsed) {
          return {
            color: "orange",
            label: "Use format systolic/diastolic (e.g. 120/80)",
          };
        }
        const { systolic: sys, diastolic: dia } = parsed;
        if (sys > 120 || dia > 80)
          return { color: "orange", label: "Elevated / high" };
        if (sys < 90 || dia < 60)
          return { color: "orange", label: "Low" };
        return { color: "green", label: "Normal" };
      }

      default:
        return { color: "", label: "" };
    }
  };

  const [start, setStart] = useState({
    canWalk: "",
    respiration: "",
  });

  const handleStartChange = (field, value) => {
    setStart((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "canWalk" && value === "YES") {
        if (
          prev.respiration &&
          prev.respiration !== RESPIRATION.NORMAL
        ) {
          next.respiration = RESPIRATION.NORMAL;
        }
      }

      if (field === "respiration") {
        if (value === RESPIRATION.NONE) {
          next.canWalk = "NO";
        } else if (
          value !== RESPIRATION.NORMAL &&
          prev.canWalk === "YES"
        ) {
          next.canWalk = "NO";
        }
      }

      return next;
    });
  };

  const getTriagePriority = () => {
    if (!start.canWalk || !start.respiration) return "";

    if (start.canWalk === "YES") {
      if (start.respiration !== RESPIRATION.NORMAL) return "";
      return "LOW";
    }

    if (start.respiration === RESPIRATION.NONE) return "CRITICAL";
    if (start.respiration === RESPIRATION.TACHY) return "URGENT";
    if (start.respiration === RESPIRATION.BRADY) return "URGENT";
    if (start.respiration === RESPIRATION.NORMAL) return "MEDIUM";

    return "";
  };

  const category = getTriagePriority();

  const walkYesDisabled =
    start.respiration === RESPIRATION.NONE ||
    start.respiration === RESPIRATION.TACHY ||
    start.respiration === RESPIRATION.BRADY;

  const respirationOptionDisabled = (key) => {
    if (start.canWalk !== "YES") return false;
    return key !== RESPIRATION.NORMAL;
  };

  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");

  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("");

  const playAlert = () => {
    setAlertMessage("🚨 IMMEDIATE PRIORITY - ALERT DOCTORS!");
    setAlertType("urgent");
    setTimeout(() => setAlertMessage(""), 5000);
  };

  const appendComplaintTag = (tag) => {
    setComplaint((prev) => {
      const parts = prev
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.includes(tag)) return prev;
      if (!prev.trim()) return tag;
      return `${prev.trim()}, ${tag}`;
    });
  };

  const handleSubmit = async () => {
    const nextCategory = getTriagePriority();

    if (!patientName || !nextCategory) {
      setAlertMessage("Please complete required fields");
      setAlertType("error");
      setTimeout(() => setAlertMessage(""), 3000);
      return;
    }

    try {
      let patientId = null;

      const searchResp = await API.get(
        `patients/search/?q=${encodeURIComponent(patientName)}`,
      );
      if (Array.isArray(searchResp.data) && searchResp.data.length > 0) {
        patientId = searchResp.data[0].id;
      } else {
        const sexCode =
          sex === "Male" ? "MALE" : sex === "Female" ? "FEMALE" : "MALE";
        const createResp = await API.post("patients/quick-add/", {
          sex: sexCode,
        });
        patientId = createResp.data.id;
      }

      const arrivalModeBackend =
        arrivalMode === "Ambulance"
          ? "EMS"
          : arrivalMode === "Private"
            ? "PRIVATE"
            : arrivalMode === "Walk-in"
              ? "TAXI"
              : "PRIVATE";

      const triageResp = await API.post("triage/create/", {
        patient_id: patientId,
        name: patientName,
        age,
        sex,
        arrival_mode: arrivalModeBackend,
        chief_complaint: complaint,
        pulse: vitals.pulse,
        blood_pressure: vitals.bp,
        respiratory_rate: vitals.rr,
        spo2: vitals.spo2,
        temperature: vitals.temp,
        priority: nextCategory,
        allergies,
        medications,
      });

      if (triageResp.status === 200) {
        if (nextCategory === "URGENT" || nextCategory === "CRITICAL") {
          playAlert();
        } else {
          setAlertMessage("Patient added to queue!");
          setAlertType("success");
          setTimeout(() => setAlertMessage(""), 3000);
        }

        setPatientName("");
        setAge("");
        setSex("");
        setArrivalMode("");
        setComplaint("");
        setVitals({
          pulse: "",
          bp: "",
          rr: "",
          spo2: "",
          temp: "",
        });
        setStart({ canWalk: "", respiration: "" });
        setAllergies("");
        setMedications("");
      } else {
        setAlertMessage(
          "Error submitting triage: " +
            (triageResp.data?.error || JSON.stringify(triageResp.data)),
        );
        setAlertType("error");
        setTimeout(() => setAlertMessage(""), 5000);
      }
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data ||
        error?.message ||
        "Error submitting triage";
      setAlertMessage("Error submitting triage: " + JSON.stringify(message));
      setAlertType("error");
      setTimeout(() => setAlertMessage(""), 5000);
    }
  };

  const respirationOptions = [
    { key: RESPIRATION.NONE, label: "Not breathing", severity: "critical" },
    { key: RESPIRATION.BRADY, label: "<12/min", severity: "warn" },
    { key: RESPIRATION.NORMAL, label: "12–20/min", severity: "ok" },
    { key: RESPIRATION.TACHY, label: ">20/min", severity: "warn" },
  ];

  const complaintQuickTags = [
    "Chest Pain",
    "High Fever",
    "Trauma",
    "Difficulty Breathing",
    "Abdominal Pain",
    "Altered Mental Status",
    "Bleeding",
    "Suspected Stroke",
  ];

  return (
    <div className="hpms-shell">
      <TopNav title="Triage" />
      <div className="hpms-shell-content">
    <div className="triage-container">
      {alertMessage && (
        <div className={`custom-alert ${alertType}`}>
          {alertMessage}
          <button type="button" onClick={() => setAlertMessage("")}>
            ×
          </button>
        </div>
      )}

      <div className="triage-header">
        <div className="header-row">
          <div className="field-group large">
            <input
              type="text"
              placeholder="Search or Enter Patient Name..."
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>

          <div className="field-group small">
            <input
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>

          <div className="field-group small">
            <div className="toggle-group">
              {["Male", "Female"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={sex === item ? "active" : ""}
                  onClick={() => setSex(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="header-row">
          <div className="field-group small">
            <input type="text" value={arrivalTime} readOnly />
          </div>

          <div className="field-group large">
            <div className="arrival-icons">
              {[
                { label: "Ambulance", icon: "🚑" },
                { label: "Private", icon: "🚗" },
                { label: "Walk-in", icon: "🚶" },
              ].map((mode) => (
                <button
                  key={mode.label}
                  type="button"
                  className={arrivalMode === mode.label ? "active" : ""}
                  onClick={() => setArrivalMode(mode.label)}
                >
                  {mode.icon} {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="header-row">
          <div className="field-group full">
            <textarea
              className="chief-complaint-field"
              rows={3}
              placeholder="Chief complaint..."
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
            />
            {complaint && (
              <small style={{ color: "#4caf50" }}>✔ Complaint recorded</small>
            )}

            <div className="quick-tags">
              {complaintQuickTags.map((tag) => (
                <span
                  key={tag}
                  role="button"
                  tabIndex={0}
                  onClick={() => appendComplaintTag(tag)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      appendComplaintTag(tag);
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="vitals-grid">
        {[
          { key: "pulse", label: "Pulse (bpm)", input: "number" },
          { key: "bp", label: "Blood Pressure (mmHg)", input: "text" },
          { key: "rr", label: "Respiratory rate (/min)", input: "number" },
          { key: "spo2", label: "SpO2 (%)", input: "number" },
          { key: "temp", label: "Temperature (°C)", input: "number" },
        ].map((vital) => {
          const status = getVitalStatus(vital.key, vitals[vital.key]);

          return (
            <div key={vital.key} className={`vital-card ${status.color}`}>
              <label>{vital.label}</label>
              <span className="normal-range">{VITAL_RANGES[vital.key]}</span>

              <input
                type={vital.input}
                inputMode={
                  vital.input === "text" ? "decimal" : "numeric"
                }
                value={vitals[vital.key]}
                onChange={(e) => handleVitalChange(vital.key, e.target.value)}
              />

              {status.label && (
                <small className="status-text">{status.label}</small>
              )}
            </div>
          );
        })}
      </div>

      <div className="start-section">
        <h3>S.T.A.R.T. Criteria</h3>

        <div className="start-group">
          <label>Ability to walk</label>
          <div className="segmented">
            {["YES", "NO"].map((option) => (
              <button
                key={option}
                type="button"
                className={start.canWalk === option ? "active" : ""}
                disabled={option === "YES" && walkYesDisabled}
                onClick={() => handleStartChange("canWalk", option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="start-group">
          <label>Respirations</label>
          <div className="segmented segmented-resp">
            {respirationOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                data-severity={opt.severity}
                className={start.respiration === opt.key ? "active" : ""}
                disabled={respirationOptionDisabled(opt.key)}
                onClick={() => handleStartChange("respiration", opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="triage-result">
        <h3>Triage category</h3>

        <div className={`category-box ${category}`}>
          {category || "category"}
        </div>
      </div>
      <div className="admin-section">
        <h3>Medical Notes</h3>

        <textarea
          placeholder="Allergies (⚠ Important)"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
        />

        <textarea
          placeholder="Current Medications"
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
        />
      </div>
      <button type="button" className="submit-btn" onClick={handleSubmit}>
        COMMIT TO QUEUE
      </button>
    </div>
      </div>
    </div>
  );
}

export default Triage;

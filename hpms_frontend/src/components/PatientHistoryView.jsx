import { useEffect, useState } from "react";
import API from "../api/axios";
import "./PatientHistoryView.css";

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function patientTitle(p, visits = []) {
  const dn = (p?.display_name || "").trim();
  if (dn) return dn;
  for (const v of visits) {
    const tn = (v?.triage?.triage_patient_name || "").trim();
    if (tn) return tn;
  }
  const full = `${p?.first_name || ""} ${p?.last_name || ""}`.trim();
  if (full && full !== "Unknown Male" && full !== "Unknown Female") return full;
  return p?.hospital_id || "Patient";
}

function priorityClass(p) {
  return p ? `ph-priority-${p}` : "";
}

export default function PatientHistoryView({ patientId, variant = "clinical", onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const path =
      variant === "admin"
        ? `patients/${patientId}/history/admin/`
        : `patients/${patientId}/history/`;

    API.get(path)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          const detail = err.response?.data;
          const msg =
            (typeof detail === "string" && detail) ||
            detail?.error ||
            detail?.detail ||
            (detail && JSON.stringify(detail)) ||
            "Could not load patient history.";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, variant]);

  if (loading) {
    return (
      <div className="ph-view ph-view-center">
        <p className="ph-loading">Loading patient history…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ph-view ph-view-center">
        <p className="ph-error">{error || "No data"}</p>
        {onBack && (
          <button type="button" className="ph-back-btn" onClick={onBack}>
            ← Back
          </button>
        )}
      </div>
    );
  }

  const { patient, visits = [] } = data;

  return (
    <div className="ph-view">
      <div className="ph-toolbar">
        {onBack && (
          <button type="button" className="ph-back-btn" onClick={onBack}>
            ← Back to workspace
          </button>
        )}
        <h2 className="ph-title">Patient history</h2>
      </div>

      <section className="ph-patient-card">
        <h3>{patientTitle(patient, visits)}</h3>
        <dl className="ph-details-grid">
          <div>
            <dt>Hospital ID</dt>
            <dd>{patient.hospital_id || "—"}</dd>
          </div>
          <div>
            <dt>Age</dt>
            <dd>{patient.age != null ? patient.age : "—"}</dd>
          </div>
          <div>
            <dt>Sex</dt>
            <dd>{patient.sex || "—"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{patient.phone || "—"}</dd>
          </div>
          <div>
            <dt>Date of birth</dt>
            <dd>{patient.date_of_birth || "—"}</dd>
          </div>
        </dl>
      </section>

      {!visits.length ? (
        <p className="ph-empty">No previous visits recorded for this patient.</p>
      ) : (
        <div className="ph-timeline">
          {visits.map((visit) => (
            <article key={visit.id} className="ph-visit-card">
              <header className="ph-visit-head">
                <div>
                  <h4>
                    Visit {visit.registration_number || `#${visit.id}`}
                  </h4>
                  <p className="ph-visit-meta">
                    {formatDateTime(visit.arrival_time)} · Status:{" "}
                    {visit.status}
                  </p>
                </div>
                {visit.doctor_name && (
                  <span className="ph-doctor-badge">
                    Dr. {visit.doctor_name}
                  </span>
                )}
              </header>

              {variant === "clinical" ? (
                <ClinicalVisitBody visit={visit} />
              ) : (
                <AdminVisitBody visit={visit} />
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ClinicalVisitBody({ visit }) {
  const triage = visit.triage;
  const consultation = visit.consultation;
  const reception = visit.reception || {};

  return (
    <>
      {triage && (
        <section className="ph-section">
          <h5>Triage</h5>
          <p>
            <span className={`ph-pill ${priorityClass(triage.priority)}`}>
              {triage.priority}
            </span>{" "}
            {formatDateTime(triage.recorded_at)}
          </p>
          <p>
            <strong>Chief complaint:</strong> {triage.chief_complaint || "—"}
          </p>
          <ul className="ph-vitals">
            <li>Temp: {triage.temperature ?? "—"} °C</li>
            <li>BP: {triage.blood_pressure || "—"}</li>
            <li>Pulse: {triage.pulse ?? "—"}</li>
            <li>RR: {triage.respiratory_rate ?? "—"}</li>
          </ul>
        </section>
      )}

      <section className="ph-section">
        <h5>Reception</h5>
        <p>
          Registration: {reception.registration_number || "—"} · Arrival:{" "}
          {reception.arrival_mode || "—"}
        </p>
        {(reception.kin_name || reception.kin_phone) && (
          <p>
            Next of kin: {reception.kin_name || "—"} ({reception.kin_relationship || "—"}) ·{" "}
            {reception.kin_phone || ""}
          </p>
        )}
      </section>

      {consultation && (
        <section className="ph-section">
          <h5>Examination</h5>
          <p>
            <strong>Examined by:</strong> {consultation.doctor_name || "—"} ·{" "}
            {formatDateTime(consultation.examined_at)}
          </p>
          <p>
            <strong>Diagnosis:</strong> {consultation.diagnosis || "—"}
          </p>
          <div className="ph-notes-block">
            <strong>Physical exam / notes</strong>
            <pre>{consultation.physical_exam || "—"}</pre>
          </div>
        </section>
      )}

      {visit.lab_orders?.length > 0 && (
        <section className="ph-section">
          <h5>Laboratory</h5>
          <ul className="ph-list">
            {visit.lab_orders.map((lo, i) => (
              <li key={i}>
                <strong>{lo.test_name}</strong> ({lo.status})
                {lo.result && (
                  <div className="ph-result">{lo.result}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {visit.prescriptions?.length > 0 && (
        <section className="ph-section">
          <h5>Prescriptions</h5>
          <ul className="ph-list">
            {visit.prescriptions.map((rx, i) => (
              <li key={i}>
                {rx.drug_name} — {rx.dosage}, {rx.frequency}, {rx.duration} (
                {rx.pharmacy_status})
              </li>
            ))}
          </ul>
        </section>
      )}

      {visit.nurse_tasks?.length > 0 && (
        <section className="ph-section">
          <h5>Nursing tasks</h5>
          <ul className="ph-list">
            {visit.nurse_tasks.map((t, i) => (
              <li key={i}>
                {t.task_description} — {t.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function AdminVisitBody({ visit }) {
  const reception = visit.reception || {};
  const invoice = visit.invoice;

  return (
    <>
      <section className="ph-section">
        <h5>Registration</h5>
        <p>
          {reception.registration_number || "—"} · {reception.arrival_mode || "—"} ·{" "}
          {formatDateTime(reception.arrival_time)}
        </p>
        {(reception.kin_name || reception.kin_phone) && (
          <p>
            Next of kin: {reception.kin_name} · {reception.kin_phone}
          </p>
        )}
      </section>

      {visit.doctor_name && (
        <section className="ph-section">
          <h5>Attending physician</h5>
          <p>{visit.doctor_name}</p>
        </section>
      )}

      {invoice ? (
        <section className="ph-section">
          <h5>Payment</h5>
          <p>
            Invoice #{invoice.id} · {invoice.status} · Total: ${invoice.total}
            {invoice.payment_method && ` · ${invoice.payment_method}`}
          </p>
          {invoice.items?.length > 0 && (
            <table className="ph-invoice-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Department</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.service_name}</td>
                    <td>{item.department}</td>
                    <td>${item.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className="ph-section ph-muted">
          <p>No billing record for this visit.</p>
        </section>
      )}
    </>
  );
}

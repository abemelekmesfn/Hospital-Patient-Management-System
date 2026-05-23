import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import TopNav from "../components/TopNav";
import ReceiptModal from "../components/ReceiptModal";
import "./Styles/cashier.css";

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash" },
  { id: "BANK_TRANSFER", label: "Bank transfer" },
  { id: "TELEBIRR", label: "Tele Birr" },
  { id: "INSURANCE", label: "Insurance" },
];

function formatEtb(value) {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

const STAGE_LABELS = {
  FRONT_DESK: "Registration & consultation",
  LAB: "Laboratory",
  DISCHARGE: "Discharge / emergency settlement",
};

export default function Cashier() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [visitDetail, setVisitDetail] = useState(null);
  const [selectedChargeIds, setSelectedChargeIds] = useState(new Set());
  const [receipt, setReceipt] = useState(null);
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, variant = "info") => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 4000);
  };

  const fetchQueue = useCallback(async () => {
    try {
      const res = await API.get("/billing/queue/");
      setQueue(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      showToast("Could not load billing queue.", "error");
    }
  }, []);

  const loadVisit = useCallback(async (visitId) => {
    try {
      const res = await API.get(`/billing/visit/${visitId}/charges/`);
      setVisitDetail(res.data);
      const pending = (res.data.charges || []).filter((c) => c.status === "PENDING");
      setSelectedChargeIds(new Set(pending.map((c) => c.id)));
    } catch (err) {
      console.error(err);
      showToast("Could not load charges.", "error");
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access")) {
      navigate("/", { replace: true });
      return;
    }
    void fetchQueue();
    const t = setInterval(() => void fetchQueue(), 5000);
    return () => clearInterval(t);
  }, [fetchQueue, navigate]);

  useEffect(() => {
    if (selectedVisitId) void loadVisit(selectedVisitId);
    else {
      setVisitDetail(null);
      setSelectedChargeIds(new Set());
    }
  }, [selectedVisitId, loadVisit]);

  const toggleCharge = (id) => {
    setSelectedChargeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const payCharges = async (chargeIds, method) => {
    if (!chargeIds.length) {
      showToast("Select at least one pending charge.", "error");
      return;
    }
    setPaying(true);
    try {
      const res = await API.post("/billing/pay/", {
        charge_ids: chargeIds,
        payment_method: method,
      });
      setReceipt(res.data.receipt);
      showToast("Payment recorded.", "success");
      await fetchQueue();
      if (selectedVisitId) await loadVisit(selectedVisitId);
    } catch (err) {
      showToast(err.response?.data?.detail || "Payment failed.", "error");
    } finally {
      setPaying(false);
    }
  };

  const payAllPending = async (method) => {
    if (!selectedVisitId) return;
    setPaying(true);
    try {
      const res = await API.post(`/billing/pay-visit/${selectedVisitId}/`, {
        payment_method: method,
      });
      setReceipt(res.data.receipt);
      showToast("All pending charges paid.", "success");
      await fetchQueue();
      await loadVisit(selectedVisitId);
    } catch (err) {
      showToast(err.response?.data?.detail || "Payment failed.", "error");
    } finally {
      setPaying(false);
    }
  };

  const pendingCharges = (visitDetail?.charges || []).filter((c) => c.status === "PENDING");
  const pendingTotal = pendingCharges.reduce(
    (s, c) => s + Number.parseFloat(c.patient_amount || 0),
    0
  );

  return (
    <div className="hpms-shell">
      <TopNav title="Cashier" />
      <div className="hpms-shell-content cashier-container">
        {toast && (
          <div className={`cashier-toast ${toast.variant}`} role="status">
            {toast.message}
          </div>
        )}

        <aside className="cashier-left">
          <h3>Billing queue</h3>
          <p className="cashier-hint">Patients with unpaid hospital services (ETB)</p>
          {queue.length === 0 && <p className="cashier-empty">No pending payments.</p>}
          {queue.map((row) => (
            <button
              key={row.visit_id}
              type="button"
              className={`billing-card ${selectedVisitId === row.visit_id ? "active" : ""}`}
              onClick={() => setSelectedVisitId(row.visit_id)}
            >
              <h4>{row.patient_name}</h4>
              <p className="billing-card-id">{row.hospital_id}</p>
              {row.registration_number && (
                <p className="billing-card-reg">{row.registration_number}</p>
              )}
              <div className="billing-card-footer">
                <span>{row.pending_count} item(s)</span>
                <strong>{formatEtb(row.pending_total_etb)}</strong>
              </div>
              {row.billing_deferred && (
                <span className="billing-badge emergency">Emergency — pay at discharge</span>
              )}
              {row.billing_exempt !== "NONE" && (
                <span className="billing-badge exempt">Exempt: {row.billing_exempt}</span>
              )}
            </button>
          ))}
        </aside>

        <main className="cashier-right">
          {!visitDetail ? (
            <p className="cashier-placeholder">Select a patient to view charges and collect payment.</p>
          ) : (
            <>
              <header className="cashier-detail-header">
                <div>
                  <h2>{visitDetail.patient_name}</h2>
                  <p>
                    {visitDetail.hospital_id}
                    {visitDetail.registration_number
                      ? ` · ${visitDetail.registration_number}`
                      : ""}
                  </p>
                  <p className="cashier-insurance">
                    Insurance: {visitDetail.insurance_type}
                    {visitDetail.insurance_type === "PARTIAL"
                      ? ` (${visitDetail.insurance_coverage_percent}%)`
                      : ""}
                    {visitDetail.billing_exempt !== "NONE"
                      ? ` · Exempt: ${visitDetail.billing_exempt}`
                      : ""}
                  </p>
                </div>
                <div className="cashier-pending-total">
                  <span>Pending</span>
                  <strong>{formatEtb(pendingTotal)}</strong>
                </div>
              </header>

              <div className="invoice-paper">
                <table className="cashier-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Service</th>
                      <th>Stage</th>
                      <th>Gross</th>
                      <th>Insurance</th>
                      <th>Patient pays</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visitDetail.charges || []).map((ch) => (
                      <tr key={ch.id} className={ch.status !== "PENDING" ? "paid-row" : ""}>
                        <td>
                          {ch.status === "PENDING" && (
                            <input
                              type="checkbox"
                              checked={selectedChargeIds.has(ch.id)}
                              onChange={() => toggleCharge(ch.id)}
                              aria-label={`Select ${ch.service_name}`}
                            />
                          )}
                        </td>
                        <td>{ch.service_name}</td>
                        <td>{STAGE_LABELS[ch.stage] || ch.stage}</td>
                        <td>{formatEtb(ch.gross_amount)}</td>
                        <td>{formatEtb(ch.insurance_amount)}</td>
                        <td>{formatEtb(ch.patient_amount)}</td>
                        <td>
                          <span className={`charge-status ${ch.status.toLowerCase()}`}>
                            {ch.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pendingCharges.length > 0 && (
                  <div className="payment-section">
                    <h4>Record payment (audit trail)</h4>
                    <div className="payment-buttons">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          disabled={paying}
                          onClick={() =>
                            payCharges([...selectedChargeIds], m.id)
                          }
                        >
                          Pay selected — {m.label}
                        </button>
                      ))}
                    </div>
                    <div className="payment-buttons payment-buttons-secondary">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={`all-${m.id}`}
                          type="button"
                          className="btn-outline"
                          disabled={paying}
                          onClick={() => payAllPending(m.id)}
                        >
                          Pay all pending — {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

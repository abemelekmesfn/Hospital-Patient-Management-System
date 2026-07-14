import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import TopNav from "../components/TopNav";
import NavPatientSearch from "../components/NavPatientSearch";
import PatientHistoryView from "../components/PatientHistoryView";
import ReceiptModal from "../components/ReceiptModal";
import PaymentFormModal from "../components/PaymentFormModal";
import "./Styles/cashier.css";

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
  const [historyPatientId, setHistoryPatientId] = useState(null);
  const [payModal, setPayModal] = useState(null); // { mode: "selected" | "all" }
  const [showMobileQueue, setShowMobileQueue] = useState(true);

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

  /* ── Payment with payer details ── */
  const handlePayConfirm = async (method, payerDetails) => {
    if (!payModal) return;
    setPaying(true);
    try {
      let res;
      if (payModal.mode === "all") {
        res = await API.post(`/billing/pay-visit/${selectedVisitId}/`, {
          payment_method: method,
          ...payerDetails,
        });
      } else {
        res = await API.post("/billing/pay/", {
          charge_ids: [...selectedChargeIds],
          payment_method: method,
          ...payerDetails,
        });
      }
      setReceipt(res.data.receipt);
      showToast("Payment recorded.", "success");
      setPayModal(null);
      await fetchQueue();
      if (selectedVisitId) await loadVisit(selectedVisitId);
    } catch (err) {
      showToast(err.response?.data?.detail || "Payment failed.", "error");
    } finally {
      setPaying(false);
    }
  };

  /* ── Total visit receipt ── */
  const fetchTotalReceipt = async () => {
    if (!selectedVisitId) return;
    try {
      const res = await API.get(`/billing/visit/${selectedVisitId}/total-receipt/`);
      setReceipt(res.data);
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Could not load total receipt.",
        "error"
      );
    }
  };

  const pendingCharges = (visitDetail?.charges || []).filter((c) => c.status === "PENDING");
  const paidCharges = (visitDetail?.charges || []).filter((c) => c.status === "PAID");
  const pendingTotal = pendingCharges.reduce(
    (s, c) => s + Number.parseFloat(c.patient_amount || 0),
    0
  );
  const selectedTotal = (visitDetail?.charges || [])
    .filter((c) => selectedChargeIds.has(c.id) && c.status === "PENDING")
    .reduce((s, c) => s + Number.parseFloat(c.patient_amount || 0), 0);

  return (
    <div className="hpms-shell">
      <TopNav
        title="Cashier"
        center={
          <NavPatientSearch
            onSelect={(p) => {
              setHistoryPatientId(p?.id ?? null);
              if (p) setShowMobileQueue(false);
            }}
          />
        }
      />
      <div className={`hpms-shell-content cashier-container ${showMobileQueue ? 'mobile-show-queue' : 'mobile-hide-queue'}`}>
        {toast && (
          <div className={`cashier-toast ${toast.variant}`} role="status">
            {toast.message}
          </div>
        )}

        {historyPatientId ? (
          <PatientHistoryView
            patientId={historyPatientId}
            variant="admin"
            onBack={() => {
              setHistoryPatientId(null);
              setShowMobileQueue(true);
            }}
          />
        ) : (
          <>
            <aside className="cashier-left">
              <h3>Billing queue</h3>
              <p className="cashier-hint">Patients with unpaid hospital services (ETB)</p>
              {queue.length === 0 && <p className="cashier-empty">No pending payments.</p>}
              {queue.map((row) => (
                <button
                  key={row.visit_id}
                  type="button"
                  className={`billing-card ${selectedVisitId === row.visit_id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedVisitId(row.visit_id);
                    setShowMobileQueue(false);
                  }}
                >
                  <h4>{row.patient_name}</h4>
                  <p className="billing-card-id">{row.hospital_id}</p>
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
                  <button
                    className="mobile-back-btn"
                    onClick={() => setShowMobileQueue(true)}
                  >
                    ⬅ Back to Queue
                  </button>
                  <header className="cashier-detail-header">
                    <div>
                      <h2>{visitDetail.patient_name}</h2>
                      <p>
                        {visitDetail.hospital_id}
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
                    <div className="cashier-header-actions">
                      <div className="cashier-pending-total">
                        <span>Pending</span>
                        <strong>{formatEtb(pendingTotal)}</strong>
                      </div>
                      {paidCharges.length > 0 && (
                        <button
                          type="button"
                          className="cashier-total-receipt-btn"
                          onClick={fetchTotalReceipt}
                        >
                          View total receipt
                        </button>
                      )}
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
                        <h4>Record payment</h4>
                        <div className="payment-action-row">
                          <button
                            type="button"
                            className="pay-action-btn pay-action-primary"
                            disabled={paying || selectedChargeIds.size === 0}
                            onClick={() => setPayModal({ mode: "selected" })}
                          >
                            Pay selected ({selectedChargeIds.size}) — {formatEtb(selectedTotal)}
                          </button>
                          <button
                            type="button"
                            className="pay-action-btn pay-action-secondary"
                            disabled={paying}
                            onClick={() => setPayModal({ mode: "all" })}
                          >
                            Pay all pending — {formatEtb(pendingTotal)}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </main>
          </>
        )}
      </div>

      {payModal && (
        <PaymentFormModal
          amount={payModal.mode === "all" ? pendingTotal : selectedTotal}
          mode={payModal.mode}
          paying={paying}
          onConfirm={handlePayConfirm}
          onClose={() => !paying && setPayModal(null)}
        />
      )}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

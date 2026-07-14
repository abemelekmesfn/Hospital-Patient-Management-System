import { useCallback, useEffect, useState } from "react";
import API from "../../api/axios";
import ConfirmModal from "../../components/ConfirmModal";

export default function AdminInsurancePanel() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [actionModal, setActionModal] = useState(null); // { claimId, newStatus }
  const [actionBusy, setActionBusy] = useState(false);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(`/billing/insurance-claims/?status=${statusFilter === "ALL" ? "" : statusFilter}`);
      setClaims(res.data);
    } catch (err) {
      console.error(err);
      setError("Could not load insurance claims.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchClaims();
  }, [fetchClaims]);

  const handleActionConfirm = async (formValues) => {
    if (!actionModal) return;
    setActionBusy(true);
    try {
      await API.post(`/billing/insurance-claims/${actionModal.claimId}/verify/`, {
        status: actionModal.newStatus,
        reference_number: formValues.reference_number || "",
        notes: formValues.notes || "",
      });
      setActionModal(null);
      await fetchClaims();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Could not update claim.");
    } finally {
      setActionBusy(false);
    }
  };

  const getModalVariant = (status) => {
    if (status === "VERIFIED") return "primary";
    if (status === "REJECTED") return "danger";
    return "warning";
  };

  return (
    <div className="admin-panel admin-users-panel">
      <header className="admin-panel-head">
        <h1>Insurance claims</h1>
        <p>Verify and track payments from insurance providers.</p>
      </header>

      <div className="admin-inv-tabs">
        {["PENDING", "SUBMITTED", "VERIFIED", "REJECTED", "ALL"].map((st) => (
          <button
            key={st}
            type="button"
            className={statusFilter === st ? "active" : ""}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {error && <p className="admin-form-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Company</th>
              <th>Patient</th>
              <th>Service</th>
              <th>Amount (ETB)</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>Loading…</td>
              </tr>
            )}
            {!loading && claims.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#607d8b" }}>
                    <div style={{ fontSize: "40px", marginBottom: "10px", opacity: 0.5 }}>🛡️</div>
                    <h3 style={{ margin: "0 0 8px 0", color: "#263238" }}>No claims found</h3>
                    <p style={{ margin: 0, fontSize: "14px" }}>There are no insurance claims matching the current filter.</p>
                  </div>
                </td>
              </tr>
            )}
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td>{new Date(claim.created_at).toLocaleDateString()}</td>
                <td>{claim.insurance_company || "—"}</td>
                <td>
                  <div>{claim.patient_name}</div>
                  <div style={{ fontSize: "11px", color: "#607d8b" }}>
                    ID: {claim.hospital_id}
                  </div>
                </td>
                <td>
                  <div>{claim.service_name}</div>
                  <div style={{ fontSize: "11px", color: "#607d8b" }}>
                    Ref: {claim.charge_receipt_number}
                  </div>
                </td>
                <td>{Number(claim.claim_amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })}</td>
                <td>
                  <span
                    className={`admin-status-pill ${
                      claim.status === "VERIFIED"
                        ? "on"
                        : claim.status === "REJECTED"
                        ? "off"
                        : ""
                    }`}
                  >
                    {claim.status}
                  </span>
                </td>
                <td>
                  {claim.status === "PENDING" || claim.status === "SUBMITTED" ? (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="admin-btn"
                        style={{ padding: "6px 12px", background: "#2e7d32" }}
                        onClick={() => setActionModal({ claimId: claim.id, newStatus: "VERIFIED" })}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => setActionModal({ claimId: claim.id, newStatus: "REJECTED" })}
                      >
                        Reject
                      </button>
                      {claim.status === "PENDING" && (
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          style={{ padding: "6px 12px" }}
                          onClick={() => setActionModal({ claimId: claim.id, newStatus: "SUBMITTED" })}
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#607d8b" }}>
                      By {claim.verified_by_name}
                      {claim.reference_number && <br />}
                      {claim.reference_number && `Ref: ${claim.reference_number}`}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!actionModal}
        title={
          actionModal?.newStatus === "VERIFIED"
            ? "Verify Claim"
            : actionModal?.newStatus === "REJECTED"
            ? "Reject Claim"
            : "Submit Claim"
        }
        message={`Enter the details to ${(actionModal?.newStatus || "").toLowerCase()} this insurance claim.`}
        confirmLabel={actionModal?.newStatus === "VERIFIED" ? "Verify" : actionModal?.newStatus === "REJECTED" ? "Reject" : "Submit"}
        variant={getModalVariant(actionModal?.newStatus)}
        busy={actionBusy}
        inputs={[
          { name: "reference_number", label: "Reference Number", placeholder: "Enter reference number", required: true },
          { name: "notes", label: "Notes (optional)", placeholder: "Any additional notes..." },
        ]}
        onConfirm={handleActionConfirm}
        onCancel={() => !actionBusy && setActionModal(null)}
      />
    </div>
  );
}

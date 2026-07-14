import "./Styles/receipt.css";

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  return (
    <div className="receipt-overlay" onClick={onClose}>
      <div className="receipt-sheet" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="receipt-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <header className="receipt-header">
          <h2>{receipt.hospital_name || "HPMS"}</h2>
          <p className="receipt-sub">
            {receipt.receipt_type === "TOTAL_VISIT"
              ? "Total Visit Receipt"
              : "Official payment receipt"}
          </p>
          <div className="receipt-meta">
            <span>{receipt.paid_at ? new Date(receipt.paid_at).toLocaleString() : ""}</span>
            <span>Ref: {receipt.receipt_number}</span>
          </div>
        </header>

        <section className="receipt-patient">
          <p>
            <span>Patient</span>
            <strong>{receipt.patient_name}</strong>
          </p>
          <p>
            <span>Hospital ID</span>
            <strong>{receipt.hospital_id}</strong>
          </p>
          <p>
            <span>Payment method</span>
            <strong>{receipt.payment_method_label || receipt.payment_method}</strong>
          </p>
          {receipt.payer_name && (
            <p>
              <span>Payer name</span>
              <strong>{receipt.payer_name}</strong>
            </p>
          )}
          {receipt.payer_account && (
            <p>
              <span>Account/Phone</span>
              <strong>
                {receipt.payer_account}
                {receipt.payer_phone ? ` / ${receipt.payer_phone}` : ""}
              </strong>
            </p>
          )}
        </section>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Patient portion</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.lines || []).map((ln, i) => (
              <tr key={i}>
                <td>
                  {ln.service_name}
                  {ln.department && (
                    <div style={{ fontSize: "11px", color: "#90a4ae" }}>
                      {ln.department}
                    </div>
                  )}
                  {ln.receipt_number && receipt.receipt_type === "TOTAL_VISIT" && (
                    <div style={{ fontSize: "11px", color: "#90a4ae" }}>
                      Ref: {ln.receipt_number}
                    </div>
                  )}
                </td>
                <td>
                  {Number.parseFloat(ln.patient_amount).toLocaleString("en-ET", {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-totals">
          <p>
            Subtotal:{" "}
            {Number.parseFloat(receipt.subtotal || 0).toLocaleString("en-ET", {
              minimumFractionDigits: 2,
            })}
          </p>
          {Number.parseFloat(receipt.insurance_total || 0) > 0 && (
            <p>
              Insurance coverage: -
              {Number.parseFloat(receipt.insurance_total).toLocaleString(
                "en-ET",
                { minimumFractionDigits: 2 }
              )}
            </p>
          )}
          <h3>
            Paid:{" "}
            {Number.parseFloat(receipt.total || 0).toLocaleString("en-ET", {
              minimumFractionDigits: 2,
            })}{" "}
            ETB
          </h3>

        </div>

        <button
          type="button"
          className="receipt-print-btn"
          onClick={() => window.print()}
        >
          Print receipt
        </button>
      </div>
    </div>
  );
}

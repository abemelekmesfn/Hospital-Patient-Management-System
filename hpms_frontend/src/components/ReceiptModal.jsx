import "./Styles/receipt.css";

function formatEtb(value) {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return `${value} ETB`;
  return `${n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

export default function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipt-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="receipt-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="receipt-header">
          <h2>{receipt.hospital_name || "DOSE Hospital"}</h2>
          <p className="receipt-sub">Official payment receipt</p>
          <p className="receipt-meta">
            <strong>{receipt.receipt_number}</strong>
            <span>{receipt.paid_at ? new Date(receipt.paid_at).toLocaleString() : ""}</span>
          </p>
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
          {receipt.registration_number ? (
            <p>
              <span>Registration</span>
              <strong>{receipt.registration_number}</strong>
            </p>
          ) : null}
          <p>
            <span>Payment</span>
            <strong>{receipt.payment_method_label || receipt.payment_method}</strong>
          </p>
        </section>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Dept.</th>
              <th>Gross</th>
              <th>Insurance</th>
              <th>Patient</th>
            </tr>
          </thead>
          <tbody>
            {(receipt.lines || []).map((line, i) => (
              <tr key={i}>
                <td>{line.service_name}</td>
                <td>{line.department}</td>
                <td>{formatEtb(line.gross_amount)}</td>
                <td>{formatEtb(line.insurance_amount)}</td>
                <td>{formatEtb(line.patient_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="receipt-totals">
          <p>
            Subtotal <span>{formatEtb(receipt.subtotal)}</span>
          </p>
          <p>
            Insurance covered <span>{formatEtb(receipt.insurance_total)}</span>
          </p>
          <h3>
            Amount paid <span>{formatEtb(receipt.total)}</span>
          </h3>
          <p className="receipt-currency-note">All amounts in Ethiopian Birr (ETB)</p>
        </footer>

        <button type="button" className="receipt-print-btn" onClick={handlePrint}>
          Print receipt
        </button>
        <button type="button" className="receipt-close-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
}

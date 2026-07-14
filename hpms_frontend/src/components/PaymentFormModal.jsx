import { useState } from "react";
import "./Styles/paymentform.css";

const PAYMENT_METHODS = [
  { id: "CASH", label: "Cash", icon: "💵" },
  { id: "BANK_TRANSFER", label: "Bank Transfer", icon: "🏦" },
  { id: "TELEBIRR", label: "Tele Birr", icon: "📱" },
  { id: "INSURANCE", label: "Insurance", icon: "🛡️" },
];

function formatEtb(value) {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return "— ETB";
  return `${n.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;
}

/**
 * Payment form modal: collects payment method, payer details (name, account, phone).
 *
 * Props:
 *   amount      – total amount being paid
 *   mode        – "selected" | "all" (for button label)
 *   paying      – boolean, disables confirm while processing
 *   onConfirm   – (method, { payer_name, payer_account, payer_phone }) => void
 *   onClose     – () => void
 */
export default function PaymentFormModal({
  amount,
  mode = "selected",
  paying = false,
  onConfirm,
  onClose,
}) {
  const [method, setMethod] = useState(null);
  const [payerName, setPayerName] = useState("");
  const [payerAccount, setPayerAccount] = useState("");
  const [payerPhone, setPayerPhone] = useState("");

  const needsDetails = method && method !== "CASH";
  
  let isNameValid = true;
  let isAccountValid = true;
  let isPhoneValid = true;

  if (needsDetails) {
    // Name: letters and spaces only, at least 2 chars
    isNameValid = /^[A-Za-z\s]{2,}$/.test(payerName.trim());
    
    if (method === "TELEBIRR") {
      // Telebirr: account is phone number (09XXXXXXXX, 10 digits)
      isAccountValid = /^09\d{8}$/.test(payerAccount.trim());
    } else {
      // Bank Transfer / Insurance: account number must be digits only, at least 4 digits
      isAccountValid = /^\d{4,}$/.test(payerAccount.trim());
    }

    if (payerPhone.trim() !== "") {
      isPhoneValid = /^09\d{8}$/.test(payerPhone.trim());
    }
  }

  const canConfirm = method && !paying && (!needsDetails || (isNameValid && isAccountValid && isPhoneValid));

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(method, {
      payer_name: payerName.trim(),
      payer_account: payerAccount.trim(),
      payer_phone: payerPhone.trim(),
    });
  };

  const methodLabel = method
    ? PAYMENT_METHODS.find((m) => m.id === method)?.label || method
    : "";

  return (
    <div className="pay-modal-overlay" onClick={onClose}>
      <div className="pay-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="pay-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <h3>Record Payment</h3>
        <p className="pay-modal-subtitle">
          {mode === "all" ? "Pay all pending charges" : "Pay selected charges"}
        </p>

        <div className="pay-modal-summary">
          <span>Amount due</span>
          <strong>{formatEtb(amount)}</strong>
        </div>

        <p className="pay-method-label">Payment method</p>
        <div className="pay-method-grid">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`pay-method-card ${method === m.id ? "selected" : ""}`}
              onClick={() => setMethod(m.id)}
            >
              <span className="pay-method-icon">{m.icon}</span>
              <span className="pay-method-name">{m.label}</span>
            </button>
          ))}
        </div>

        {needsDetails && (
          <div className="pay-details-section">
            <label>
              Payer name (account owner)
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder={
                  method === "INSURANCE"
                    ? "Insurance company name"
                    : "Account holder full name"
                }
                className={payerName && !isNameValid ? "invalid-input" : ""}
              />
              {payerName && !isNameValid && <span className="validation-error">Only letters and spaces (min 2)</span>}
            </label>

            <label>
              {method === "TELEBIRR" ? "Phone number" : "Account number"}
              <input
                type="text"
                inputMode="numeric"
                value={payerAccount}
                onChange={(e) => setPayerAccount(e.target.value)}
                placeholder={
                  method === "TELEBIRR"
                    ? "e.g. 09XXXXXXXX"
                    : "e.g. 1000123456789"
                }
                className={payerAccount && !isAccountValid ? "invalid-input" : ""}
              />
              {payerAccount && !isAccountValid && (
                <span className="validation-error">
                  {method === "TELEBIRR" ? "Must be 10 digits starting with 09" : "Digits only (min 4)"}
                </span>
              )}
            </label>

            {method !== "TELEBIRR" && (
              <label>
                Phone number (optional)
                <input
                  type="text"
                  inputMode="tel"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="Contact phone (09XXXXXXXX)"
                  className={payerPhone && !isPhoneValid ? "invalid-input" : ""}
                />
                {payerPhone && !isPhoneValid && <span className="validation-error">Must be 10 digits starting with 09</span>}
              </label>
            )}
          </div>
        )}

        <button
          type="button"
          className="pay-confirm-btn"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          {paying
            ? "Processing…"
            : `Confirm ${methodLabel} payment — ${formatEtb(amount)}`}
        </button>
      </div>
    </div>
  );
}

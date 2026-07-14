import { useState, useEffect } from "react";
import "./ConfirmModal.css";

/**
 * Reusable confirmation / prompt modal with blurred backdrop.
 *
 * Props:
 *  - open (bool)           : whether the modal is visible
 *  - title (string)        : modal heading
 *  - message (string)      : body text
 *  - confirmLabel (string) : label for confirm button (default "Confirm")
 *  - cancelLabel (string)  : label for cancel button (default "Cancel")
 *  - variant ("danger"|"primary"|"warning")  : colour theme
 *  - inputs (array of { name, label, placeholder, type, required })
 *        optional — turns this into a prompt modal with text inputs
 *  - onConfirm (fn)        : called with form values (or no args if no inputs)
 *  - onCancel (fn)         : called on cancel / backdrop click
 *  - busy (bool)           : disables buttons while processing
 */
export default function ConfirmModal({
  open,
  title = "Confirm",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  inputs = [],
  onConfirm,
  onCancel,
  busy = false,
}) {
  const [formValues, setFormValues] = useState({});

  useEffect(() => {
    if (open) {
      const init = {};
      for (const inp of inputs) init[inp.name] = inp.defaultValue || "";
      setFormValues(init);
    }
  }, [open, inputs]);

  if (!open) return null;

  const handleInputChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (inputs.length > 0) {
      onConfirm?.(formValues);
    } else {
      onConfirm?.();
    }
  };

  const variantClass =
    variant === "danger" ? "cm-danger" : variant === "warning" ? "cm-warning" : "cm-primary";

  return (
    <div className="cm-overlay" role="dialog" aria-modal="true">
      <div className="cm-backdrop" onClick={() => !busy && onCancel?.()} />
      <form className={`cm-card ${variantClass}`} onSubmit={handleConfirm}>
        <div className="cm-header">
          <h3 className="cm-title">{title}</h3>
          <button
            type="button"
            className="cm-close"
            onClick={() => !busy && onCancel?.()}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {message && <p className="cm-message">{message}</p>}

        {inputs.length > 0 && (
          <div className="cm-inputs">
            {inputs.map((inp) => (
              <label key={inp.name} className="cm-input-label">
                {inp.label || inp.name}
                <input
                  type={inp.type || "text"}
                  placeholder={inp.placeholder || ""}
                  required={inp.required}
                  value={formValues[inp.name] || ""}
                  onChange={(e) => handleInputChange(inp.name, e.target.value)}
                  autoFocus={inputs.indexOf(inp) === 0}
                />
              </label>
            ))}
          </div>
        )}

        <div className="cm-actions">
          <button
            type="button"
            className="cm-btn cm-btn-cancel"
            disabled={busy}
            onClick={() => onCancel?.()}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className={`cm-btn cm-btn-confirm ${variantClass}`}
            disabled={busy}
          >
            {busy ? "Processing…" : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

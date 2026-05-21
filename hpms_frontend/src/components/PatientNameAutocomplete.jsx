import { useEffect, useRef, useState } from "react";
import API from "../api/axios";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import "./PatientNameAutocomplete.css";

function patientLabel(p) {
  const name =
    (p.display_name || "").trim() ||
    `${(p.first_name || "").trim()} ${(p.last_name || "").trim()}`.trim();
  const id = p.hospital_id ? ` · ${p.hospital_id}` : "";
  return `${name || "Patient"}${id}`;
}

/**
 * Typeahead for registered patients. Calls onSelect(patient) when a row is chosen.
 */
export default function PatientNameAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search or enter patient name...",
  inputClassName = "",
  disabled = false,
}) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebouncedValue(value, 260);
  const wrapRef = useRef(null);

  useEffect(() => {
    const q = (debounced || "").trim();
    if (q.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    API.get(`patients/search/?q=${encodeURIComponent(q)}`)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : [];
        setResults(list);
        setOpen(list.length > 0);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setOpen(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handlePick = (patient) => {
    const label = patientLabel(patient);
    onChange(label);
    onSelect?.(patient);
    setOpen(false);
    setResults([]);
  };

  return (
    <div className="hpms-patient-ac" ref={wrapRef}>
      <input
        type="text"
        className={inputClassName || undefined}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          if (!e.target.value.trim()) onSelect?.(null);
        }}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        autoComplete="off"
      />
      {loading && <span className="hpms-patient-ac-hint">Searching…</span>}
      {open && results.length > 0 && (
        <ul className="hpms-patient-ac-list" role="listbox">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(p)}
              >
                <span className="hpms-patient-ac-name">{patientLabel(p)}</span>
                {p.phone && (
                  <span className="hpms-patient-ac-meta">{p.phone}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

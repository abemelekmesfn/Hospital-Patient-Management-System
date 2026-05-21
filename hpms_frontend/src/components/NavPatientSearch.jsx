import { useEffect, useRef, useState } from "react";
import API from "../api/axios";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import "./NavPatientSearch.css";

function patientLabel(p) {
  const name =
    (p.display_name || "").trim() ||
    `${(p.first_name || "").trim()} ${(p.last_name || "").trim()}`.trim();
  return name || p.hospital_id || "Patient";
}

export default function NavPatientSearch({
  onSelect,
  placeholder = "search patient",
  variant = "dark",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 260);
  const wrapRef = useRef(null);

  useEffect(() => {
    const q = (debounced || "").trim();
    if (q.length < 1) {
      setResults([]);
      setShowEmpty(false);
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
        setShowEmpty(list.length === 0);
        setOpen(list.length > 0);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setShowEmpty(true);
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
        setShowEmpty(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handlePick = (patient) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    setShowEmpty(false);
    onSelect?.(patient);
  };

  return (
    <div
      className={`hpms-nav-search ${variant === "light" ? "hpms-nav-search-light" : ""}`}
      ref={wrapRef}
    >
      <input
        type="search"
        className="hpms-nav-search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results.length) setOpen(true);
          else if ((query || "").trim()) setShowEmpty(true);
        }}
        autoComplete="off"
        aria-label="Search patient"
      />
      {(showEmpty || open) && (
        <div className="hpms-nav-search-dropdown">
          {showEmpty && !loading && (
            <p className="hpms-nav-search-empty">the patient does not exist</p>
          )}
          {open && (
            <ul role="listbox">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlePick(p)}
                  >
                    <span>{patientLabel(p)}</span>
                    {p.hospital_id && (
                      <small>{p.hospital_id}</small>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

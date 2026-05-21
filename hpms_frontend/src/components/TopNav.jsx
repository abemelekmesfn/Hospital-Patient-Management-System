import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./TopNav.css";

const STORAGE_KEY = "hpms_user";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatRole(role) {
  if (!role) return "";
  return String(role).replace(/_/g, " ");
}

/**
 * Top bar: page title + signed-in identity + logout.
 * Backend `UserSerializer` exposes `username`, `first_name`, `last_name`, `role`.
 */
export default function TopNav({ title, center }) {
  const navigate = useNavigate();
  const user = useMemo(() => readStoredUser(), []);

  const first = (user?.first_name || "").trim();
  const last = (user?.last_name || "").trim();
  const fullName = `${first} ${last}`.trim();
  const username = (user?.username || "").trim();

  const primaryName = fullName || username || "Staff";
  const secondaryLine = fullName
    ? username || formatRole(user?.role)
    : formatRole(user?.role) || "";

  const initial = (primaryName || "?").slice(0, 1).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem(STORAGE_KEY);
    navigate("/", { replace: true });
  };

  return (
    <header className="hpms-topnav">
      <div className="hpms-topnav-left">
        <div className="hpms-brand" aria-hidden="true">
          HPMS
        </div>
        <div className="hpms-page-title">{title}</div>
      </div>

      {center ? <div className="hpms-topnav-center">{center}</div> : null}

      <div className="hpms-topnav-right">
        <div className="hpms-user-block" title={primaryName}>
          <div className="hpms-avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="hpms-user-text">
            <div className="hpms-user-name">{primaryName}</div>
            {secondaryLine && (
              <div className="hpms-user-sub">{secondaryLine}</div>
            )}
          </div>
        </div>

        <button type="button" className="hpms-logout" onClick={handleLogout}>
          <span className="hpms-logout-icon" aria-hidden="true">
            ⎋
          </span>
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}

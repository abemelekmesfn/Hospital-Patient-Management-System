import { useState } from "react";
import "./Styles/login.css";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const user = username.trim();
    const pass = password;

    if (!user || !pass) {
      setError("Enter both Staff ID and password.");
      setLoading(false);
      return;
    }

    try {
      const response = await API.post("login/", {
        username: user,
        password: pass,
      });

      // Save tokens
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);
      if (response.data.user) {
        localStorage.setItem("hpms_user", JSON.stringify(response.data.user));
      }

      // Use role from backend response
      const userRole = response.data.user.role.toLowerCase();

      // Redirect based on role
      if (userRole === "doctor") {
        navigate("/doctor");
      } else if (userRole === "triage") {
        navigate("/triage");
      } else if (userRole === "laboratory") {
        navigate("/lab");
      } else if (userRole === "pharmacist") {
        navigate("/pharmacy");
      } else if (userRole === "nurse") {
        navigate("/nurse");
      } else if (userRole === "admin") {
        navigate("/admin");
      } else if (userRole === "cashier") {
        navigate("/cashier");
      } else if (userRole === "reception") {
        navigate("/reception");
      } else {
        navigate("/reception");
      }
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.error ||
        data?.detail ||
        (err.code === "ERR_NETWORK"
          ? "Cannot reach the server. Is the backend running on port 8000?"
          : null) ||
        "Invalid credentials. Check username and password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card-container">
        {/* LEFT IMAGE PANEL */}
        <div className="login-left">
          <div className="overlay">
            <h1>Hospital Patient Management System</h1>
            <p>2018 E.C</p>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="login-right">
          <div className="login-card">
            <h2 className="logo">HPMS</h2>
            <p className="subtitle">
              Please sign in to your professional account
            </p>

            {error && <div className="error-box">{error}</div>}

            <form className="login-form" onSubmit={handleLogin}>
              <div className="input-group">
                <input
                  type="text"
                  name="username"
                  value={username}
                  required
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                />
                <label>Staff ID</label>
                <span className="icon">👤</span>
              </div>


              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  required
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <label>Password</label>
                <span
                  className="icon toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: "pointer" }}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </span>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Authenticating..." : "Secure Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

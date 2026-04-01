import { useState } from "react";
import "./Styles/login.css";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();

  // Fake role detection (we'll connect API later)
  const handleUsernameChange = (e) => {
    const value = e.target.value;

    if (value.toLowerCase().includes("doc")) {
      setRole("Doctor");
    } else if (value.toLowerCase().includes("nurse")) {
      setRole("Nurse");
    } else if (value.toLowerCase().includes("rec")) {
      setRole("Reception");
    } else {
      setRole("");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const username = e.target[0].value;
    const password = e.target[1].value;

    try {
      const response = await API.post("login/", {
        username,
        password,
      });

      // Save tokens
      localStorage.setItem("access", response.data.access);
      localStorage.setItem("refresh", response.data.refresh);

      // Use role from backend response
      const userRole = response.data.user.role.toLowerCase();

      // Redirect based on role
      if (userRole === "doctor") {
        navigate("/doctor");
      } else if (userRole === "triage") {
        navigate("/triage");
      } else {
        navigate("/reception");
      }

    } catch {
      setError("Invalid credentials. Please contact your System Administrator.");
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
          <p>Streamlining care for a healthier tomorrow.</p>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="login-right">
        <div className="login-card">

          <h2 className="logo">HPMS</h2>
          <p className="subtitle">Please sign in to your professional account</p>

          {error && <div className="error-box">{error}</div>}

          <form className="login-form" onSubmit={handleLogin}>

            <div className="input-group">
              <input type="text" required onChange={handleUsernameChange} />
              <label>Staff ID</label>
              <span className="icon">👤</span>
            </div>

            {role && (
              <div className="role-indicator">
                Recognized as: <strong>{role}</strong>
              </div>
            )}

            <div className="input-group">
              <input type={showPassword ? "text" : "password"} required />
              <label>Password</label>
              <span
                className="icon toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
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
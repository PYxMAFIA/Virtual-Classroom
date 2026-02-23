import React, { useState, useEffect } from "react";
import { Navbar, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { clearAuth, getToken, getUser } from "../utils/auth";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const NAV = () => {
  const navigate = useNavigate();
  const token = getToken();
  const user = getUser();
  const [backendStatus, setBackendStatus] = useState("checking"); // "checking" | "online" | "offline"

  // Warm-up ping to wake Render backend
  useEffect(() => {
    let cancelled = false;
    const checkBackend = async () => {
      try {
        await axios.get(`${BACKEND_URL}/health`, { timeout: 15000 });
        if (!cancelled) setBackendStatus("online");
      } catch {
        if (!cancelled) setBackendStatus("offline");
      }
    };
    checkBackend();
    // Re-check every 60s
    const interval = setInterval(checkBackend, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  const statusColor = backendStatus === "online" ? "#22c55e" : backendStatus === "offline" ? "#ef4444" : "#f59e0b";
  const statusLabel = backendStatus === "online" ? "Online" : backendStatus === "offline" ? "Server waking up..." : "Checking...";

  return (
    <Navbar fixed="top" expand="lg" className="gc-navbar">
      <Container fluid className="align-items-center">
        {/* Left: Logo + Brand */}
        <Navbar.Brand
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
          className="d-flex align-items-center gap-2"
        >
          <img
            src="/image.png"
            alt="Virtual Classroom"
            style={{ width: 32, height: 32, borderRadius: 6, objectFit: "contain" }}
          />
          <span style={{
            fontFamily: "'Google Sans', sans-serif",
            fontSize: "20px",
            fontWeight: 500,
            color: "var(--gc-text-secondary)"
          }}>
            Virtual Classroom
          </span>
          {/* Backend status dot */}
          <span
            title={statusLabel}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: statusColor,
              display: "inline-block",
              marginLeft: 4,
              boxShadow: `0 0 6px ${statusColor}`,
              transition: "background 0.3s",
            }}
          />
        </Navbar.Brand>

        {/* Right: Actions */}
        <Navbar.Toggle aria-controls="topnav" />
        <Navbar.Collapse id="topnav" className="justify-content-end">
          <div className="d-flex gap-2 align-items-center">
            {backendStatus === "offline" && (
              <span style={{ fontSize: "12px", color: "#f59e0b", marginRight: 8 }}>
                ⏳ Server waking up...
              </span>
            )}
            {token ? (
              <>
                <div style={{ fontSize: "13px", color: "var(--gc-text-secondary)", marginRight: "6px" }}>
                  {user?.name ? user.name : user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="gc-btn gc-btn-secondary"
                  style={{ fontSize: "14px" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/admin/login")}
                  className="gc-btn gc-btn-text"
                  style={{ fontSize: "14px" }}
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/admin/register")}
                  className="gc-btn gc-btn-secondary"
                  style={{ fontSize: "14px" }}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NAV;

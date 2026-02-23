import React, { useState, useEffect, useCallback } from "react";
import { Form, Spinner } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../App.css";
import toast from 'react-hot-toast';
import { setToken as persistToken, setUser as persistUser } from "../utils/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Google Sign-In callback
  const handleGoogleResponse = useCallback(async (response) => {
    setError("");
    setGoogleLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/user/google-login`, {
        credential: response.credential,
      });
      if (res.data.token) {
        persistToken(res.data.token);
      }
      if (res.data.user) {
        persistUser(res.data.user);
      }
      toast.success("Signed in with Google!");
      if (res.data.superAdmin) {
        navigate("/superadmin");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("Google login error:", err?.response?.data || err.message);
      setError(err?.response?.data?.message || "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }, [BACKEND_URL, navigate]);

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const loadGSI = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", width: "356", text: "signin_with", shape: "rectangular" }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", width: "356", text: "signin_with", shape: "rectangular" }
        );
      };
      document.head.appendChild(script);
    };

    loadGSI();
  }, [GOOGLE_CLIENT_ID, handleGoogleResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(BACKEND_URL + "/user/login", {
        email,
        password,
      });

      if (response.data.status === 200) {
        if (response.data.token) {
          persistToken(response.data.token);
        }
        if (response.data.user) {
          persistUser(response.data.user);
        }
        toast.success("Logged in successfully!");

        if (response.data.superAdmin) {
          navigate("/superadmin");
        } else {
          navigate("/");
        }
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Login error:", error?.response?.data || error.message);
      const msg = error?.response?.data?.message || "An error occurred during login";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gc-center">
      <div className="elevated-card gc-animate-in" style={{ width: "420px", padding: "40px 32px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏫</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "4px" }}>Sign In</h2>
          <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", margin: 0 }}>
            Welcome back to Virtual Classroom
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--gc-red-light)",
            color: "var(--gc-red)",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            marginBottom: "16px",
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Google Sign-In */}
        {GOOGLE_CLIENT_ID && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
              {googleLoading ? (
                <div style={{ padding: "12px", textAlign: "center" }}>
                  <Spinner animation="border" size="sm" /> Signing in with Google...
                </div>
              ) : (
                <div id="google-signin-btn" />
              )}
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "14px",
              margin: "16px 0", color: "var(--gc-text-disabled)", fontSize: "13px"
            }}>
              <div style={{ flex: 1, height: "1px", background: "var(--gc-border)" }} />
              or
              <div style={{ flex: 1, height: "1px", background: "var(--gc-border)" }} />
            </div>
          </>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formBasicEmail" className="mb-3">
            <Form.Label>Email address</Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group controlId="formBasicPassword" className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          <button
            className="gc-btn gc-btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", marginTop: "8px", fontSize: "15px" }}
          >
            {loading ? (
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              "Login"
            )}
          </button>
        </Form>

        <div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "var(--gc-text-secondary)" }}>
          Don't have an account?{" "}
          <Link to="/admin/register" style={{ color: "var(--gc-blue)", textDecoration: "none", fontWeight: 500 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;

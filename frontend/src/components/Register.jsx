import React, { useState, useEffect, useCallback } from "react";
import { Form, Spinner } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../App.css";
import toast from "react-hot-toast";
import { setToken as persistToken, setUser as persistUser } from "../utils/auth";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Register = () => {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [role, setRole] = useState("student");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);
	const navigate = useNavigate();
	const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

	// Google Sign-Up callback
	const handleGoogleResponse = useCallback(async (response) => {
		setError("");
		setGoogleLoading(true);
		try {
			const res = await axios.post(`${BACKEND_URL}/user/google-login`, {
				credential: response.credential,
				role: role,
			});
			if (res.data.token) {
				persistToken(res.data.token);
			}
			if (res.data.user) {
				persistUser(res.data.user);
			}
			toast.success("Signed up with Google!");
			navigate("/");
		} catch (err) {
			console.error("Google signup error:", err?.response?.data || err.message);
			setError(err?.response?.data?.message || "Google sign-up failed");
		} finally {
			setGoogleLoading(false);
		}
	}, [BACKEND_URL, navigate, role]);

	// Load Google Identity Services script
	useEffect(() => {
		if (!GOOGLE_CLIENT_ID) return;

		const initGoogle = () => {
			window.google.accounts.id.initialize({
				client_id: GOOGLE_CLIENT_ID,
				callback: handleGoogleResponse,
			});
			window.google.accounts.id.renderButton(
				document.getElementById("google-signup-btn"),
				{ theme: "outline", size: "large", width: "356", text: "signup_with", shape: "rectangular" }
			);
		};

		if (window.google?.accounts?.id) {
			initGoogle();
			return;
		}

		const script = document.createElement("script");
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.defer = true;
		script.onload = initGoogle;
		document.head.appendChild(script);
	}, [GOOGLE_CLIENT_ID, handleGoogleResponse]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const response = await axios.post(BACKEND_URL + "/user/register", {
				name,
				email,
				password,
				role,
			});

			if (response.data.status === 200 || response.data.success) {
				// Persist token + user so the user is logged in immediately
				if (response.data.token) {
					persistToken(response.data.token);
				}
				if (response.data.user) {
					persistUser(response.data.user);
				}
				toast.success("Account created successfully!");
				navigate("/");
			} else {
				setError(response.data.message);
			}
		} catch (error) {
			console.error("Register error:", error?.response?.data || error.message);
			const msg = error?.response?.data?.message || "An error occurred during registration";
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
					<div style={{ fontSize: "40px", marginBottom: "8px" }}>🎒</div>
					<h2 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "4px" }}>Create Account</h2>
					<p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", margin: 0 }}>
						Join Virtual Classroom
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

				{/* Role Selection (needed before Google sign-up) */}
				<Form.Group className="mb-3">
					<Form.Label style={{ fontWeight: 500 }}>I am a:</Form.Label>
					<div style={{ display: "flex", gap: "12px" }}>
						<button
							type="button"
							onClick={() => setRole("student")}
							style={{
								flex: 1, padding: "12px", borderRadius: "10px",
								border: role === "student" ? "2px solid var(--gc-blue)" : "2px solid var(--gc-border)",
								background: role === "student" ? "rgba(66,133,244,0.08)" : "transparent",
								color: role === "student" ? "var(--gc-blue)" : "var(--gc-text-secondary)",
								cursor: "pointer", fontWeight: 600, fontSize: "14px",
								transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
							}}
						>
							🎓 Student
						</button>
						<button
							type="button"
							onClick={() => setRole("teacher")}
							style={{
								flex: 1, padding: "12px", borderRadius: "10px",
								border: role === "teacher" ? "2px solid var(--gc-blue)" : "2px solid var(--gc-border)",
								background: role === "teacher" ? "rgba(66,133,244,0.08)" : "transparent",
								color: role === "teacher" ? "var(--gc-blue)" : "var(--gc-text-secondary)",
								cursor: "pointer", fontWeight: 600, fontSize: "14px",
								transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
							}}
						>
							👨‍🏫 Teacher
						</button>
					</div>
				</Form.Group>

				{/* Google Sign-Up */}
				{GOOGLE_CLIENT_ID && (
					<>
						<div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
							{googleLoading ? (
								<div style={{ padding: "12px", textAlign: "center" }}>
									<Spinner animation="border" size="sm" /> Signing up with Google...
								</div>
							) : (
								<div id="google-signup-btn" />
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
					<Form.Group controlId="formName" className="mb-3">
						<Form.Label>Full Name</Form.Label>
						<Form.Control
							type="text"
							placeholder="Enter your name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</Form.Group>

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
							placeholder="Password (min 6 characters)"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
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
							"Create Account"
						)}
					</button>
				</Form>

				<div style={{ textAlign: "center", marginTop: "20px", fontSize: "14px", color: "var(--gc-text-secondary)" }}>
					Already have an account?{" "}
					<Link to="/admin/login" style={{ color: "var(--gc-blue)", textDecoration: "none", fontWeight: 500 }}>
						Sign in
					</Link>
				</div>
			</div>
		</div>
	);
};

export default Register;

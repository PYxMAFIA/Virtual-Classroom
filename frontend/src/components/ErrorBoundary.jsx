import React, { Component } from "react";
import { Button } from "react-bootstrap";

const isDev = import.meta.env.DEV;

class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		console.error("🚨 ErrorBoundary caught an error:", error, errorInfo);
		this.setState({ errorInfo });

		// Log to error reporting service if configured
		if (window.errorReporting) {
			window.errorReporting.report(error, errorInfo);
		}
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: null, errorInfo: null });
		if (this.props.onRetry) {
			this.props.onRetry();
		} else {
			window.location.reload();
		}
	};

	handleGoHome = () => {
		window.location.href = "/";
	};

	render() {
		if (this.state.hasError) {
			return (
				<div style={{
					minHeight: "100vh",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
					background: "#f5f5f5",
					padding: "20px",
					textAlign: "center",
				}}>
					<div style={{
						background: "white",
						padding: "40px",
						borderRadius: "12px",
						boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
						maxWidth: "500px",
					}}>
						<div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
						<h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "12px", color: "#333" }}>
							Something went wrong
						</h1>
						<p style={{ color: "#666", marginBottom: "24px", lineHeight: 1.6 }}>
							{this.state.error?.message || "An unexpected error occurred."}
						</p>

						{isDev && this.state.errorInfo && (
							<details style={{
								background: "#f9f9f9",
								padding: "16px",
								borderRadius: "8px",
								textAlign: "left",
								marginBottom: "24px",
								fontSize: "12px",
								fontFamily: "monospace",
								maxHeight: "200px",
								overflow: "auto",
							}}>
								<summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: "8px" }}>
									Error Details
								</summary>
								<pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
									{this.state.errorInfo.componentStack}
								</pre>
							</details>
						)}

						<div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
							<Button
								variant="primary"
								onClick={this.handleRetry}
								style={{ padding: "10px 24px" }}
							>
								🔄 Retry
							</Button>
							<Button
								variant="outline-secondary"
								onClick={this.handleGoHome}
								style={{ padding: "10px 24px" }}
							>
								🏠 Go Home
							</Button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;

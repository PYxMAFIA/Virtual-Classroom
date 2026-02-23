import React, { useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import axios from "axios";
import Cookies from "js-cookie";
import toast from 'react-hot-toast';

const AdminDownloadPage = () => {
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const token = Cookies.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!filename.trim()) {
      toast.error("Please enter a filename.");
      return;
    }

    setLoading(true);
    try {
      // Format filename
      let formatted = filename.trim();
      if (!formatted.endsWith(".pdf")) {
        formatted += ".pdf";
      }

      const response = await axios.post(
        `${BACKEND_URL}/admindownload/search-files`,
        { filename: formatted },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", formatted);
      document.body.appendChild(link);
      link.click();
      link.remove();

      console.log("✅ Admin download success:", formatted);
      toast.success("File downloaded successfully!");
    } catch (err) {
      console.error("❌ Download error:", err?.response?.data || err.message);
      const msg = err?.response?.data?.message || "Failed to download file. Please check the filename and try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gc-center">
      <div className="elevated-card gc-animate-in" style={{ width: "460px", padding: "40px 32px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>📥</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "4px" }}>Download File</h2>
          <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", margin: 0 }}>
            Enter the filename to download a verified assignment
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

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Filename</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. CS101_Assignment_1.pdf"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
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
              "Download"
            )}
          </button>
        </Form>
      </div>
    </div>
  );
};

export default AdminDownloadPage;

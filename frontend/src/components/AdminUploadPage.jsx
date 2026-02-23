import React, { useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import axios from "axios";
import Cookies from "js-cookie";
import toast from 'react-hot-toast';

const AdminUploadPage = () => {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const token = Cookies.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!filename.trim()) {
      toast.error("Please enter a filename.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filename", filename.trim());

      await axios.post(BACKEND_URL + "/adminupload/upload-files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ Admin upload success");
      toast.success("File uploaded successfully!");
      setFile(null);
      setFilename("");
    } catch (err) {
      console.error("❌ Upload error:", err?.response?.data || err.message);
      const msg = err?.response?.data?.message || "Failed to upload file. Please try again.";
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
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>📤</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "4px" }}>Upload Assignment</h2>
          <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", margin: 0 }}>
            Upload a verified assignment for students to download
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
              placeholder="e.g. CS101_Midterm_Solutions"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>File (PDF)</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
            {file && (
              <small style={{ color: "var(--gc-text-secondary)", marginTop: "4px", display: "block" }}>
                {file.name} • {(file.size / 1024).toFixed(1)} KB
              </small>
            )}
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
              "Upload"
            )}
          </button>
        </Form>
      </div>
    </div>
  );
};

export default AdminUploadPage;

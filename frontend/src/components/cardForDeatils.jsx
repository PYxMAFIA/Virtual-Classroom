import React, { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { Spinner } from "react-bootstrap";
import { FaCopy, FaCheck } from "react-icons/fa";
import toast from 'react-hot-toast';

function CardForDetails() {
  const [details, setDetails] = useState([]);
  const [error, setError] = useState(null);
  const [openCard, setOpenCard] = useState({});
  const [copiedFiles, setCopiedFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const token = Cookies.get("token");

  async function fetchDetails() {
    try {
      const response = await axios.get(BACKEND_URL + "/adminverifydownload/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const unverifiedFiles = response.data.unverifiedFiles || [];
      setDetails(unverifiedFiles);
    } catch (e) {
      console.error("❌ Error fetching data:", e?.response?.data || e.message);
      setError("Failed to fetch details");
    } finally {
      setLoading(false);
    }
  }

  const toggleCard = (id) => {
    setOpenCard((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (filename) => {
    navigator.clipboard
      .writeText(filename)
      .then(() => {
        setCopiedFiles((prev) => ({ ...prev, [filename]: true }));
        toast.success("Filename copied!");
      })
      .catch(() => toast.error("Failed to copy filename."));
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  return (
    <div className="gc-page" style={{ paddingTop: "24px" }}>
      <div className="gc-animate-in">
        <h2 style={{ fontSize: "1.25rem", fontWeight: 500, marginBottom: "4px" }}>Unverified Files</h2>
        <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", marginBottom: "16px" }}>
          Review student submissions and copy filenames for verification
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "48px" }}>
          <Spinner animation="border" variant="primary" />
        </div>
      )}

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

      {!loading && details.length === 0 && !error && (
        <div className="gc-empty-state">
          <div className="gc-empty-icon">📋</div>
          <h3>No unverified files</h3>
          <p>All submissions have been reviewed</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
        {details.map((file) => (
          <div key={file._id} className="gc-card gc-animate-in">
            <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div
                style={{ cursor: "pointer", flex: 1 }}
                onClick={() => toggleCard(file._id)}
              >
                <div style={{ fontWeight: 500, fontSize: "14px", color: "var(--gc-blue)" }}>
                  {file.filename || "Unknown"}
                </div>
              </div>
              <button
                className="gc-btn-icon"
                onClick={() => copyToClipboard(file.filename)}
                title="Copy filename"
              >
                {copiedFiles[file.filename] ? <FaCheck style={{ color: "var(--gc-green)" }} /> : <FaCopy />}
              </button>
            </div>

            {openCard[file._id] && (
              <div style={{
                borderTop: "1px solid var(--gc-border-light)",
                padding: "12px 16px",
                fontSize: "13px",
                color: "var(--gc-text-secondary)"
              }}>
                <div style={{ marginBottom: "4px" }}>
                  <strong>Uploaded By:</strong> {file.metadata?.email || "Unknown"}
                </div>
                <div style={{ marginBottom: "4px" }}>
                  <strong>Year:</strong> {file.metadata?.year || "Unknown"}
                </div>
                <div style={{ marginBottom: "4px" }}>
                  <strong>Subject Code:</strong> {file.metadata?.subjectcode || "Unknown"}
                </div>
                <div style={{ marginBottom: "4px" }}>
                  <strong>Uploaded:</strong> {new Date(file.uploadDate).toLocaleString() || "Unknown"}
                </div>
                <div>
                  <span className={file.metadata?.verified ? "gc-chip gc-chip-success" : "gc-chip gc-chip-danger"}>
                    {file.metadata?.verified ? "Verified" : "Unverified"}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CardForDetails;

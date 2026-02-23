import React, { useState, useEffect } from "react";
import { Form, Spinner } from "react-bootstrap";
import axios from "axios";
import toast from 'react-hot-toast';
import { getToken, getUser } from "../utils/auth";
import { useNavigate } from "react-router-dom";

const UploadForm = () => {
  const [file, setFile] = useState(null);
  const [year, setYear] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [college, setCollege] = useState("");
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(window.location.search);
  const assignmentId = queryParams.get("assignmentId");

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const token = getToken();
  const user = getUser();

  // Fetch assignment info if submitting for an assignment
  useEffect(() => {
    if (assignmentId && token) {
      const fetchAssignment = async () => {
        try {
          const res = await axios.get(`${BACKEND_URL}/assignment/item/${assignmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAssignmentTitle(res.data?.assignment?.title || "Assignment");
        } catch (err) {
          console.error("Error fetching assignment:", err);
        }
      };
      fetchAssignment();
    }
  }, [assignmentId, BACKEND_URL, token]);

  // Fetch colleges for legacy upload flow
  useEffect(() => {
    if (!assignmentId) {
      const fetchColleges = async () => {
        try {
          const response = await axios.get(BACKEND_URL + "/tools/colleges");
          setColleges(response.data?.colleges || []);
        } catch (err) {
          console.error("Error fetching colleges:", err);
        }
      };
      fetchColleges();
    }
  }, [assignmentId, BACKEND_URL]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!file) {
      toast.error("Please select a file to upload.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      let endpoint = `${BACKEND_URL}/student/upload-files`;
      if (assignmentId) {
        endpoint = `${BACKEND_URL}/submission/submit`;
        formData.append("assignmentId", assignmentId);
      } else {
        if (!college || !year || !subjectCode) {
          toast.error("Please fill in all fields.");
          setLoading(false);
          return;
        }
        formData.append("year", year);
        formData.append("subjectCode", subjectCode);
        formData.append("college", college);
      }

      await axios.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        },
      });

      toast.success(assignmentId ? "Solution submitted!" : "File uploaded successfully!");
      setFile(null);
      if (assignmentId) {
        navigate(-1); // Go back to classroom
      } else {
        setYear("");
        setSubjectCode("");
        setCollege("");
      }
    } catch (err) {
      console.error("Upload error:", err?.response?.data || err.message);
      const msg = err?.response?.data?.message || "Failed to upload file. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ----- Assignment submission UI (clean minimal) -----
  if (assignmentId) {
    return (
      <div className="gc-center">
        <div className="elevated-card gc-animate-in" style={{ width: "480px", padding: "40px 32px" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📄</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "4px" }}>Submit Your Work</h2>
            <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", margin: 0 }}>
              {assignmentTitle ? `For: ${assignmentTitle}` : "Upload your solution as a PDF"}
            </p>
          </div>

          {error && (
            <div style={{
              background: "var(--gc-red-light)", color: "var(--gc-red)",
              padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
              marginBottom: "16px", textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Solution File (PDF)</Form.Label>
              <Form.Control type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} required />
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
                "Submit Solution"
              )}
            </button>

            <button
              type="button"
              className="gc-btn gc-btn-secondary"
              style={{ width: "100%", marginTop: "10px" }}
              onClick={() => navigate(-1)}
            >
              ← Back to Classroom
            </button>
          </Form>
        </div>
      </div>
    );
  }

  // ----- Legacy file upload UI (teacher upload for resources) -----
  return (
    <div className="gc-center">
      <div className="elevated-card gc-animate-in" style={{ width: "480px", padding: "40px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>📤</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "4px" }}>Upload File</h2>
          <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", margin: 0 }}>
            Upload a resource file
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--gc-red-light)", color: "var(--gc-red)",
            padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
            marginBottom: "16px", textAlign: "center"
          }}>
            {error}
          </div>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Teacher</Form.Label>
            <Form.Select value={college} onChange={(e) => setCollege(e.target.value)} required>
              <option value="">Select teacher</option>
              {colleges.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <div style={{ display: "flex", gap: "12px" }}>
            <Form.Group className="mb-3" style={{ flex: 1 }}>
              <Form.Label>Year</Form.Label>
              <Form.Select value={year} onChange={(e) => setYear(e.target.value)} required>
                <option value="">Select year</option>
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" style={{ flex: 1 }}>
              <Form.Label>Subject Code</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. CS101"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                required
              />
            </Form.Group>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>File (PDF)</Form.Label>
            <Form.Control type="file" accept=".pdf" onChange={handleFileChange} required />
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

export default UploadForm;

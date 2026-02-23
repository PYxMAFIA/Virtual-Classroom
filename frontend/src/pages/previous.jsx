import React, { useState, useEffect } from "react";
import { Form, Spinner } from "react-bootstrap";
import axios from "axios";
import NAV from "../components/navbar";
import PdfView from "../components/PdfView";
import toast from 'react-hot-toast';

const Previous = () => {
  const [filename, setFilename] = useState("");
  const [college, setCollege] = useState("");
  const [examType, setExamType] = useState("");
  const [colleges, setColleges] = useState([]);
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchColleges = async () => {
      try {
        const response = await axios.get(BACKEND_URL + "/tools/colleges");
        setColleges(response.data?.value || []);
      } catch (err) {
        console.error("Error fetching colleges:", err);
      }
    };
    fetchColleges();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setPdfData(null);

    if (!filename.trim()) {
      toast.error("Please enter a filename to search.");
      return;
    }

    setLoading(true);
    try {
      let formatted = filename.trim();
      if (!formatted.endsWith(".pdf")) {
        formatted += ".pdf";
      }

      const body = { filename: formatted };
      if (college) body.college = college;
      if (examType) body.examType = examType;

      const response = await axios.post(
        `${BACKEND_URL}/search/search-files`,
        body,
        { responseType: "blob" }
      );

      console.log("✅ File found and downloaded");
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      setPdfData(url);
      toast.success("File found!");
    } catch (err) {
      // When responseType is 'blob', error responses are also blobs — parse them
      let errorMsg = "File not found. Try a different search.";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          errorMsg = parsed.error || errorMsg;
        } catch (_) { }
      } else if (err?.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      console.error("❌ Search error:", errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <NAV />
      <div className="gc-page" style={{ paddingTop: "88px" }}>
        <div className="gc-animate-in" style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500 }}>Download Homework</h1>
          <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px" }}>
            Search and download assignments
          </p>
        </div>

        <div className="elevated-card gc-animate-in" style={{ padding: "24px", marginBottom: "24px" }}>
          <Form onSubmit={handleSearch}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Form.Group style={{ flex: "2", minWidth: "200px" }}>
                <Form.Label>Filename</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="e.g. CS101_Assignment_1"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group style={{ flex: "1", minWidth: "150px" }}>
                <Form.Label>Teacher</Form.Label>
                <Form.Select value={college} onChange={(e) => setCollege(e.target.value)}>
                  <option value="">All</option>
                  {colleges.map((c, i) => (
                    <option key={i} value={c.name || c.email}>{c.name || c.email}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button
                className="gc-btn gc-btn-primary"
                type="submit"
                disabled={loading}
                style={{ padding: "10px 32px" }}
              >
                {loading ? (
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </Form>
        </div>

        {pdfData && (
          <div className="gc-animate-in">
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1rem", margin: 0 }}>Preview</h3>
              <a href={pdfData} download className="gc-btn gc-btn-secondary" style={{ fontSize: "13px", padding: "6px 16px" }}>
                ⬇ Download PDF
              </a>
            </div>
            <PdfView pdf={pdfData} />
          </div>
        )}
      </div>
    </>
  );
};

export default Previous;

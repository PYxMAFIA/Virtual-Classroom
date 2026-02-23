import React, { useEffect, useState } from "react";
import axios from "axios";
import { Spinner } from "react-bootstrap";
import toast from 'react-hot-toast';
import NAV from "./navbar";
import { getToken, getUser } from "../utils/auth";

const STAT_CARDS = [
  { key: "totalTeachers", label: "Teachers", icon: "👨‍🏫", color: "#4285f4" },
  { key: "totalStudents", label: "Students", icon: "🎓", color: "#0d9488" },
  { key: "totalClassrooms", label: "Classrooms", icon: "🏫", color: "#7c3aed" },
  { key: "totalAssignments", label: "Assignments", icon: "📝", color: "#d97706" },
  { key: "totalSubmissions", label: "Submissions", icon: "📄", color: "#059669" },
  { key: "aiEvaluated", label: "AI Evaluated", icon: "🤖", color: "#6366f1" },
  { key: "published", label: "Published", icon: "✅", color: "#16a34a" },
  { key: "activeMeets", label: "Active Meets", icon: "📹", color: "#dc2626" },
];

function SuperAdminContent() {
  const [analytics, setAnalytics] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const token = getToken();
  const user = getUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, collegesRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/admin/analytics`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/superadmin/all`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setAnalytics(analyticsRes.data?.analytics || {});
        setColleges(collegesRes.data?.allSubsciptions || []);
      } catch (e) {
        console.error("Error fetching admin data:", e?.response?.data || e.message);
        toast.error("Failed to fetch admin data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [BACKEND_URL, token]);

  const toggleVerification = async (email) => {
    try {
      await axios.put(
        `${BACKEND_URL}/superadmin/toggle`,
        { email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Toggled verification for ${email}`);
      // Refresh colleges
      const res = await axios.get(`${BACKEND_URL}/superadmin/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setColleges(res.data?.allSubsciptions || []);
    } catch (e) {
      toast.error("Failed to toggle verification.");
    }
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/admin/report-csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `vc-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (e) {
      toast.error("Failed to download report.");
    } finally {
      setDownloading(false);
    }
  };

  const verified = colleges.filter((c) => c.isVerified);
  const unverified = colleges.filter((c) => !c.isVerified);

  return (
    <>
      <NAV />
      <div className="gc-page-wide" style={{ paddingTop: "88px" }}>
        <div className="gc-animate-in">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "2px" }}>Admin Dashboard</h1>
              <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px", margin: 0 }}>
                Platform analytics & management
              </p>
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              style={{
                padding: "12px 24px", borderRadius: "12px", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #4285f4 0%, #1a56db 100%)",
                color: "#fff", fontSize: "14px", fontWeight: 600,
                display: "flex", alignItems: "center", gap: "8px",
                boxShadow: "0 4px 16px rgba(66,133,244,0.3)", transition: "all 0.2s",
                opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : (
                "📥"
              )}
              Download Report
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px" }}>
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <>
              {/* Stat Cards Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "40px",
              }}>
                {STAT_CARDS.map((card) => (
                  <div
                    key={card.key}
                    className="gc-card gc-animate-in"
                    style={{
                      padding: "24px 20px",
                      position: "relative",
                      overflow: "hidden",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "";
                    }}
                  >
                    <div style={{
                      position: "absolute", top: "-8px", right: "-8px",
                      width: "64px", height: "64px", borderRadius: "50%",
                      background: `${card.color}15`, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: "28px", opacity: 0.7,
                    }}>
                      {card.icon}
                    </div>
                    <div style={{ fontSize: "2rem", fontWeight: 700, color: card.color, marginBottom: "4px" }}>
                      {analytics?.[card.key] ?? 0}
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--gc-text-secondary)", fontWeight: 500 }}>
                      {card.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Users */}
              {analytics?.recentUsers > 0 && (
                <div className="gc-card" style={{ padding: "20px", marginBottom: "32px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: "40px", height: "40px", borderRadius: "10px",
                    background: "rgba(66,133,244,0.12)", fontSize: "20px",
                  }}>📈</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "15px" }}>{analytics.recentUsers} new users this week</div>
                    <div style={{ fontSize: "12px", color: "var(--gc-text-secondary)" }}>Joined in the last 7 days</div>
                  </div>
                </div>
              )}

              {/* Top Classrooms */}
              {analytics?.topClassrooms?.length > 0 && (
                <div style={{ marginBottom: "40px" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px" }}>📚 Top Classrooms</h3>
                  <div className="gc-card" style={{ overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ background: "var(--gc-bg)", textAlign: "left" }}>
                          <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--gc-text-secondary)" }}>Classroom</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--gc-text-secondary)" }}>Subject</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--gc-text-secondary)" }}>Teacher</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--gc-text-secondary)", textAlign: "center" }}>Students</th>
                          <th style={{ padding: "12px 16px", fontWeight: 600, color: "var(--gc-text-secondary)" }}>Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topClassrooms.map((c, i) => (
                          <tr key={i} style={{ borderTop: "1px solid var(--gc-border)" }}>
                            <td style={{ padding: "12px 16px", fontWeight: 500 }}>{c.name}</td>
                            <td style={{ padding: "12px 16px", color: "var(--gc-text-secondary)" }}>{c.subject}</td>
                            <td style={{ padding: "12px 16px", color: "var(--gc-text-secondary)" }}>{c.teacher}</td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <span style={{
                                background: "rgba(66,133,244,0.1)", color: "#4285f4",
                                padding: "4px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 600,
                              }}>{c.studentCount}</span>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <code style={{ background: "var(--gc-bg)", padding: "4px 8px", borderRadius: "6px", fontSize: "12px" }}>{c.code}</code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Teacher Verification */}
              <div style={{ marginBottom: "40px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  👨‍🏫 Teacher Verification
                </h3>

                {/* Pending */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{
                      background: "rgba(220,38,38,0.1)", color: "#dc2626",
                      padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                    }}>{unverified.length}</span>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--gc-text-secondary)" }}>Pending</span>
                  </div>
                  {unverified.length === 0 ? (
                    <p style={{ color: "var(--gc-text-disabled)", fontStyle: "italic", fontSize: "13px" }}>No pending teachers</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
                      {unverified.map((c) => (
                        <div key={c._id} className="gc-card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              width: "40px", height: "40px", borderRadius: "50%",
                              background: "rgba(220,38,38,0.1)", color: "#dc2626",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "16px", fontWeight: 700,
                            }}>
                              {(c.name || c.email)?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: "14px" }}>{c.name || c.email}</div>
                              <div style={{ fontSize: "12px", color: "var(--gc-text-secondary)" }}>{c.email}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleVerification(c.email)}
                            style={{
                              padding: "8px 18px", borderRadius: "10px", border: "none",
                              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                              color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            ✓ Verify
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verified */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{
                      background: "rgba(22,163,106,0.1)", color: "#16a34a",
                      padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                    }}>{verified.length}</span>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--gc-text-secondary)" }}>Verified</span>
                  </div>
                  {verified.length === 0 ? (
                    <p style={{ color: "var(--gc-text-disabled)", fontStyle: "italic", fontSize: "13px" }}>No verified teachers yet</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "12px" }}>
                      {verified.map((c) => (
                        <div key={c._id} className="gc-card" style={{ padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div style={{
                              width: "40px", height: "40px", borderRadius: "50%",
                              background: "rgba(22,163,106,0.1)", color: "#16a34a",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "16px", fontWeight: 700,
                            }}>
                              {(c.name || c.email)?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 500, fontSize: "14px" }}>{c.name || c.email}</div>
                              <div style={{ fontSize: "12px", color: "var(--gc-text-secondary)" }}>{c.email}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleVerification(c.email)}
                            style={{
                              padding: "8px 18px", borderRadius: "10px", border: "1px solid rgba(220,38,38,0.3)",
                              background: "rgba(220,38,38,0.08)",
                              color: "#dc2626", fontSize: "13px", fontWeight: 500, cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            Unverify
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default SuperAdminContent;

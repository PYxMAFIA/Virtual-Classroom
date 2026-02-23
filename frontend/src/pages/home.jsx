import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import NAV from "../components/navbar";
import { Spinner, Modal, Form } from "react-bootstrap";
import toast from "react-hot-toast";
import { getToken, getUser } from "../utils/auth";

const COLORS = [
  "var(--gc-blue)", "#0d9488", "#7c3aed", "#be185d",
  "#d97706", "#059669", "#6366f1", "#dc2626"
];

const Home = () => {
  const navigate = useNavigate();
  const [myClassrooms, setMyClassrooms] = useState([]);
  const [exploreClassrooms, setExploreClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [newClass, setNewClass] = useState({ name: "", subject: "", section: "" });

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
  const token = getToken();
  const user = getUser();
  const isTeacher = user?.role === "teacher";
  const isLoggedIn = !!token;

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const [myRes, allRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/classroom/my-classrooms`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${BACKEND_URL}/classroom/all`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const myCls = myRes.data.classrooms || [];
        const allCls = allRes.data.classrooms || [];

        setMyClassrooms(myCls);

        // Explore: show classes not already in "my classrooms"
        const myIds = new Set(myCls.map(c => c._id));
        setExploreClassrooms(allCls.filter(c => !myIds.has(c._id)));
      } catch (err) {
        console.error("Error fetching classrooms:", err?.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, BACKEND_URL]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        `${BACKEND_URL}/classroom/create`,
        { name: newClass.name, subject: newClass.subject, section: newClass.section },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Classroom created!");
      setShowCreate(false);
      setNewClass({ name: "", subject: "", section: "" });
      const code = res.data?.classroom?.code || res.data?.classroom?.classroomCode;
      if (code) navigate(`/classroom/${code}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create classroom");
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${BACKEND_URL}/classroom/join`,
        { code: joinInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Joined classroom!");
      setShowJoin(false);
      setJoinInput("");
      // Refresh
      window.location.reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to join classroom");
    }
  };

  const ClassCard = ({ c, index, showJoinBtn }) => {
    const color = COLORS[index % COLORS.length];
    const code = c.code || c.classroomCode;
    const teacherName = typeof c.teacher === "object" ? c.teacher?.name : c.teacherName || "";

    return (
      <div
        className="gc-card gc-animate-in"
        style={{
          overflow: "hidden",
          cursor: showJoinBtn ? "default" : "pointer",
          transition: "box-shadow 0.2s"
        }}
        onClick={showJoinBtn ? undefined : () => navigate(`/classroom/${code}`)}
        onMouseEnter={(e) => !showJoinBtn && (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)")}
        onMouseLeave={(e) => !showJoinBtn && (e.currentTarget.style.boxShadow = "")}
      >
        <div style={{
          background: color,
          height: "80px",
          padding: "16px 20px",
          color: "white",
          position: "relative"
        }}>
          <h3 style={{
            color: "white", margin: 0, fontSize: "1.1rem",
            fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
          }}>
            {c.name}
          </h3>
          {c.subject && (
            <p style={{ color: "rgba(255,255,255,0.8)", margin: "2px 0 0 0", fontSize: "13px" }}>
              {c.subject}
            </p>
          )}
          {c.section && (
            <p style={{ color: "rgba(255,255,255,0.6)", margin: "2px 0 0 0", fontSize: "12px" }}>
              Section: {c.section}
            </p>
          )}
          <div style={{
            position: "absolute", top: "12px", right: "16px",
            width: "56px", height: "56px", borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "26px", fontWeight: 700, color: "white"
          }}>
            {c.name?.charAt(0)?.toUpperCase()}
          </div>
        </div>
        <div style={{ padding: "12px 20px 16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {teacherName && (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--gc-text-secondary)" }}>
                {teacherName}
              </p>
            )}
            <p style={{ margin: 0, fontSize: "12px", color: "var(--gc-text-secondary)" }}>
              {c.students?.length || 0} students {code && `• ${code}`}
            </p>
          </div>
          {showJoinBtn && (
            <button
              className="gc-btn gc-btn-primary"
              style={{ fontSize: "13px", padding: "6px 16px" }}
              onClick={(e) => {
                e.stopPropagation();
                setJoinInput(code);
                setShowJoin(true);
              }}
            >
              Join
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="gc-center"><Spinner animation="border" variant="primary" /></div>;

  return (
    <>
      <NAV />
      <div className="gc-page-wide" style={{ paddingTop: "88px" }}>
        {/* Not logged in */}
        {!isLoggedIn && (
          <div className="gc-center" style={{ minHeight: "60vh", flexDirection: "column" }}>
            <div style={{ fontSize: "64px", marginBottom: "12px" }}>🏫</div>
            <h1 style={{ fontSize: "2rem", marginBottom: "8px" }}>Virtual Classroom</h1>
            <p style={{ color: "var(--gc-text-secondary)", marginBottom: "24px" }}>A collaborative learning platform for teachers and students.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="gc-btn gc-btn-primary" onClick={() => navigate("/admin/login")}>Login</button>
              <button className="gc-btn gc-btn-secondary" onClick={() => navigate("/admin/register")}>Register</button>
            </div>
          </div>
        )}

        {/* Logged in */}
        {isLoggedIn && (
          <>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 500, marginBottom: "2px" }}>
                  Welcome, {user?.name || "User"} 👋
                </h2>
                <p style={{ margin: 0, color: "var(--gc-text-secondary)", fontSize: "14px" }}>
                  {isTeacher ? "Manage your classrooms and assignments." : "View your enrolled classes and assignments."}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {isTeacher ? (
                  <>
                    <button className="gc-btn gc-btn-primary" onClick={() => setShowCreate(true)}>
                      + Create Classroom
                    </button>
                    <button className="gc-btn gc-btn-secondary" onClick={() => navigate("/evaluate")}>
                      🤖 AI Workspace
                    </button>
                  </>
                ) : (
                  <button className="gc-btn gc-btn-primary" onClick={() => setShowJoin(true)}>
                    + Join Classroom
                  </button>
                )}
              </div>
            </div>

            {/* My Classes */}
            <div style={{ marginBottom: "40px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "16px" }}>
                {isTeacher ? "My Classes" : "Enrolled Classes"}
              </h3>
              {myClassrooms.length === 0 ? (
                <div className="gc-empty-state" style={{ padding: "40px" }}>
                  <div className="gc-empty-icon">{isTeacher ? "📚" : "🎒"}</div>
                  <h3>{isTeacher ? "No classrooms yet" : "Not enrolled in any class"}</h3>
                  <p>{isTeacher ? "Create your first classroom to get started." : "Join a classroom using a class code."}</p>
                  {isTeacher ? (
                    <button className="gc-btn gc-btn-primary" onClick={() => setShowCreate(true)}>
                      + Create Classroom
                    </button>
                  ) : (
                    <button className="gc-btn gc-btn-primary" onClick={() => setShowJoin(true)}>
                      + Join Classroom
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "20px",
                }}>
                  {myClassrooms.map((c, i) => (
                    <ClassCard key={c._id} c={c} index={i} showJoinBtn={false} />
                  ))}
                </div>
              )}
            </div>

            {/* Explore Classes (for students) */}
            {!isTeacher && exploreClassrooms.length > 0 && (
              <div style={{ marginBottom: "40px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 500, marginBottom: "16px" }}>
                  Explore Classes
                </h3>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "20px",
                }}>
                  {exploreClassrooms.map((c, i) => (
                    <ClassCard key={c._id} c={c} index={i + 100} showJoinBtn={true} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Classroom Modal */}
      <Modal show={showCreate} onHide={() => setShowCreate(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Classroom</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreate}>
            <Form.Group className="mb-3">
              <Form.Label>Class Name *</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="e.g. Data Structures"
                value={newClass.name}
                onChange={e => setNewClass({ ...newClass, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Computer Science"
                value={newClass.subject}
                onChange={e => setNewClass({ ...newClass, subject: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Section</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. Section A"
                value={newClass.section}
                onChange={e => setNewClass({ ...newClass, section: e.target.value })}
              />
            </Form.Group>
            <button className="gc-btn gc-btn-primary" type="submit" style={{ width: "100%" }}>
              Create
            </button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Join Classroom Modal */}
      <Modal show={showJoin} onHide={() => setShowJoin(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Join Classroom</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleJoin}>
            <Form.Group className="mb-3">
              <Form.Label>Class Code or Join Link</Form.Label>
              <Form.Control
                type="text"
                required
                placeholder="Enter class code or paste join link"
                value={joinInput}
                onChange={e => setJoinInput(e.target.value)}
              />
            </Form.Group>
            <button className="gc-btn gc-btn-primary" type="submit" style={{ width: "100%" }}>
              Join
            </button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Home;

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import NAV from "../components/navbar";
import { Spinner, Tabs, Tab, Modal, Form, Badge } from "react-bootstrap";
import toast from "react-hot-toast";
import { getToken, getUser } from "../utils/auth";
import { io } from "socket.io-client";

const ClassroomDetail = () => {
    const { classroomCode } = useParams();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("stream");
    const user = getUser();
    const [assignments, setAssignments] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [newAssignment, setNewAssignment] = useState({ title: "", description: "", dueDate: "" });
    const [assignmentFile, setAssignmentFile] = useState(null);
    const [lastCaption, setLastCaption] = useState(null);
    const [mySubmissions, setMySubmissions] = useState({}); // { assignmentId: submission }

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const token = getToken();

    // Helper to safely get teacher ID from populated or unpopulated field
    const getTeacherId = (cls) => {
        if (!cls?.teacher) return null;
        if (typeof cls.teacher === "object") return cls.teacher._id;
        return cls.teacher;
    };

    const getTeacherName = (cls) => {
        if (!cls?.teacher) return cls?.teacherName || "Unknown teacher";
        if (typeof cls.teacher === "object") return cls.teacher.name || cls.teacher.email || cls.teacherName || "Unknown teacher";
        return cls.teacherName || "Unknown teacher";
    };

    const isTeacher = classroom ? String(getTeacherId(classroom)) === String(user?.id) : false;
    const isMember = isTeacher || (classroom?.students?.some(s => {
        const sid = typeof s === "object" ? s._id : s;
        return String(sid) === String(user?.id);
    }) ?? false);

    const fetchClassroom = useCallback(async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/classroom/${classroomCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClassroom(response.data.classroom);
        } catch (err) {
            toast.error("Classroom not found");
            navigate("/");
        } finally {
            setLoading(false);
        }
    }, [classroomCode, BACKEND_URL, navigate, token]);

    useEffect(() => {
        fetchClassroom();
    }, [fetchClassroom]);

    // Fetch assignments when classroom is loaded
    useEffect(() => {
        if (classroom?._id && token) {
            const fetchAssignments = async () => {
                try {
                    const response = await axios.get(`${BACKEND_URL}/assignment/classroom/${classroom._id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setAssignments(response.data.assignments || []);
                } catch (err) {
                    console.error("Error fetching assignments:", err?.response?.data?.message || err.message);
                }
            };
            fetchAssignments();
        }
    }, [classroom?._id, BACKEND_URL, token]);

    // Fetch student's own submissions for each assignment
    useEffect(() => {
        if (!isTeacher && assignments.length > 0 && token) {
            const fetchMySubmissions = async () => {
                const subs = {};
                for (const a of assignments) {
                    try {
                        const res = await axios.get(`${BACKEND_URL}/submission/my?assignmentId=${a._id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (res.data.submission) {
                            subs[a._id] = res.data.submission;
                        }
                    } catch {
                        // Not submitted yet — ignore
                    }
                }
                setMySubmissions(subs);
            };
            fetchMySubmissions();
        }
    }, [assignments, isTeacher, BACKEND_URL, token]);

    // Socket.io for meet status + captions
    useEffect(() => {
        if (!classroom?._id) return;

        const socket = io(BACKEND_URL, { transports: ["websocket"] });
        socket.emit('join:classroom', { classroomId: classroom._id });

        socket.on('meet:status', (payload) => {
            if (payload?.classroomId !== classroom._id) return;
            setClassroom((prev) => ({
                ...prev,
                activeMeet: !!payload.active,
                meetRoomId: payload.roomId,
                meetLink: payload.meetLink,
            }));
        });

        socket.on('meet:caption', (payload) => {
            if (payload?.classroomId !== classroom._id) return;
            setLastCaption(payload);
        });

        return () => {
            socket.emit('leave:classroom', { classroomId: classroom._id });
            socket.disconnect();
        };
    }, [classroom?._id, BACKEND_URL]);

    const handleJoin = async () => {
        try {
            await axios.post(`${BACKEND_URL}/classroom/join`,
                { code: classroom.code },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Joined classroom!");
            fetchClassroom();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to join");
        }
    };

    const handleStartMeet = async () => {
        try {
            const createRoomRes = await axios.post(`${BACKEND_URL}/meet/create-room`);
            const { roomId } = createRoomRes.data;

            await axios.post(`${BACKEND_URL}/meet/start-classroom-meet`,
                { classroomId: classroom._id, roomId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("Meet started!");
            navigate(`/meet/${roomId}?classroomId=${classroom._id}`);
        } catch (err) {
            toast.error("Failed to start meet");
        }
    };

    const handleJoinMeet = () => {
        const roomId = classroom?.meetRoomId;
        if (classroom?.activeMeet && roomId) {
            navigate(`/meet/${roomId}?classroomId=${classroom._id}`);
        }
    };

    const handleCreateAssignment = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newAssignment.title);
            formData.append('description', newAssignment.description);
            formData.append('dueDate', newAssignment.dueDate);
            formData.append('classroomId', classroom._id);
            if (assignmentFile) formData.append('file', assignmentFile);

            await axios.post(`${BACKEND_URL}/assignment/create`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
            });
            toast.success("Assignment created");
            setShowAssignModal(false);
            setNewAssignment({ title: "", description: "", dueDate: "" });
            setAssignmentFile(null);
            // Refresh assignments
            const response = await axios.get(`${BACKEND_URL}/assignment/classroom/${classroom._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignments(response.data.assignments || []);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to create assignment");
        }
    };

    if (loading) return <div className="gc-center"><Spinner animation="border" variant="primary" /></div>;
    if (!classroom) return null;

    return (
        <>
            <NAV />
            <div className="gc-page-wide" style={{ paddingTop: "88px" }}>
                {/* Banner */}
                <div className="class-card-header" style={{
                    height: "240px",
                    borderRadius: "12px",
                    background: "var(--gc-blue)",
                    marginBottom: "24px",
                    position: "relative",
                    overflow: "hidden"
                }}>
                    <div style={{ position: "absolute", bottom: "24px", left: "24px", color: "white" }}>
                        <h1 style={{ color: "white", marginBottom: "4px" }}>{classroom.name}</h1>
                        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "1.1rem", margin: 0 }}>{classroom.subject}</p>
                        {classroom.section && (
                            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", margin: 0, marginTop: "2px" }}>
                                Section: {classroom.section}
                            </p>
                        )}
                    </div>
                    <div style={{ position: "absolute", top: "24px", right: "24px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <span className="gc-chip" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>
                            Code: {classroom.code}
                        </span>
                        {isTeacher && (
                            <span className="gc-chip" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
                                Teacher
                            </span>
                        )}
                    </div>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="gc-tabs mb-4"
                    style={{ borderBottom: "1px solid var(--gc-border)" }}
                >
                    {/* ============= STREAM TAB ============= */}
                    <Tab eventKey="stream" title="Stream">
                        <div className="row" style={{ marginTop: "16px" }}>
                            <div className="col-md-3">
                                {/* Meet card */}
                                <div className="gc-card" style={{ padding: "20px", marginBottom: "20px", border: classroom.activeMeet ? "1px solid #22c55e" : undefined }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                                        <h4 style={{ fontSize: "15px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                                            📹 Classroom Meet
                                        </h4>
                                        {classroom.activeMeet && (
                                            <span style={{
                                                display: "inline-flex", alignItems: "center", gap: "6px",
                                                background: "rgba(34,197,94,0.12)", color: "#16a34a",
                                                padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600
                                            }}>
                                                <span style={{
                                                    width: "8px", height: "8px", borderRadius: "50%",
                                                    background: "#22c55e", display: "inline-block",
                                                    animation: "pulse-live 1.5s infinite"
                                                }} />
                                                LIVE
                                            </span>
                                        )}
                                    </div>
                                    {!isMember ? (
                                        <div style={{
                                            background: "var(--gc-bg)", borderRadius: "10px",
                                            padding: "14px", fontSize: "13px", color: "var(--gc-text-secondary)", textAlign: "center"
                                        }}>
                                            Join this class to participate in live meets.
                                        </div>
                                    ) : classroom.activeMeet ? (
                                        <button
                                            onClick={handleJoinMeet}
                                            style={{
                                                width: "100%", padding: "14px 20px", borderRadius: "12px",
                                                border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 600,
                                                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                                                boxShadow: "0 4px 16px rgba(34,197,94,0.3)", transition: "all 0.2s"
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(34,197,94,0.4)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(34,197,94,0.3)"; }}
                                        >
                                            <span style={{
                                                width: "10px", height: "10px", borderRadius: "50%",
                                                background: "#fff", display: "inline-block",
                                                animation: "pulse-live 1.5s infinite"
                                            }} />
                                            Join Live Session
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStartMeet}
                                            style={{
                                                width: "100%", padding: "14px 20px", borderRadius: "12px",
                                                border: "none", cursor: "pointer", fontSize: "15px", fontWeight: 600,
                                                background: "linear-gradient(135deg, var(--gc-blue) 0%, #1a56db 100%)",
                                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                                                boxShadow: "0 4px 16px rgba(66,133,244,0.3)", transition: "all 0.2s"
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(66,133,244,0.4)"; }}
                                            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 16px rgba(66,133,244,0.3)"; }}
                                        >
                                            📹 Start a Meet
                                        </button>
                                    )}

                                    {lastCaption?.text && (
                                        <div style={{ marginTop: "14px", fontSize: "12px", color: "var(--gc-text-secondary)" }}>
                                            <div style={{ fontWeight: 500, color: "var(--gc-text-primary)", marginBottom: "6px" }}>
                                                💬 Live captions
                                            </div>
                                            <div style={{ padding: "10px 12px", borderRadius: "10px", background: "var(--gc-bg)", lineHeight: 1.5 }}>
                                                {lastCaption.text}
                                            </div>
                                        </div>
                                    )}
                                    <style>{`@keyframes pulse-live { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }`}</style>
                                </div>

                                {/* Join class card (for non-members) */}
                                {!isMember && !isTeacher && token && (
                                    <div className="gc-card" style={{ padding: "16px", background: "var(--gc-blue-light)" }}>
                                        <p style={{ fontSize: "13px", marginBottom: "12px" }}>You are not a member of this classroom yet.</p>
                                        <button className="gc-btn gc-btn-primary" style={{ width: "100%" }} onClick={handleJoin}>
                                            Join Classroom
                                        </button>
                                    </div>
                                )}

                                {/* Class info for teachers */}
                                {isTeacher && (
                                    <div className="gc-card" style={{ padding: "16px" }}>
                                        <h4 style={{ fontSize: "14px", fontWeight: 500, marginBottom: "10px" }}>Class Info</h4>
                                        <div style={{ fontSize: "12px", color: "var(--gc-text-secondary)" }}>
                                            <p style={{ margin: "4px 0" }}>Students: <strong>{classroom.students?.length || 0}</strong></p>
                                            <p style={{ margin: "4px 0" }}>Assignments: <strong>{assignments.length}</strong></p>
                                            {classroom.code && (
                                                <div style={{ marginTop: "8px" }}>
                                                    <p style={{ margin: "4px 0", fontWeight: 500, color: "var(--gc-text-primary)" }}>Join link:</p>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={`${window.location.origin}/classroom/${classroom.code}`}
                                                        style={{
                                                            width: "100%",
                                                            padding: "6px 8px",
                                                            borderRadius: "6px",
                                                            border: "1px solid var(--gc-border)",
                                                            fontSize: "11px",
                                                            background: "var(--gc-bg)"
                                                        }}
                                                        onClick={(e) => {
                                                            e.target.select();
                                                            navigator.clipboard.writeText(`${window.location.origin}/classroom/${classroom.code}`);
                                                            toast.success("Link copied!");
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="col-md-9">
                                <div className="gc-animate-in">
                                    {assignments.length === 0 ? (
                                        <div className="gc-empty-state" style={{ padding: "40px" }}>
                                            <div className="gc-empty-icon">📋</div>
                                            <h3>No announcements yet</h3>
                                            <p>This is where assignments and updates will appear.</p>
                                        </div>
                                    ) : (
                                        assignments.map(a => (
                                            <div key={a._id} className="gc-card" style={{
                                                padding: "16px",
                                                marginBottom: "16px",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "16px",
                                                cursor: "pointer",
                                            }} onClick={() => setActiveTab("classwork")}>
                                                <div style={{
                                                    background: "var(--gc-blue-light)",
                                                    color: "var(--gc-blue)",
                                                    width: "40px",
                                                    height: "40px",
                                                    borderRadius: "50%",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                    fontSize: "18px"
                                                }}>
                                                    📝
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <h5 style={{ fontSize: "14px", margin: 0, fontWeight: 500 }}>
                                                        {getTeacherName(classroom)} posted a new assignment: {a.title}
                                                    </h5>
                                                    <p style={{ fontSize: "12px", margin: 0, color: "var(--gc-text-secondary)" }}>
                                                        {new Date(a.createdAt).toLocaleDateString()}
                                                        {a.dueDate && ` • Due ${new Date(a.dueDate).toLocaleDateString()}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tab>

                    {/* ============= CLASSWORK TAB ============= */}
                    <Tab eventKey="classwork" title="Classwork">
                        <div style={{ maxWidth: "800px", margin: "0 auto", paddingTop: "16px" }}>
                            {isTeacher && (
                                <button className="gc-btn gc-btn-primary mb-4" onClick={() => setShowAssignModal(true)}>
                                    + Create Assignment
                                </button>
                            )}

                            {assignments.length === 0 ? (
                                <div className="gc-empty-state" style={{ padding: "40px" }}>
                                    <div className="gc-empty-icon">📎</div>
                                    <h3>No assignments yet</h3>
                                    <p>{isTeacher ? "Create your first assignment using the button above." : "Your teacher hasn't posted any assignments yet."}</p>
                                </div>
                            ) : (
                                <div className="gc-animate-in">
                                    {assignments.map(a => (
                                        <div key={a._id} className="gc-card" style={{ padding: "20px", marginBottom: "16px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <div>
                                                    <h4 style={{ color: "var(--gc-blue)", marginBottom: "8px", fontSize: "1.1rem" }}>{a.title}</h4>
                                                    {a.description && <p style={{ margin: "0 0 8px 0", color: "var(--gc-text-secondary)", fontSize: "14px" }}>{a.description}</p>}
                                                </div>
                                                {a.dueDate && (
                                                    <span style={{
                                                        fontSize: "12px",
                                                        color: new Date(a.dueDate) < new Date() ? "var(--gc-red)" : "var(--gc-text-secondary)",
                                                        whiteSpace: "nowrap",
                                                        flexShrink: 0
                                                    }}>
                                                        Due: {new Date(a.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                                                {!isMember ? (
                                                    <p style={{ fontSize: "12px", color: "var(--gc-text-secondary)", fontStyle: "italic", margin: 0 }}>
                                                        Join class to view details or submit work.
                                                    </p>
                                                ) : isTeacher ? (
                                                    <>
                                                        <button className="gc-btn gc-btn-secondary" onClick={() => navigate(`/review-submissions?assignmentId=${a._id}`)}>
                                                            View Submissions
                                                        </button>
                                                        {(a.fileUrl || a.fileURL) && (
                                                            <button className="gc-btn gc-btn-text" onClick={() => window.open(`${BACKEND_URL}${a.fileUrl || a.fileURL}`, "_blank")}>
                                                                📄 View Attachment
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="gc-btn gc-btn-primary" onClick={() => navigate(`/upload?assignmentId=${a._id}`)}>
                                                            Submit Work
                                                        </button>
                                                        {(a.fileUrl || a.fileURL) && (
                                                            <button className="gc-btn gc-btn-secondary" onClick={() => window.open(`${BACKEND_URL}${a.fileUrl || a.fileURL}`, "_blank")}>
                                                                📄 Download Assignment
                                                            </button>
                                                        )}
                                                        {/* Show student's submission status */}
                                                        {mySubmissions[a._id] && (
                                                            <div style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "8px",
                                                                marginLeft: "auto"
                                                            }}>
                                                                <Badge bg="success" style={{ fontSize: "11px" }}>✓ Submitted</Badge>
                                                                {mySubmissions[a._id].isPublished && (
                                                                    <Badge bg="primary" style={{ fontSize: "11px" }}>
                                                                        Score: {mySubmissions[a._id].aiScore ?? mySubmissions[a._id].marks ?? "-"}/10
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Show published AI feedback for students */}
                                            {!isTeacher && mySubmissions[a._id]?.isPublished && mySubmissions[a._id]?.aiFeedback && (
                                                <div style={{
                                                    marginTop: "12px",
                                                    padding: "12px",
                                                    background: "var(--gc-bg)",
                                                    borderRadius: "8px",
                                                    fontSize: "13px"
                                                }}>
                                                    <div style={{ fontWeight: 500, marginBottom: "6px", color: "var(--gc-blue)" }}>AI Feedback:</div>
                                                    <div style={{ whiteSpace: "pre-wrap", color: "var(--gc-text-secondary)" }}>
                                                        {mySubmissions[a._id].aiFeedback}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Tab>

                    {/* ============= PEOPLE TAB ============= */}
                    <Tab eventKey="people" title="People">
                        <div style={{ maxWidth: "800px", margin: "0 auto", paddingTop: "16px" }}>
                            <div style={{ marginBottom: "40px" }}>
                                <h2 style={{ color: "var(--gc-blue)", borderBottom: "1px solid var(--gc-blue)", paddingBottom: "12px", marginBottom: "20px", fontSize: "1.3rem" }}>
                                    Teacher
                                </h2>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "16px" }}>
                                    <div style={{
                                        width: "36px", height: "36px", borderRadius: "50%",
                                        background: "var(--gc-blue)", color: "white",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontWeight: 600, fontSize: "14px"
                                    }}>
                                        {getTeacherName(classroom).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: "15px", margin: 0, fontWeight: 500 }}>{getTeacherName(classroom)}</p>
                                        {typeof classroom.teacher === "object" && classroom.teacher.email && (
                                            <p style={{ fontSize: "12px", margin: 0, color: "var(--gc-text-secondary)" }}>{classroom.teacher.email}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 style={{ color: "var(--gc-blue)", borderBottom: "1px solid var(--gc-blue)", paddingBottom: "12px", marginBottom: "20px", fontSize: "1.3rem" }}>
                                    Students ({classroom.students?.length || 0})
                                </h2>
                                {classroom.students?.length === 0 ? (
                                    <p style={{ fontStyle: "italic", marginLeft: "16px", color: "var(--gc-text-secondary)" }}>No students enrolled yet.</p>
                                ) : (
                                    classroom.students?.map((s, i) => {
                                        const sName = typeof s === "object" ? (s.name || s.email || "Student") : "Student";
                                        const sEmail = typeof s === "object" ? s.email : "";
                                        return (
                                            <div key={i} style={{
                                                display: "flex", alignItems: "center", gap: "12px",
                                                marginLeft: "16px", padding: "8px 0",
                                                borderBottom: i < classroom.students.length - 1 ? "1px solid var(--gc-border-light)" : "none"
                                            }}>
                                                <div style={{
                                                    width: "32px", height: "32px", borderRadius: "50%",
                                                    background: "var(--gc-green)", color: "white",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontWeight: 600, fontSize: "13px"
                                                }}>
                                                    {sName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: "14px", margin: 0 }}>{sName}</p>
                                                    {sEmail && <p style={{ fontSize: "12px", margin: 0, color: "var(--gc-text-secondary)" }}>{sEmail}</p>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </Tab>
                </Tabs>
            </div>

            {/* Assignment Creation Modal */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Create Assignment</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleCreateAssignment}>
                        <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control
                                type="text"
                                required
                                value={newAssignment.title}
                                onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description (instructions for students)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={newAssignment.description}
                                onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Due Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={newAssignment.dueDate}
                                onChange={e => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Attachment (optional)</Form.Label>
                            <Form.Control
                                type="file"
                                onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                            />
                        </Form.Group>
                        <button className="gc-btn gc-btn-primary" type="submit" style={{ width: "100%" }}>
                            Create Assignment
                        </button>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default ClassroomDetail;

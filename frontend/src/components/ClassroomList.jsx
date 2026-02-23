import React, { useState, useEffect } from "react";
import axios from "axios";
import { Spinner } from "react-bootstrap";
import { getToken } from "../utils/auth";

const ClassroomList = ({ classrooms: classroomsProp, loading: loadingProp }) => {
    const [classrooms, setClassrooms] = useState(classroomsProp || []);
    const [loading, setLoading] = useState(loadingProp ?? true);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    useEffect(() => {
        // If parent provides classrooms, just render them.
        if (Array.isArray(classroomsProp)) {
            setClassrooms(classroomsProp);
            setLoading(loadingProp ?? false);
            return;
        }

        const fetchClassrooms = async () => {
            const token = getToken();
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`${BACKEND_URL}/classroom/my-classrooms`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log("✅ Fetched classrooms:", response.data?.classrooms?.length || 0);
                setClassrooms(response.data?.classrooms || []);
            } catch (err) {
                console.error("❌ Error fetching classrooms:", err?.response?.data || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchClassrooms();
    }, [BACKEND_URL, classroomsProp, loadingProp]);

    const colors = ["blue", "green", "orange", "purple", "teal", "red"];
    const icons = ["📚", "🧪", "📐", "💻", "🎨", "🔬"];

    if (loading) {
        return (
            <div style={{ textAlign: "center", padding: "32px" }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (classrooms.length === 0) {
        return (
            <div className="gc-empty-state" style={{ padding: "32px" }}>
                <div className="gc-empty-icon">🏫</div>
                <h3>No classrooms yet</h3>
                <p>Classrooms created by teachers will appear here</p>
            </div>
        );
    }

    return (
        <div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: "16px",
                }}
            >
                {classrooms.map((classroom, index) => (
                    <div
                        key={classroom._id}
                        className={`class-card class-card-${colors[index % colors.length]}`}
                        onClick={() => window.location.href = `/classroom/${classroom.code}`}
                    >
                        <div className="class-card-header">
                            <span className="class-card-icon">{icons[index % icons.length]}</span>
                            <h3>{classroom.name}</h3>
                            <p>{classroom.subject}{classroom.section ? ` • ${classroom.section}` : ''}</p>
                        </div>
                        <div className="class-card-body">
                            <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <p style={{ margin: 0 }}>
                                    {classroom.teacherName || 'Unknown teacher'}
                                </p>
                                <span className="gc-chip" style={{ fontSize: "11px" }}>
                                    {classroom.code}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClassroomList;

import React, { useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import axios from "axios";
import toast from 'react-hot-toast';
import { getToken } from "../utils/auth";

const JoinClassroom = ({ onJoined }) => {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const token = getToken();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!code.trim()) {
            toast.error("Class code is required.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${BACKEND_URL}/classroom/join`,
                { code: code.toUpperCase() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("Joined classroom!");
            setCode("");
            setShowForm(false);
            if (onJoined) onJoined(response.data.classroom);
        } catch (err) {
            console.error("❌ Error joining classroom:", err?.response?.data || err.message);
            toast.error(err?.response?.data?.message || "Failed to join classroom.");
        } finally {
            setLoading(false);
        }
    };

    if (!showForm) {
        return (
            <button
                className="gc-btn gc-btn-secondary"
                onClick={() => setShowForm(true)}
                style={{ marginBottom: "20px" }}
            >
                Join Classroom
            </button>
        );
    }

    return (
        <div className="elevated-card gc-animate-in" style={{ padding: "24px", marginBottom: "20px", maxWidth: "480px" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 500, marginBottom: "16px" }}>Join Classroom</h3>
            <p style={{ fontSize: "12px", color: "var(--gc-text-secondary)", marginBottom: "16px" }}>
                Ask your teacher for the class code, then enter it here.
            </p>
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Class Code</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="e.g. ABC123"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                    />
                </Form.Group>

                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        className="gc-btn gc-btn-primary"
                        type="submit"
                        disabled={loading}
                        style={{ padding: "10px 24px" }}
                    >
                        {loading ? (
                            <Spinner as="span" animation="border" size="sm" role="status" />
                        ) : (
                            "Join"
                        )}
                    </button>
                    <button
                        className="gc-btn gc-btn-secondary"
                        type="button"
                        onClick={() => setShowForm(false)}
                        style={{ padding: "10px 24px" }}
                    >
                        Cancel
                    </button>
                </div>
            </Form>
        </div>
    );
};

export default JoinClassroom;

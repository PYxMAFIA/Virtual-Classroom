import React, { useState } from "react";
import { Form, Spinner } from "react-bootstrap";
import axios from "axios";
import toast from 'react-hot-toast';
import { getToken } from "../utils/auth";

const CreateClassroom = ({ onCreated }) => {
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [section, setSection] = useState("");
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
    const token = getToken();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim() || !subject.trim()) {
            toast.error("Name and subject are required.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${BACKEND_URL}/classroom/create`,
                { name, subject, section },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log("✅ Classroom created:", response.data.classroom.code);
            toast.success(`Classroom created! Code: ${response.data.classroom.code}`);
            setName("");
            setSubject("");
            setSection("");
            setShowForm(false);
            if (onCreated) onCreated(response.data.classroom);
        } catch (err) {
            console.error("❌ Error creating classroom:", err?.response?.data || err.message);
            toast.error(err?.response?.data?.message || "Failed to create classroom.");
        } finally {
            setLoading(false);
        }
    };

    if (!showForm) {
        return (
            <button
                className="gc-btn gc-btn-primary"
                onClick={() => setShowForm(true)}
                style={{ marginBottom: "20px" }}
            >
                + Create Classroom
            </button>
        );
    }

    return (
        <div className="elevated-card gc-animate-in" style={{ padding: "24px", marginBottom: "20px", maxWidth: "480px" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 500, marginBottom: "16px" }}>New Classroom</h3>
            <Form onSubmit={handleSubmit}>
                <div style={{ display: "flex", gap: "12px" }}>
                    <Form.Group className="mb-3" style={{ flex: 1 }}>
                        <Form.Label>Class Name</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="e.g. Mathematics 101"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" style={{ flex: 1 }}>
                        <Form.Label>Subject</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="e.g. Math"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />
                    </Form.Group>
                </div>

                <Form.Group className="mb-3">
                    <Form.Label>Section (optional)</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="e.g. Section A"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
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
                            "Create"
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

export default CreateClassroom;

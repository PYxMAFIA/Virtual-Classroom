import React from "react";
import { useNavigate } from "react-router-dom";
import NAV from "./navbar";
import CreateClassroom from "./CreateClassroom";

const AdminContent = ({ handleContent }) => {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Student Homework",
      subtitle: "Review and verify student submissions",
      icon: "📥",
      color: "blue",
      onClick: () => handleContent(2),
    },
    {
      title: "Upload Homework",
      subtitle: "Upload verified assignments for students",
      icon: "📤",
      color: "green",
      onClick: () => handleContent(3),
    },
    {
      title: "Check Homework (AI)",
      subtitle: "Auto-evaluate using AI-powered grading",
      icon: "🧠",
      color: "orange",
      onClick: () => navigate("/evaluate"),
    },
    {
      title: "Take Class",
      subtitle: "Start or join a live video class",
      icon: "📹",
      color: "purple",
      onClick: () => navigate("/meet"),
    },
  ];

  return (
    <>
      <NAV />
      <div className="gc-page" style={{ paddingTop: "88px" }}>
        {/* Header */}
        <div style={{ marginBottom: "24px" }} className="gc-animate-in">
          <h1 style={{ fontSize: "1.5rem", fontWeight: 500 }}>Teacher Dashboard</h1>
          <p style={{ color: "var(--gc-text-secondary)", fontSize: "14px" }}>
            Manage your classroom
          </p>
        </div>

        {/* Create Classroom */}
        <CreateClassroom />

        {/* Action Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "20px",
          }}
          className="gc-animate-in"
        >
          {actions.map((card, index) => (
            <div
              key={index}
              className={`class-card class-card-${card.color}`}
              onClick={card.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && card.onClick()}
            >
              <div className="class-card-header">
                <span className="class-card-icon">{card.icon}</span>
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
              </div>
              <div className="class-card-body">
                <p>Click to open</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AdminContent;

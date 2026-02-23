import React from "react";
import { useNavigate } from "react-router-dom";

// SVG icon components for clean, professional look
const MicOnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const CamOnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);

const CamOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h12v15.28" />
    <polygon points="23 7 16 12 23 17 23 7" />
  </svg>
);

const CaptionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M7 12h2m4 0h4" />
    <path d="M7 16h10" />
  </svg>
);

const AiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4m0 14v4M4.22 4.22l2.83 2.83m9.9 9.9l2.83 2.83M1 12h4m14 0h4M4.22 19.78l2.83-2.83m9.9-9.9l2.83-2.83" />
  </svg>
);

const LeaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" />
    <line x1="23" y1="1" x2="17" y2="7" />
    <line x1="17" y1="1" x2="23" y2="7" />
  </svg>
);

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

function Controls({
  micOn,
  webcamOn,
  captionsActive,
  aiPanelActive,
  onToggleMic,
  onToggleCam,
  onToggleCaptions,
  onToggleAiPanel,
  onLeave,
  onEndMeet,
  classroomId,
}) {
  const navigate = useNavigate();

  return (
    <div className="meet-controls">
      <div className="meet-controls-center">
        {/* Back to Classroom */}
        {classroomId && (
          <>
            <button
              className="meet-ctrl-btn"
              onClick={() => navigate(`/classroom/${classroomId}`)}
            >
              <BackIcon />
              <span className="meet-ctrl-tooltip">Back to Classroom</span>
            </button>
            <div className="meet-ctrl-divider" />
          </>
        )}

        {/* Mic */}
        <button
          className={`meet-ctrl-btn ${micOn ? "active" : "off"}`}
          onClick={onToggleMic}
        >
          {micOn ? <MicOnIcon /> : <MicOffIcon />}
          <span className="meet-ctrl-tooltip">
            {micOn ? "Mute" : "Unmute"}
          </span>
        </button>

        {/* Camera */}
        <button
          className={`meet-ctrl-btn ${webcamOn ? "active" : "off"}`}
          onClick={onToggleCam}
        >
          {webcamOn ? <CamOnIcon /> : <CamOffIcon />}
          <span className="meet-ctrl-tooltip">
            {webcamOn ? "Turn off camera" : "Turn on camera"}
          </span>
        </button>

        <div className="meet-ctrl-divider" />

        {/* Captions */}
        <button
          className={`meet-ctrl-btn ${captionsActive ? "panel-active" : ""}`}
          onClick={onToggleCaptions}
        >
          <CaptionsIcon />
          <span className="meet-ctrl-tooltip">
            {captionsActive ? "Hide captions" : "Show captions"}
          </span>
        </button>

        {/* AI Summarizer */}
        <button
          className={`meet-ctrl-btn ${aiPanelActive ? "panel-active" : ""}`}
          onClick={onToggleAiPanel}
        >
          <AiIcon />
          <span className="meet-ctrl-tooltip">
            {aiPanelActive ? "Close AI Summary" : "AI Summary"}
          </span>
        </button>

        <div className="meet-ctrl-divider" />

        {/* Leave */}
        <button className="meet-leave-btn" onClick={onLeave}>
          <LeaveIcon />
          <span>Leave</span>
          <span className="meet-ctrl-tooltip">Leave meeting</span>
        </button>

        {/* End Meet for All (teacher only) */}
        {onEndMeet && (
          <button
            className="meet-leave-btn"
            onClick={onEndMeet}
            style={{
              background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
              marginLeft: "6px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="9" x2="15" y2="15" />
              <line x1="15" y1="9" x2="9" y2="15" />
            </svg>
            <span>End Meet</span>
            <span className="meet-ctrl-tooltip">End meeting for everyone</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default Controls;

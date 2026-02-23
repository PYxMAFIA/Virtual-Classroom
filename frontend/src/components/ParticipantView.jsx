import React, { useEffect, useRef } from "react";
import { useParticipant, usePubSub } from "@videosdk.live/react-sdk";

function ParticipantView({ participantId }) {
  const micRef = useRef(null);

  const { webcamStream, webcamOn, micStream, micOn, isLocal, displayName } =
    useParticipant(participantId);
  const webcamRef = useRef(null);

  // Handle webcam video
  useEffect(() => {
    if (webcamRef.current) {
      if (webcamOn && webcamStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(webcamStream.track);
        webcamRef.current.srcObject = mediaStream;
        webcamRef.current
          .play()
          .catch((e) => console.error("webcam play error:", e));
      } else {
        webcamRef.current.srcObject = null;
      }
    }
  }, [webcamStream, webcamOn]);

  // Handle mic audio
  useEffect(() => {
    if (micRef.current) {
      if (micOn && micStream) {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(micStream.track);
        micRef.current.srcObject = mediaStream;
        micRef.current
          .play()
          .catch((e) => console.error("mic play error:", e));
      } else {
        micRef.current.srcObject = null;
      }
    }
  }, [micStream, micOn]);

  // Focus mode
  const { messages } = usePubSub("focus-mode");
  const CLEAR_FOCUS = "__CLEAR_FOCUS__";
  const lastMsg = messages?.length
    ? messages[messages.length - 1].message
    : null;
  const focusedId = lastMsg === CLEAR_FOCUS ? null : lastMsg;
  const isFocused = participantId === focusedId;

  const getInitials = (name = "User") => {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "U";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  };

  return (
    <div className={`meet-tile${isFocused ? " focused" : ""}`}>
      {/* Mic audio (hidden) */}
      <audio ref={micRef} autoPlay playsInline muted={isLocal} />

      {webcamOn ? (
        <div className="meet-tile-video">
          <video ref={webcamRef} autoPlay playsInline muted />
        </div>
      ) : (
        <div className="meet-tile-placeholder">
          <div className="meet-tile-avatar">{getInitials(displayName)}</div>
          <span className="meet-tile-cam-off-label">Camera is off</span>
        </div>
      )}

      {/* Name badge overlay */}
      <div className="meet-tile-info">
        <span className="meet-tile-name">
          {displayName || "Guest"}
          {isLocal && <span className="you-tag">You</span>}
        </span>
        <span
          className={`meet-tile-mic-icon ${micOn ? "mic-on" : "mic-off"}`}
        >
          {micOn ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </span>
      </div>
    </div>
  );
}

export default ParticipantView;

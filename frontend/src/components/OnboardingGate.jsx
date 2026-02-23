import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const STORAGE_KEY = "vc_onboarding_v1_done";

const tutorialSteps = [
  {
    title: "Welcome to Virtual Classroom",
    body: "This short tour shows how to join classes, manage assignments, and start a live session.",
  },
  {
    title: "Join or create a class",
    body: "Students join with a class code or a shared link. Teachers can create a class and share the code with students.",
  },
  {
    title: "Assignments & submissions",
    body: "Teachers post assignments with optional attachments. Students submit their work, and results appear once published.",
  },
  {
    title: "Live class (Meet)",
    body: "Start a session, share the room, and use live captions. You can also generate an AI summary from the captions.",
  },
];

function Backdrop({ children }) {
  return (
    <div className="vc-onboarding-backdrop" role="dialog" aria-modal="true">
      <div className="vc-onboarding-surface">{children}</div>
    </div>
  );
}

function Prompt({ onStart, onSkip }) {
  return (
    <Backdrop>
      <div className="vc-onboarding-header">
        <div className="vc-onboarding-badge">VC</div>
        <div>
          <div className="vc-onboarding-title">Need a quick tutorial?</div>
          <div className="vc-onboarding-subtitle">
            You can skip it and start immediately.
          </div>
        </div>
      </div>

      <div className="vc-onboarding-actions">
        <button className="gc-btn gc-btn-primary" onClick={onStart}>
          Yes, show me
        </button>
        <button className="gc-btn gc-btn-secondary" onClick={onSkip}>
          Skip
        </button>
      </div>
    </Backdrop>
  );
}

function Tutorial({ onFinish }) {
  const [step, setStep] = useState(0);
  const current = tutorialSteps[step];

  const canBack = step > 0;
  const isLast = step === tutorialSteps.length - 1;

  return (
    <Backdrop>
      <div className="vc-onboarding-title">{current.title}</div>
      <div className="vc-onboarding-subtitle">{current.body}</div>

      <div className="vc-onboarding-progress" aria-label="Tutorial progress">
        {tutorialSteps.map((_, idx) => (
          <div
            key={idx}
            className={
              idx === step
                ? "vc-onboarding-dot vc-onboarding-dot-active"
                : "vc-onboarding-dot"
            }
          />
        ))}
      </div>

      <div className="vc-onboarding-actions">
        <button
          className="gc-btn gc-btn-secondary"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={!canBack}
        >
          Back
        </button>

        {!isLast ? (
          <button
            className="gc-btn gc-btn-primary"
            onClick={() => setStep((s) => Math.min(tutorialSteps.length - 1, s + 1))}
          >
            Next
          </button>
        ) : (
          <button className="gc-btn gc-btn-primary" onClick={onFinish}>
            Finish
          </button>
        )}
      </div>
    </Backdrop>
  );
}

export default function OnboardingGate({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [stage, setStage] = useState("idle"); // idle | prompt | tutorial | done

  const shouldShow = useMemo(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!shouldShow) {
      setStage("done");
      return;
    }
    setStage("prompt");
  }, [shouldShow]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setStage("done");
    if (location.pathname !== "/") navigate("/");
  };

  return (
    <>
      {children}
      {stage === "prompt" && (
        <Prompt onStart={() => setStage("tutorial")} onSkip={finish} />
      )}
      {stage === "tutorial" && <Tutorial onFinish={finish} />}
    </>
  );
}

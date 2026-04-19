import React from "react";
import { Spinner } from "react-bootstrap";
import { useGlobalLoading } from "../context/GlobalLoadingContext";

const GlobalLoader = () => {
  const { isGlobalLoading } = useGlobalLoading();

  if (!isGlobalLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.18)",
        backdropFilter: "blur(1px)",
        WebkitBackdropFilter: "blur(1px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "all",
      }}
    >
      <div
        style={{
          background: "var(--gc-surface)",
          border: "1px solid var(--gc-border)",
          borderRadius: "14px",
          padding: "14px 18px",
          boxShadow: "var(--gc-shadow-2)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "var(--gc-text-primary)",
          fontWeight: 500,
        }}
      >
        <Spinner animation="border" size="sm" role="status" />
        <span>Loading...</span>
      </div>
    </div>
  );
};

export default GlobalLoader;


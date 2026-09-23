import React from "react";
import LandingRoute from "../landing/LandingRoute.jsx";

/**
 * Compatibility wrapper for the legacy auth entry point.
 * LandingRoute is the single canonical public/auth surface; keeping this
 * wrapper preserves existing imports while preventing two auth UIs from
 * drifting apart.
 */
export default function AuthLanding({ onAuthenticated }) {
  const isReset = typeof window !== "undefined" && window.location.pathname === "/reset-password";
  return <LandingRoute initialAuthMode={isReset ? "reset" : null} onAuthenticated={onAuthenticated} />;
}

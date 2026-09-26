import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AppErrorBoundary from "./ui/AppErrorBoundary.jsx";
import "./styles.css";
import "./ui/designSystem.css";
import "./ui/alignment.css";
import "./ui/mobileNavigation.css";
import "./ui/visualPolish.css";
import "./features/landing/landing.css";
import "./ui/matureVisualSystem.css";

createRoot(document.getElementById("root")).render(<AppErrorBoundary><React.Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }} role="status" aria-live="polite">Loading S…</div>}><App /></React.Suspense></AppErrorBoundary>);

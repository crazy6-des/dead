import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import PreviewMode from "./preview/PreviewMode";
import "./styles.css";
import "./ui/designSystem.css";
import "./ui/alignment.css";

const isFeedPreview = new URLSearchParams(window.location.search).get("preview") === "feed";

createRoot(document.getElementById("root")).render(isFeedPreview ? <PreviewMode /> : <App />);
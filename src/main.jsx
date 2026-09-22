import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./ui/designSystem.css";
import "./ui/alignment.css";
import "./ui/mobileNavigation.css";
import "./ui/visualPolish.css";

createRoot(document.getElementById("root")).render(<App />);

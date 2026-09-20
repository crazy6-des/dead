import React from "react";
import FeedPreview from "../features/feed/FeedPreview";
import "../features/feed/feedPreview.css";

export default function PreviewMode() {
  return (
    <main className="s-preview-mode">
      <div className="s-preview-mode__bar">
        <strong>S Preview Mode</strong>
        <span>Isolated design review · no production data</span>
        <a href="/">Return to app</a>
      </div>
      <FeedPreview />
    </main>
  );
}

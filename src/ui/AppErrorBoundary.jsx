import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("S_RUNTIME_RENDER_ERROR", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message || "Unknown render error";
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#fff", color: "#111" }}>
        <div style={{ width: "min(680px, 100%)", fontFamily: "system-ui, sans-serif" }}>
          <strong>S hit a rendering error.</strong>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message}</p>
          <button type="button" onClick={() => window.location.reload()}>Reload S</button>
        </div>
      </div>
    );
  }
}

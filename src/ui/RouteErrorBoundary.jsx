import React from "react";

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("S_ROUTE_RENDER_ERROR", {
      route: this.props.route,
      error,
      componentStack: info?.componentStack || "",
    });
  }

  componentDidUpdate(previousProps) {
    if (previousProps.route !== this.props.route && this.state.error) {
      this.setState({ error: null });
    }
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error?.message || "This section could not be rendered.";
    return (
      <section className="page route-error" role="alert" aria-live="assertive">
        <div className="heading">
          <small>RECOVERABLE ERROR</small>
          <h2>This section hit an error</h2>
          <p>S stayed open. You can retry this section or return Home without reloading the whole app.</p>
        </div>
        <div className="card route-error__card">
          <p>{message}</p>
          <div className="page-actions">
            <button type="button" className="primary" onClick={this.retry}>Try again</button>
            <button type="button" className="outline" onClick={() => this.props.onHome?.()}>Home</button>
          </div>
        </div>
      </section>
    );
  }
}

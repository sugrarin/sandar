"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: "1rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>
            Что-то пошло не так.
          </p>
          <button
            className="action-button"
            style={{ padding: "0.875rem 2rem" }}
            onClick={() => window.location.reload()}
          >
            <span className="action-button__label">Обновить страницу</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

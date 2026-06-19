import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-screen">
          <section>
            <h1>Habit Flow не смог загрузиться</h1>
            <p>{this.state.error.message}</p>
            <button
              onClick={() => {
                localStorage.removeItem("habit-flow:v1");
                window.location.reload();
              }}
            >
              Сбросить локальные данные
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);

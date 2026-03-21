import { lazy, memo } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useStudio } from "../studio/StudioContext";
import { AppBoundary } from "./components/AppBoundary";

const TemplateListPage = lazy(() =>
  import("./pages/TemplateListPage").then((module) => ({ default: module.TemplateListPage }))
);
const TemplateBuilderPage = lazy(() =>
  import("./pages/TemplateBuilderPage").then((module) => ({ default: module.TemplateBuilderPage }))
);
const ScenarioListPage = lazy(() =>
  import("./pages/ScenarioListPage").then((module) => ({ default: module.ScenarioListPage }))
);
const ScenarioCreatePage = lazy(() =>
  import("./pages/ScenarioCreatePage").then((module) => ({ default: module.ScenarioCreatePage }))
);
const ScenarioEditorPage = lazy(() =>
  import("./pages/ScenarioEditorPage").then((module) => ({ default: module.ScenarioEditorPage }))
);
const SnippetLibraryPage = lazy(() =>
  import("./pages/SnippetLibraryPage").then((module) => ({ default: module.SnippetLibraryPage }))
);
const SnippetDetailPage = lazy(() =>
  import("./pages/SnippetDetailPage").then((module) => ({ default: module.SnippetDetailPage }))
);

interface RoleToggleProps {
  currentRole: "editor" | "admin";
  onChange: (role: "editor" | "admin") => void;
  size?: "default" | "small";
}

const RoleToggle = memo(function RoleToggle({
  currentRole,
  onChange,
  size = "default"
}: RoleToggleProps) {
  return (
    <div
      className={`segmented-control${size === "small" ? " small" : ""}`}
      role="group"
      aria-label="Session role"
    >
      <button
        type="button"
        className={currentRole === "editor" ? "segmented active" : "segmented"}
        onClick={() => onChange("editor")}
        aria-pressed={currentRole === "editor"}
      >
        Editor
      </button>
      <button
        type="button"
        className={currentRole === "admin" ? "segmented active" : "segmented"}
        onClick={() => onChange("admin")}
        aria-pressed={currentRole === "admin"}
      >
        Admin
      </button>
    </div>
  );
});

export function App() {
  const { currentRole, setRole } = useStudio();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="app-sidebar" aria-label="Workspace navigation">
        <div>
          <p className="eyebrow">Prompt Infrastructure</p>
          <h1>Prompt Studio</h1>
          <p className="sidebar-copy">
            Templates define structure. Scenarios instantiate templates with form
            values and snippets.
          </p>
        </div>

        <nav className="nav-links" aria-label="Primary sections">
          <NavLink
            to="/templates"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Template Library
          </NavLink>
          <NavLink
            to="/scenarios"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Scenario Library
          </NavLink>
          <NavLink
            to="/snippets"
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            Snippet Library
          </NavLink>
        </nav>

        <section className="role-panel" aria-labelledby="session-role-title">
          <span className="field-label" id="session-role-title">
            Session Role
          </span>
          <RoleToggle currentRole={currentRole} onChange={setRole} />
          <p className="muted-copy">
            Admin can edit snippets, restore versions, and open raw template mode.
          </p>
        </section>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div className="topbar-left">
            <p className="eyebrow">Workspace</p>
            <div className="topbar-title-row">
              <h2 className="topbar-title">Prompt Studio</h2>
              <span className="pill subtle">Role: {currentRole}</span>
            </div>
            <p className="page-copy">
              Build and test templates, scenarios, and snippets in one place. Jump back into
              what you were working on or start something new quickly.
            </p>
          </div>
          <div className="topbar-actions">
            <RoleToggle currentRole={currentRole} onChange={setRole} size="small" />
            <div className="topbar-buttons">
              {currentRole === "admin" ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => navigate("/templates/new")}
                  aria-label="Create a new template"
                >
                  New template
                </button>
              ) : null}
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/scenarios/new")}
                aria-label="Create a new scenario"
              >
                New scenario
              </button>
            </div>
          </div>
        </header>

        <main className="app-main" id="main-content" tabIndex={-1}>
          <div className="page-container">
            <AppBoundary>
              <Routes>
                <Route path="/" element={<Navigate to="/templates" replace />} />
                <Route path="/templates" element={<TemplateListPage />} />
                <Route path="/templates/new" element={<TemplateBuilderPage />} />
                <Route path="/templates/:templateId" element={<TemplateBuilderPage />} />
                <Route path="/scenarios" element={<ScenarioListPage />} />
                <Route path="/scenarios/new" element={<ScenarioCreatePage />} />
                <Route path="/scenarios/:scenarioId" element={<ScenarioEditorPage />} />
                <Route path="/snippets" element={<SnippetLibraryPage />} />
                <Route path="/snippets/:snippetId" element={<SnippetDetailPage />} />
              </Routes>
            </AppBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

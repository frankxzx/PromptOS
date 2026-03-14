import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useStudio } from "../studio/StudioContext";
import { ScenarioEditorPage } from "./pages/ScenarioEditorPage";
import { ScenarioListPage } from "./pages/ScenarioListPage";
import { ScenarioCreatePage } from "./pages/ScenarioCreatePage";
import { SnippetDetailPage } from "./pages/SnippetDetailPage";
import { SnippetLibraryPage } from "./pages/SnippetLibraryPage";
import { TemplateBuilderPage } from "./pages/TemplateBuilderPage";
import { TemplateListPage } from "./pages/TemplateListPage";

export function App() {
  const { currentRole, setRole } = useStudio();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div>
          <p className="eyebrow">Prompt Infrastructure</p>
          <h1>Prompt Studio</h1>
          <p className="sidebar-copy">
            Templates define structure. Scenarios instantiate templates with form
            values and snippets.
          </p>
        </div>

        <nav className="nav-links">
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

        <section className="role-panel">
          <span className="field-label">Session Role</span>
          <div className="segmented-control">
            <button
              type="button"
              className={currentRole === "editor" ? "segmented active" : "segmented"}
              onClick={() => setRole("editor")}
            >
              Editor
            </button>
            <button
              type="button"
              className={currentRole === "admin" ? "segmented active" : "segmented"}
              onClick={() => setRole("admin")}
            >
              Admin
            </button>
          </div>
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
            <div className="segmented-control small">
              <button
                type="button"
                className={currentRole === "editor" ? "segmented active" : "segmented"}
                onClick={() => setRole("editor")}
              >
                Editor
              </button>
              <button
                type="button"
                className={currentRole === "admin" ? "segmented active" : "segmented"}
                onClick={() => setRole("admin")}
              >
                Admin
              </button>
            </div>
            <div className="topbar-buttons">
              {currentRole === "admin" ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => navigate("/templates/new")}
                >
                  New template
                </button>
              ) : null}
              <button
                type="button"
                className="primary-button"
                onClick={() => navigate("/scenarios/new")}
              >
                New scenario
              </button>
            </div>
          </div>
        </header>

        <main className="app-main">
          <div className="page-container">
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
          </div>
        </main>
      </div>
    </div>
  );
}

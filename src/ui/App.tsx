import { NavLink, Navigate, Route, Routes } from "react-router-dom";
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

      <main className="app-main">
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
      </main>
    </div>
  );
}

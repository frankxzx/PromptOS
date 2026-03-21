import { lazy, memo } from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom";
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
  const { currentRole, scenarios, setRole, snippets, templates } = useStudio();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const currentSurface = getCurrentSurface(pathname);
  const workspaceStats = [
    { label: "Templates", value: templates.length },
    { label: "Scenarios", value: scenarios.length },
    { label: "Snippets", value: snippets.length }
  ];

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside className="app-sidebar" aria-label="Workspace navigation">
        <div className="app-sidebar-primary">
          <div className="app-brand">
            <p className="eyebrow">Prompt Engineering Studio</p>
            <h1>PromptOS</h1>
            <p className="sidebar-copy">
              Author templates, bind scenarios, and version prompt blocks in one
              deliberate workspace.
            </p>
          </div>

          <nav className="nav-links" aria-label="Primary sections">
            <NavLink
              to="/templates"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-link-label">Template Library</span>
              <span className="nav-link-copy">Structures, variants, and test cases</span>
            </NavLink>
            <NavLink
              to="/scenarios"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-link-label">Scenario Library</span>
              <span className="nav-link-copy">Pinned instances and live previews</span>
            </NavLink>
            <NavLink
              to="/snippets"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-link-label">Snippet Library</span>
              <span className="nav-link-copy">Reusable blocks and version history</span>
            </NavLink>
          </nav>
        </div>

        <div className="app-sidebar-footer">
          <section className="sidebar-metrics" aria-label="Workspace counts">
            {workspaceStats.map((stat) => (
              <div key={stat.label} className="sidebar-stat">
                <span className="sidebar-stat-value">{stat.value}</span>
                <span className="sidebar-stat-label">{stat.label}</span>
              </div>
            ))}
          </section>

          <section className="role-panel" aria-labelledby="session-role-title">
            <span className="field-label" id="session-role-title">
              Session Role
            </span>
            <RoleToggle currentRole={currentRole} onChange={setRole} />
            <p className="muted-copy">
              Admin unlocks raw template mode, snippet edits, and version restores.
            </p>
          </section>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div className="topbar-left">
            <p className="eyebrow">{currentSurface.kicker}</p>
            <div className="topbar-title-row">
              <h2 className="topbar-title">{currentSurface.title}</h2>
            </div>
            <p className="page-copy">{currentSurface.description}</p>
          </div>
          <div className="topbar-actions">
            <span className="workspace-status">
              <span className="workspace-status-dot" aria-hidden="true" />
              Local session
            </span>
            <span className="pill subtle">Role: {currentRole}</span>
            <RoleToggle currentRole={currentRole} onChange={setRole} size="small" />
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate(pathname.startsWith("/templates") ? "/templates/new" : "/scenarios/new")
              }
              aria-label={
                pathname.startsWith("/templates")
                  ? "Create a new template"
                  : "Create a new scenario"
              }
            >
              {pathname.startsWith("/templates") ? "New template" : "New scenario"}
            </button>
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

function getCurrentSurface(pathname: string) {
  if (pathname.startsWith("/templates/new") || /^\/templates\/[^/]+$/.test(pathname)) {
    return {
      kicker: "Template Builder",
      title: "Template workspace",
      description: "Define the prompt contract, author variants, and keep test output nearby."
    };
  }

  if (pathname.startsWith("/templates")) {
    return {
      kicker: "Template Library",
      title: "Template overview",
      description: "Scan structures, filter build modes, and jump back into active template work."
    };
  }

  if (pathname.startsWith("/scenarios/new")) {
    return {
      kicker: "Scenario Create",
      title: "Scenario setup",
      description: "Pin a template version first, then move into variable binding and preview."
    };
  }

  if (/^\/scenarios\/[^/]+$/.test(pathname)) {
    return {
      kicker: "Scenario Editor",
      title: "Scenario workspace",
      description: "Keep fields, snippet bindings, and rendered output visible in one flow."
    };
  }

  if (pathname.startsWith("/scenarios")) {
    return {
      kicker: "Scenario Library",
      title: "Scenario overview",
      description: "Track pinned instances, readiness, and ownership without extra dashboard chrome."
    };
  }

  if (/^\/snippets\/[^/]+$/.test(pathname)) {
    return {
      kicker: "Snippet Detail",
      title: "Snippet versioning",
      description: "Review current content, downstream usage, and version history on a single surface."
    };
  }

  return {
    kicker: "Snippet Library",
    title: "Snippet overview",
    description: "Manage reusable prompt blocks with low-noise metadata and fast version access."
  };
}

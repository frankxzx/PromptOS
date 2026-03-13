import { Link, useNavigate } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useStudio } from "../../studio/StudioContext";

export function TemplateListPage() {
  const { currentRole, templates } = useStudio();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ready">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "visual" | "structured" | "raw">(
    "all"
  );
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        if (statusFilter !== "all" && template.status !== statusFilter) {
          return false;
        }
        if (modeFilter !== "all" && template.templateMode !== modeFilter) {
          return false;
        }
        if (!deferredSearch) {
          return true;
        }
        return `${template.name} ${template.businessDomain} ${template.description}`
          .toLowerCase()
          .includes(deferredSearch.toLowerCase());
      }),
    [deferredSearch, modeFilter, statusFilter, templates]
  );

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Template Library</p>
          <h2>Prompt templates</h2>
          <p className="page-copy">
            Define structure, variables, conditions, and allowed snippet slots.
          </p>
        </div>
        <div className="header-actions">
          {currentRole === "admin" ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => navigate("/templates/new")}
            >
              Add template
            </button>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate(`/templates/${templates[0]?.id ?? ""}`)}
            disabled={templates.length === 0}
          >
            Open featured template
          </button>
        </div>
      </header>

      <section className="toolbar-panel">
        <label className="field">
          <span className="field-label">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates"
          />
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Mode</span>
          <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value as typeof modeFilter)}>
            <option value="all">All</option>
            <option value="visual">Visual</option>
            <option value="structured">Structured</option>
            <option value="raw">Raw</option>
          </select>
        </label>
      </section>

      <div className="table-card">
        <table className="studio-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Slots</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.map((template) => (
              <tr key={template.id}>
                <td>
                  <Link to={`/templates/${template.id}`} className="table-link">
                    {template.name}
                  </Link>
                  <p className="table-subcopy">{template.description}</p>
                </td>
                <td>{template.businessDomain}</td>
                <td>
                  <span className={`status-pill ${template.status}`}>{template.status}</span>
                </td>
                <td>{template.templateMode}</td>
                <td>{template.slots.length}</td>
                <td>v{template.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

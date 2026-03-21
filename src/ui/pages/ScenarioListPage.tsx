import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStudio } from "../../studio/StudioContext";

export function ScenarioListPage() {
  const { scenarios, templates } = useStudio();
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ready">("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const templateNameById = useMemo(
    () => new Map(templates.map((template) => [template.id, template.name])),
    [templates]
  );

  const filteredScenarios = useMemo(
    () =>
      scenarios.filter((scenario) => {
        if (statusFilter !== "all" && scenario.status !== statusFilter) {
          return false;
        }
        if (!deferredSearch) {
          return true;
        }
        const templateName = templateNameById.get(scenario.templateId) ?? "";
        return `${scenario.name} ${scenario.description} ${templateName}`
          .toLowerCase()
          .includes(deferredSearch.toLowerCase());
      }),
    [deferredSearch, scenarios, statusFilter, templateNameById]
  );

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Scenario Library</p>
          <h2>Template instances</h2>
          <p className="page-copy">
            Each scenario binds a concrete template to variable values and pinned
            snippets.
          </p>
        </div>
        <Link to="/scenarios/new" className="primary-button">
          Create scenario
        </Link>
      </header>

      <section className="toolbar-panel two-up">
        <label className="field">
          <span className="field-label">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scenarios"
          />
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
          </select>
        </label>
      </section>

      <div className="table-card">
        <div className="table-scroll">
          <table className="studio-table" aria-label="Scenario library">
            <thead>
              <tr>
                <th>Name</th>
                <th>Template</th>
                <th>Template version</th>
                <th>Status</th>
                <th>Bindings</th>
                <th>Version</th>
                <th>Last editor</th>
              </tr>
            </thead>
            <tbody>
              {filteredScenarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty">
                    No scenarios match the current filters.
                  </td>
                </tr>
              ) : (
                filteredScenarios.map((scenario) => (
                  <tr key={scenario.id}>
                    <td>
                      <Link to={`/scenarios/${scenario.id}`} className="table-link">
                        {scenario.name}
                      </Link>
                      <p className="table-subcopy">{scenario.description}</p>
                    </td>
                    <td>{templateNameById.get(scenario.templateId) ?? "-"}</td>
                    <td>v{scenario.templateVersion}</td>
                    <td>
                      <span className={`status-pill ${scenario.status}`}>{scenario.status}</span>
                    </td>
                    <td>{scenario.snippetBindings.length} slots</td>
                    <td>v{scenario.version}</td>
                    <td>{scenario.updatedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

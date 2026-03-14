import { Link, useNavigate } from "react-router-dom";
import { useDeferredValue, useMemo, useState } from "react";
import { useStudio } from "../../studio/StudioContext";
import type { SnippetStatus, SnippetType } from "../../studio/types";

export function SnippetLibraryPage() {
  const { currentRole, snippets, getScenarioUsageForSnippet, createSnippet } = useStudio();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<SnippetType | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<SnippetType>("instruction");
  const [createStatus, setCreateStatus] = useState<SnippetStatus>("active");
  const [createDescription, setCreateDescription] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  const filteredSnippets = useMemo(
    () =>
      snippets.filter((snippet) => {
        if (typeFilter !== "all" && snippet.type !== typeFilter) {
          return false;
        }
        if (!deferredSearch) {
          return true;
        }
        return `${snippet.name} ${snippet.description}`.toLowerCase().includes(
          deferredSearch.toLowerCase()
        );
      }),
    [deferredSearch, snippets, typeFilter]
  );

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Snippet Library</p>
          <h2>Reusable prompt blocks</h2>
          <p className="page-copy">
            Stable blocks selected by scenario forms and pinned to explicit versions.
          </p>
        </div>
        {currentRole === "admin" ? (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowCreate((value) => !value);
              setCreateMessage(null);
            }}
          >
            {showCreate ? "Hide create form" : "Add snippet"}
          </button>
        ) : null}
      </header>

      {showCreate ? (
        <section className="panel">
          <div className="panel-header-row">
            <div>
              <h3>Create snippet</h3>
              <p className="muted-copy">Creates the snippet and its first version.</p>
            </div>
          </div>
          {createMessage ? <div className="banner success">{createMessage}</div> : null}
          <div className="detail-grid">
            <label className="field">
              <span className="field-label">Name</span>
              <input value={createName} onChange={(event) => setCreateName(event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Type</span>
              <select
                value={createType}
                onChange={(event) => setCreateType(event.target.value as SnippetType)}
              >
                <option value="role">Role</option>
                <option value="persona">Persona</option>
                <option value="instruction">Instruction</option>
                <option value="format">Format</option>
                <option value="safety">Safety</option>
                <option value="tone">Tone</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select
                value={createStatus}
                onChange={(event) => setCreateStatus(event.target.value as SnippetStatus)}
              >
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <input
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Initial content</span>
            <textarea
              rows={8}
              value={createContent}
              onChange={(event) => setCreateContent(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              const result = createSnippet({
                name: createName,
                type: createType,
                status: createStatus,
                description: createDescription,
                content: createContent
              });
              if (!result.ok) {
                setCreateMessage(result.message ?? "Unable to create snippet.");
                return;
              }
              setCreateMessage("Snippet created.");
              if (result.snippetId) {
                navigate(`/snippets/${result.snippetId}`);
              }
            }}
          >
            Create snippet
          </button>
        </section>
      ) : null}

      <section className="toolbar-panel">
        <label className="field">
          <span className="field-label">Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search snippets"
          />
        </label>
        <label className="field">
          <span className="field-label">Type</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as SnippetType | "all")}
          >
            <option value="all">All</option>
            <option value="role">Role</option>
            <option value="persona">Persona</option>
            <option value="instruction">Instruction</option>
            <option value="format">Format</option>
            <option value="safety">Safety</option>
            <option value="tone">Tone</option>
          </select>
        </label>
      </section>

      <section className="snippet-grid">
        {filteredSnippets.map((snippet) => (
          <article key={snippet.id} className="snippet-card">
            <div className="snippet-card-top">
              <span className="snippet-type">{snippet.type}</span>
              <span className={`status-pill ${snippet.status}`}>{snippet.status}</span>
            </div>
            <h3>{snippet.name}</h3>
            <p className="card-copy">{snippet.description}</p>
            <dl className="stats-grid">
              <div>
                <dt>Current</dt>
                <dd>v{snippet.currentVersion}</dd>
              </div>
              <div>
                <dt>Usage</dt>
                <dd>{getScenarioUsageForSnippet(snippet.id).length} scenarios</dd>
              </div>
            </dl>
            <Link to={`/snippets/${snippet.id}`} className="secondary-link">
              View detail
            </Link>
          </article>
        ))}
      </section>
    </section>
  );
}

import { useDeferredValue, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStudio } from "../../studio/StudioContext";
import type { SnippetStatus, SnippetType } from "../../studio/types";
import {
  SNIPPET_STATUS_OPTIONS,
  SNIPPET_TYPE_OPTIONS
} from "../constants";

export function SnippetLibraryPage() {
  const { currentRole, scenarios, snippets, createSnippet } = useStudio();
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

  const snippetUsageCountById = useMemo(() => {
    const usage = new Map<string, number>();

    scenarios.forEach((scenario) => {
      [
        ...scenario.personaBindings,
        ...scenario.snippetBindings,
        ...scenario.variantSnippetBindings
      ].forEach((binding) => {
        if (!binding.snippetId) {
          return;
        }
        usage.set(binding.snippetId, (usage.get(binding.snippetId) ?? 0) + 1);
      });
    });

    return usage;
  }, [scenarios]);

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
            aria-expanded={showCreate}
            aria-controls="snippet-create-panel"
          >
            {showCreate ? "Hide create form" : "Add snippet"}
          </button>
        ) : null}
      </header>

      {showCreate ? (
        <section className="panel primary-panel" id="snippet-create-panel">
          <div className="panel-header-row">
            <div>
              <p className="eyebrow">Snippet creation</p>
              <h3>Create snippet</h3>
              <p className="muted-copy">Capture metadata, then author the first version.</p>
            </div>
            <span className="pill subtle">Primary</span>
          </div>
          {createMessage ? (
            <div className="banner success" role="status" aria-live="polite">
              {createMessage}
            </div>
          ) : null}
          <div className="form-section">
            <p className="section-label">Snippet metadata</p>
            <div className="field-row">
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
                  {SNIPPET_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Status</span>
                <select
                  value={createStatus}
                  onChange={(event) => setCreateStatus(event.target.value as SnippetStatus)}
                >
                  {SNIPPET_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="field">
              <span className="field-label">Description</span>
              <input
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                placeholder="What this snippet covers"
              />
            </label>
          </div>

          <div className="form-section">
            <p className="section-label">Initial content</p>
            <label className="field">
              <span className="field-label">Content</span>
              <textarea
                rows={8}
                value={createContent}
                onChange={(event) => setCreateContent(event.target.value)}
              />
            </label>
          </div>

          <div className="form-actions">
            <p className="muted-copy">Creates the snippet and its first version.</p>
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
          </div>
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
            {SNIPPET_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="library-list" aria-label="Snippet library results">
        {filteredSnippets.length === 0 ? (
          <article className="panel">
            <h3>No snippets found</h3>
            <p className="muted-copy">Adjust the filters or create a new snippet.</p>
          </article>
        ) : (
          filteredSnippets.map((snippet) => (
            <article key={snippet.id} className="library-row">
              <div className="library-row-main">
                <div className="snippet-card-top">
                  <span className="snippet-type">{snippet.type}</span>
                  <span className={`status-pill ${snippet.status}`}>{snippet.status}</span>
                </div>
                <h3 className="library-row-title">{snippet.name}</h3>
                <p className="table-subcopy">{snippet.description}</p>
              </div>

              <dl className="library-row-stats" aria-label={`${snippet.name} metadata`}>
                <div className="library-stat">
                  <dt>Current</dt>
                  <dd>v{snippet.currentVersion}</dd>
                </div>
                <div className="library-stat">
                  <dt>Usage</dt>
                  <dd>{snippetUsageCountById.get(snippet.id) ?? 0} bindings</dd>
                </div>
              </dl>

              <Link to={`/snippets/${snippet.id}`} className="secondary-link">
                Open snippet
              </Link>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

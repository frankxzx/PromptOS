import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStudio } from "../../studio/StudioContext";
import type { SnippetStatus, SnippetType } from "../../studio/types";
import { PageState } from "../components/PageState";
import {
  SNIPPET_STATUS_OPTIONS,
  SNIPPET_TYPE_OPTIONS
} from "../constants";

type MessageState =
  | { tone: "success" | "error"; text: string }
  | null;

export function SnippetDetailPage() {
  const { snippetId } = useParams();
  const {
    currentRole,
    getSnippet,
    getScenarioUsageForSnippet,
    createSnippetVersion,
    deleteSnippet,
    updateSnippetMetadata,
    restoreSnippetVersion
  } = useStudio();
  const navigate = useNavigate();

  const snippet = snippetId ? getSnippet(snippetId) : undefined;
  const usage = useMemo(
    () => (snippet ? getScenarioUsageForSnippet(snippet.id) : []),
    [getScenarioUsageForSnippet, snippet]
  );
  const currentVersion = snippet?.versions.at(-1);
  const [content, setContent] = useState(currentVersion?.content ?? "");
  const [name, setName] = useState(snippet?.name ?? "");
  const [type, setType] = useState<SnippetType>(snippet?.type ?? "instruction");
  const [status, setStatus] = useState<SnippetStatus>(snippet?.status ?? "active");
  const [description, setDescription] = useState(snippet?.description ?? "");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<MessageState>(null);

  useEffect(() => {
    setContent(currentVersion?.content ?? "");
    setName(snippet?.name ?? "");
    setType(snippet?.type ?? "instruction");
    setStatus(snippet?.status ?? "active");
    setDescription(snippet?.description ?? "");
  }, [currentVersion?.content, snippet]);

  if (!snippet) {
    return (
      <PageState
        title="Snippet not found"
        description="The requested snippet may have been deleted or the URL is no longer valid."
        action={{ label: "Back to library", to: "/snippets" }}
      />
    );
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Snippet Detail</p>
          <h2>{snippet.name}</h2>
          <p className="page-copy">{snippet.description}</p>
        </div>
        <div className="header-actions">
          <Link to="/snippets" className="secondary-button">
            Back to library
          </Link>
          {currentRole === "admin" ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (!window.confirm("Delete this snippet? This cannot be undone.")) {
                  return;
                }
                const result = deleteSnippet(snippet.id);
                if (!result.ok) {
                  setMessage({
                    tone: "error",
                    text: result.message ?? "Unable to delete snippet."
                  });
                  return;
                }
                navigate("/snippets");
              }}
            >
              Delete snippet
            </button>
          ) : null}
        </div>
      </header>

      {message ? (
        <div className={`banner ${message.tone}`} role="status" aria-live="polite">
          {message.text}
        </div>
      ) : null}

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-header-row">
            <div>
              <h3>Current version</h3>
              <p className="muted-copy">
                {snippet.type} · v{snippet.currentVersion}
              </p>
            </div>
            <span className={`status-pill ${snippet.status}`}>{snippet.status}</span>
          </div>
          <pre className="detail-pre">{currentVersion?.content}</pre>

          <div className="impact-box">
            <strong>Impact analysis</strong>
            <p>
              This snippet is referenced by {usage.length} binding{usage.length === 1 ? "" : "s"}.
            </p>
            {usage.length > 0 ? (
              <p>Most recent consumer: {usage[0].scenarioName}</p>
            ) : (
              <p>No scenario currently references this snippet.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <h3>Scenario usage</h3>
          <div className="version-list">
            {usage.length === 0 ? (
              <div className="warning-box">No scenarios currently reference this snippet.</div>
            ) : (
              usage.map((item) => (
                <article key={`${item.scenarioId}-${item.pinnedVersion}`} className="version-card">
                  <div className="panel-header-row">
                    <Link to={`/scenarios/${item.scenarioId}`} className="table-link">
                      {item.scenarioName}
                    </Link>
                    <span className="version-chip">v{item.pinnedVersion}</span>
                  </div>
                  <p className="muted-copy">{new Date(item.updatedAt).toLocaleString()}</p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header-row">
            <div>
              <h3>Version history</h3>
              <p className="muted-copy">Pinned prompt references do not auto-upgrade.</p>
            </div>
          </div>
          <div className="version-list">
            {snippet.versions
              .slice()
              .reverse()
              .map((version) => (
                <article key={version.version} className="version-card">
                  <div className="panel-header-row">
                    <div>
                      <strong>v{version.version}</strong>
                      <p className="muted-copy">{version.notes}</p>
                    </div>
                    {currentRole === "admin" ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => {
                          restoreSnippetVersion(snippet.id, version.version);
                          setMessage({
                            tone: "success",
                            text: `Snippet restored from v${version.version} as a new current version.`
                          });
                        }}
                      >
                        Restore
                      </button>
                    ) : null}
                  </div>
                  <p className="muted-copy">{new Date(version.createdAt).toLocaleString()}</p>
                </article>
              ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header-row">
            <div>
              <h3>Snippet metadata</h3>
              <p className="muted-copy">Name, type, description, and status.</p>
            </div>
          </div>
          {currentRole === "admin" ? (
            <>
              <label className="field">
                <span className="field-label">Name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">Type</span>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as SnippetType)}
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
                  value={status}
                  onChange={(event) => setStatus(event.target.value as SnippetStatus)}
                >
                  {SNIPPET_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Description</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  const result = updateSnippetMetadata(snippet.id, {
                    name,
                    type,
                    status,
                    description
                  });
                  setMessage({
                    tone: result.ok ? "success" : "error",
                    text:
                      result.ok
                        ? "Snippet metadata updated."
                        : result.message ?? "Unable to update snippet."
                  });
                }}
              >
                Save metadata
              </button>
            </>
          ) : (
            <div className="warning-box">Only Admin can edit snippet metadata.</div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header-row">
            <div>
              <h3>Create new version</h3>
              <p className="muted-copy">
                Admin only. Existing scenarios stay pinned to their current version.
              </p>
            </div>
          </div>

          {currentRole === "admin" ? (
            <>
              <label className="field">
                <span className="field-label">Content</span>
                <textarea
                  rows={10}
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Release note</span>
                <input value={notes} onChange={(event) => setNotes(event.target.value)} />
              </label>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const result = createSnippetVersion(snippet.id, content, notes || "Manual update.");
                  setMessage({
                    tone: result.ok ? "success" : "error",
                    text:
                      result.ok
                        ? "New snippet version created."
                        : result.message ?? "Unable to create snippet version."
                  });
                }}
              >
                Publish snippet version
              </button>
            </>
          ) : (
            <div className="warning-box">
              Only Admin can create or restore snippet versions.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

import { memo, useMemo } from "react";
import type { ScenarioPersonaBinding, Snippet } from "../../studio/types";

interface PersonaBindingsEditorProps {
  bindings: ScenarioPersonaBinding[];
  snippets: Snippet[];
  emptyMessage: string;
  onAdd: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onChangeSnippet: (index: number, snippetId: string) => void;
  onChangeVersion: (index: number, version: number) => void;
  onRemove: (index: number) => void;
  actionLabel?: string;
  showHeader?: boolean;
}

export const PersonaBindingsEditor = memo(function PersonaBindingsEditor({
  bindings,
  snippets,
  emptyMessage,
  onAdd,
  onMove,
  onChangeSnippet,
  onChangeVersion,
  onRemove,
  actionLabel = "Add persona",
  showHeader = true
}: PersonaBindingsEditorProps) {
  const personaSnippets = useMemo(
    () => snippets.filter((item) => item.type === "persona"),
    [snippets]
  );

  return (
    <>
      {showHeader ? (
        <div className="panel-header-row">
          <div>
            <h3>Persona cards</h3>
            <p className="muted-copy">
              Persona snippets shape the dialogue voice, background, and behavior.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={onAdd}>
            {actionLabel}
          </button>
        </div>
      ) : null}
      {bindings.length === 0 ? (
        <p className="muted-copy">{emptyMessage}</p>
      ) : (
        <div className="stack-list">
          {bindings.map((binding, index) => {
            const selectedSnippet = personaSnippets.find(
              (snippet) => snippet.id === binding.snippetId
            );

            return (
              <article key={binding.id} className="nested-card">
                <div className="panel-header-row">
                  <strong>Persona {index + 1}</strong>
                  <div className="inline-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onMove(index, -1)}
                      aria-label={`Move persona ${index + 1} up`}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => onMove(index, 1)}
                      aria-label={`Move persona ${index + 1} down`}
                    >
                      Down
                    </button>
                  </div>
                </div>
                <label className="field">
                  <span className="field-label">Persona snippet</span>
                  <select
                    value={binding.snippetId ?? ""}
                    onChange={(event) => onChangeSnippet(index, event.target.value)}
                    aria-label={`Persona ${index + 1} snippet`}
                  >
                    <option value="">Select persona</option>
                    {personaSnippets.map((snippet) => (
                      <option key={snippet.id} value={snippet.id}>
                        {snippet.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Pinned version</span>
                  <select
                    value={binding.pinnedVersion ?? selectedSnippet?.currentVersion ?? ""}
                    onChange={(event) => onChangeVersion(index, Number(event.target.value))}
                    disabled={!selectedSnippet}
                    aria-label={`Persona ${index + 1} version`}
                  >
                    {selectedSnippet?.versions.map((version) => (
                      <option key={version.version} value={version.version}>
                        v{version.version}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove persona ${index + 1}`}
                >
                  Remove persona
                </button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
});

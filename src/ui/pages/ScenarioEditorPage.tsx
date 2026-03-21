import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createEditableScenario, useStudio } from "../../studio/StudioContext";
import {
  getTemplateInputSchema,
  renderEvaluationPreview,
  renderScenarioPreview,
  resolveTemplateVersion
} from "../../studio/render";
import { syncScenarioToTemplateVersion } from "../../studio/operations";
import type { LanguageCode, PromptTemplate, Scenario } from "../../studio/types";
import { PageState } from "../components/PageState";
import { PersonaBindingsEditor } from "../components/PersonaBindingsEditor";
import { SchemaFieldInput } from "../components/SchemaFieldInput";
import { LANGUAGE_LABELS } from "../constants";

type ToastState = { tone: "success" | "error"; message: string } | null;

export function ScenarioEditorPage() {
  const { scenarioId } = useParams();
  const {
    currentRole,
    scenarios,
    snippets,
    deleteScenario,
    getScenario,
    getTemplate,
    saveScenarioDraft,
    restoreScenarioVersion
  } = useStudio();
  const navigate = useNavigate();
  const sourceScenario = scenarioId ? getScenario(scenarioId) : scenarios[0];
  const template = sourceScenario ? getTemplate(sourceScenario.templateId) : undefined;
  const [draft, setDraft] = useState<Scenario | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!sourceScenario || !template) {
      return;
    }
    setDraft(syncScenarioToTemplateVersion(createEditableScenario(sourceScenario), template));
  }, [sourceScenario, template]);

  const resolvedTemplate = useMemo(() => {
    if (!draft || !template) {
      return null;
    }
    return resolveTemplateVersion(template, draft.templateVersion);
  }, [draft, template]);

  const preview = useMemo(() => {
    if (!draft || !template) {
      return null;
    }
    return renderScenarioPreview(template, draft, snippets);
  }, [draft, snippets, template]);

  const evaluationPreview = useMemo(() => {
    if (!draft || !template) {
      return null;
    }
    return renderEvaluationPreview(template, draft);
  }, [draft, template]);

  if (!sourceScenario || !draft || !template || !resolvedTemplate || !preview || !evaluationPreview) {
    return (
      <PageState
        title="Scenario not found"
        description="The requested scenario may have been deleted or is no longer available."
        action={{ label: "Back to scenarios", to: "/scenarios" }}
      />
    );
  }

  const activeScenario = draft;
  const persistedScenario = sourceScenario;
  const activeTemplate: PromptTemplate = template;
  const inputSchema = useMemo(() => getTemplateInputSchema(resolvedTemplate), [resolvedTemplate]);
  const snippetVariants = useMemo(
    () => resolvedTemplate.variants.filter((variant) => variant.type === "snippet"),
    [resolvedTemplate]
  );
  const fieldVariantsByKey = useMemo(
    () => new Map(resolvedTemplate.variants.map((variant) => [variant.key, variant])),
    [resolvedTemplate]
  );
  const selectedPersonaCards = useMemo(
    () =>
      activeScenario.personaBindings.map((binding, index) => {
        const snippet = snippets.find((item) => item.id === binding.snippetId);
        const version = snippet?.versions.find((item) => item.version === binding.pinnedVersion);
        return {
          id: binding.id,
          label: `Persona ${index + 1}`,
          snippetName: snippet?.name ?? "Missing persona",
          pinnedVersion: binding.pinnedVersion,
          content: version?.content ?? "Persona content unavailable."
        };
      }),
    [activeScenario.personaBindings, snippets]
  );
  const resolvedPreviewBlocks = useMemo(
    () => preview.resolvedBlocks.filter((block) => !block.slot.startsWith("persona:")),
    [preview.resolvedBlocks]
  );

  function updateDraft(nextScenario: Scenario) {
    setDraft(nextScenario);
    setToast(null);
  }

  function updateTemplateVersion(nextVersion: number) {
    updateDraft(
      syncScenarioToTemplateVersion(
        {
          ...activeScenario,
          templateVersion: nextVersion
        },
        activeTemplate
      )
    );
  }

  function updateBinding(slot: string, snippetId: string) {
    if (!snippetId) {
      updateDraft({
        ...activeScenario,
        snippetBindings: activeScenario.snippetBindings.filter((item) => item.slot !== slot)
      });
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    const currentBinding = activeScenario.snippetBindings.find((item) => item.slot === slot);
    const nextBinding = {
      slot,
      snippetId,
      pinnedVersion: currentBinding?.pinnedVersion ?? snippet.currentVersion
    };
    const nextBindings = currentBinding
      ? activeScenario.snippetBindings.map((item) => (item.slot === slot ? nextBinding : item))
      : [...activeScenario.snippetBindings, nextBinding];
    updateDraft({ ...activeScenario, snippetBindings: nextBindings });
  }

  function updateBindingVersion(slot: string, version: number) {
    updateDraft({
      ...activeScenario,
      snippetBindings: activeScenario.snippetBindings.map((item) =>
        item.slot === slot ? { ...item, pinnedVersion: version } : item
      )
    });
  }

  function updateVariantSnippetBinding(key: string, snippetId: string) {
    if (!snippetId) {
      updateDraft({
        ...activeScenario,
        variantSnippetBindings: activeScenario.variantSnippetBindings.filter(
          (item) => item.key !== key
        )
      });
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    const currentBinding = activeScenario.variantSnippetBindings.find((item) => item.key === key);
    const nextBinding = {
      key,
      snippetId,
      pinnedVersion: currentBinding?.pinnedVersion ?? snippet.currentVersion
    };
    const nextBindings = currentBinding
      ? activeScenario.variantSnippetBindings.map((item) =>
          item.key === key ? nextBinding : item
        )
      : [...activeScenario.variantSnippetBindings, nextBinding];
    updateDraft({ ...activeScenario, variantSnippetBindings: nextBindings });
  }

  function updateVariantSnippetVersion(key: string, version: number) {
    updateDraft({
      ...activeScenario,
      variantSnippetBindings: activeScenario.variantSnippetBindings.map((item) =>
        item.key === key ? { ...item, pinnedVersion: version } : item
      )
    });
  }

  function addPersona() {
    const defaultPersona = snippets.find((item) => item.type === "persona");
    updateDraft({
      ...activeScenario,
      personaBindings: [
        ...activeScenario.personaBindings,
        {
          id: `persona-binding-${Date.now()}`,
          snippetId: defaultPersona?.id,
          pinnedVersion: defaultPersona?.currentVersion
        }
      ]
    });
  }

  function updatePersona(index: number, snippetId: string) {
    if (!snippetId) {
      updateDraft({
        ...activeScenario,
        personaBindings: activeScenario.personaBindings.filter(
          (_, itemIndex) => itemIndex !== index
        )
      });
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    updateDraft({
      ...activeScenario,
      personaBindings: activeScenario.personaBindings.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              snippetId,
              pinnedVersion: snippet.currentVersion
            }
          : item
      )
    });
  }

  function updatePersonaVersion(index: number, version: number) {
    updateDraft({
      ...activeScenario,
      personaBindings: activeScenario.personaBindings.map((item, itemIndex) =>
        itemIndex === index ? { ...item, pinnedVersion: version } : item
      )
    });
  }

  function movePersona(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= activeScenario.personaBindings.length) {
      return;
    }
    const nextBindings = [...activeScenario.personaBindings];
    [nextBindings[index], nextBindings[nextIndex]] = [
      nextBindings[nextIndex],
      nextBindings[index]
    ];
    updateDraft({
      ...activeScenario,
      personaBindings: nextBindings
    });
  }

  function save(status: "draft" | "ready") {
    const result = saveScenarioDraft(persistedScenario.id, activeScenario, status);
    if (result.ok) {
      setToast({
        tone: "success",
        message: status === "ready" ? "Scenario saved as ready." : "Scenario draft saved."
      });
      return;
    }
    setToast({ tone: "error", message: result.errors.join(" ") });
  }

  function updateEvaluationDimension(
    key: string,
    updates: Partial<Scenario["evaluationDimensions"][number]>
  ) {
    updateDraft({
      ...activeScenario,
      evaluationDimensions: activeScenario.evaluationDimensions.map((item) =>
        item.key === key ? { ...item, ...updates } : item
      )
    });
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Scenario Editor</p>
          <h2>{persistedScenario.name}</h2>
          <p className="page-copy">
            This scenario is pinned to a specific template version and surfaces that
            version&apos;s variables, variants, and slot rules.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/scenarios" className="secondary-button">
            Back to scenarios
          </Link>
          <Link to={`/templates/${template.id}`} className="secondary-button">
            Open template
          </Link>
          <button type="button" className="secondary-button" onClick={() => save("draft")}>
            Save draft
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              if (!window.confirm("Delete this scenario? This cannot be undone.")) {
                return;
              }
              const result = deleteScenario(persistedScenario.id);
              if (!result.ok) {
                setToast({ tone: "error", message: result.message ?? "Unable to delete scenario." });
                return;
              }
              navigate("/scenarios");
            }}
          >
            Delete scenario
          </button>
          <button type="button" className="primary-button" onClick={() => save("ready")}>
            Save as ready
          </button>
        </div>
      </header>

      {toast ? (
        <div className={`banner ${toast.tone}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}

      <div className="editor-shell">
        <aside className="editor-column side">
          <section className="panel">
            <div className="panel-header-row">
              <div>
                <h3>Scenario metadata</h3>
                <p className="muted-copy">
                  Keep the basics clear, then pin to the right template version.
                </p>
              </div>
              <span className="pill subtle">Primary</span>
            </div>

            <div className="form-section">
              <p className="section-label">Scenario basics</p>
              <label className="field">
                <span className="field-label">Scenario name</span>
                <input
                  value={activeScenario.name}
                  onChange={(event) =>
                    updateDraft({ ...activeScenario, name: event.target.value })
                  }
                />
              </label>
              <label className="field">
                <span className="field-label">Description</span>
                <textarea
                  rows={4}
                  value={activeScenario.description}
                  onChange={(event) =>
                    updateDraft({ ...activeScenario, description: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="form-section">
              <p className="section-label">Template binding</p>
              <div className="field-row">
                <label className="field">
                  <span className="field-label">Pinned template version</span>
                  <select
                    value={activeScenario.templateVersion}
                    onChange={(event) => updateTemplateVersion(Number(event.target.value))}
                  >
                    {activeTemplate.versions
                      .slice()
                      .reverse()
                      .map((version) => (
                        <option key={version.version} value={version.version}>
                          v{version.version}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Scenario language</span>
                  <select
                    value={activeScenario.language}
                    onChange={(event) =>
                      updateDraft({
                        ...activeScenario,
                        language: event.target.value as LanguageCode
                      })
                    }
                  >
                    {resolvedTemplate.supportedLanguages.map((language) => (
                      <option key={language} value={language}>
                        {LANGUAGE_LABELS[language]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted-copy">Template: {activeTemplate.name}</p>
            </div>
          </section>

          <section className="panel">
            <h3>Scenario fields</h3>
            {inputSchema.map((item) => (
              <label key={item.key} className="field">
                <span className="field-label">
                  {item.label}
                  {item.required ? " *" : ""}
                </span>
                <SchemaFieldInput
                  id={`scenario-field-${item.key}`}
                  item={item}
                  value={activeScenario.variableValues[item.key]}
                  missing={preview.missingVariables.includes(item.key)}
                  variantType={fieldVariantsByKey.get(item.key)?.type}
                  onChange={(value) =>
                    updateDraft({
                      ...activeScenario,
                      variableValues: {
                        ...activeScenario.variableValues,
                        [item.key]: value
                      }
                    })
                  }
                />
              </label>
            ))}
          </section>

          <section className="panel">
            <PersonaBindingsEditor
              bindings={activeScenario.personaBindings}
              snippets={snippets}
              emptyMessage="No persona cards selected. Add one if this scenario uses {{personas}}."
              onAdd={addPersona}
              onMove={movePersona}
              onChangeSnippet={updatePersona}
              onChangeVersion={updatePersonaVersion}
              onRemove={(index) => updatePersona(index, "")}
            />
          </section>

          {snippetVariants.length > 0 ? (
            <section className="panel">
              <h3>Nested snippet variants</h3>
              <div className="stack-list">
                {snippetVariants.map((variant) => {
                  const binding = activeScenario.variantSnippetBindings.find(
                    (item) => item.key === variant.key
                  );
                  const allowedSnippets = snippets.filter((snippet) =>
                    variant.allowedSnippetTypes?.includes(snippet.type)
                  );
                  const selectedSnippet = allowedSnippets.find(
                    (snippet) => snippet.id === binding?.snippetId
                  );

                  return (
                    <article key={variant.id} className="nested-card">
                      <div className="panel-header-row">
                        <div>
                          <strong>{variant.label}</strong>
                          <p className="muted-copy">{variant.description}</p>
                        </div>
                        <span className="version-chip">{variant.key}</span>
                      </div>
                      <label className="field">
                        <span className="field-label">Snippet</span>
                        <select
                          value={binding?.snippetId ?? variant.defaultSnippetId ?? ""}
                          onChange={(event) =>
                            updateVariantSnippetBinding(variant.key, event.target.value)
                          }
                        >
                          <option value="">Select snippet</option>
                          {allowedSnippets.map((snippet) => (
                            <option key={snippet.id} value={snippet.id}>
                              {snippet.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span className="field-label">Pinned version</span>
                        <select
                          value={binding?.pinnedVersion ?? selectedSnippet?.currentVersion ?? ""}
                          onChange={(event) =>
                            updateVariantSnippetVersion(variant.key, Number(event.target.value))
                          }
                          disabled={!selectedSnippet}
                        >
                          {selectedSnippet?.versions.map((version) => (
                            <option key={version.version} value={version.version}>
                              v{version.version}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {activeScenario.evaluationDimensions.length > 0 ? (
            <section className="panel">
              <h3>Evaluation setup</h3>
              <div className="stack-list">
                {activeScenario.evaluationDimensions.map((dimension) => (
                  <article key={dimension.key} className="nested-card">
                    <div className="panel-header-row">
                      <div>
                        <strong>{dimension.label}</strong>
                        <p className="muted-copy">{dimension.description}</p>
                      </div>
                      <span className="version-chip">{dimension.key}</span>
                    </div>
                    <label className="field">
                      <span className="field-label">Enabled</span>
                      <select
                        value={String(dimension.enabled)}
                        onChange={(event) =>
                          updateEvaluationDimension(dimension.key, {
                            enabled: event.target.value === "true"
                          })
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Weight</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={dimension.weight ?? 1}
                        onChange={(event) =>
                          updateEvaluationDimension(dimension.key, {
                            weight: Number(event.target.value) || 1
                          })
                        }
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        <section className="editor-column center">
          <section className="panel">
            <h3>Snippet selection</h3>
            <div className="stack-list">
              {resolvedTemplate.slots.map((slot) => {
                const binding = activeScenario.snippetBindings.find((item) => item.slot === slot.slot);
                const allowedSnippets = snippets.filter((snippet) =>
                  slot.allowedSnippetTypes.includes(snippet.type)
                );
                const selectedSnippet = allowedSnippets.find(
                  (snippet) => snippet.id === binding?.snippetId
                );
                const slotHidden =
                  slot.conditionRule &&
                  !(
                    (slot.conditionRule.operator === "exists" &&
                      activeScenario.variableValues[slot.conditionRule.variableKey] !== undefined &&
                      activeScenario.variableValues[slot.conditionRule.variableKey] !== "") ||
                    activeScenario.variableValues[slot.conditionRule.variableKey] === slot.conditionRule.value
                  );

                return (
                  <article key={slot.id} className="nested-card">
                    <div className="panel-header-row">
                      <div>
                        <strong>{slot.label}</strong>
                        <p className="muted-copy">{slot.description}</p>
                      </div>
                      <span className="version-chip">{slot.slot}</span>
                    </div>
                    {slotHidden ? (
                      <div className="warning-box">Hidden by current scenario inputs.</div>
                    ) : (
                      <>
                        <label className="field">
                          <span className="field-label">Snippet</span>
                          <select
                            value={binding?.snippetId ?? slot.defaultSnippetId ?? ""}
                            onChange={(event) => updateBinding(slot.slot, event.target.value)}
                          >
                            <option value="">Select snippet</option>
                            {allowedSnippets.map((snippet) => (
                              <option key={snippet.id} value={snippet.id}>
                                {snippet.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span className="field-label">Pinned version</span>
                          <select
                            value={binding?.pinnedVersion ?? selectedSnippet?.currentVersion ?? ""}
                            onChange={(event) =>
                              updateBindingVersion(slot.slot, Number(event.target.value))
                            }
                            disabled={!selectedSnippet}
                          >
                            {selectedSnippet?.versions.map((version) => (
                              <option key={version.version} value={version.version}>
                                v{version.version}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <h3>Scenario version history</h3>
            <div className="version-list">
              {persistedScenario.versions
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
                          onClick={() => restoreScenarioVersion(persistedScenario.id, version.version)}
                        >
                          Restore
                        </button>
                      ) : null}
                    </div>
                    <p className="muted-copy">
                      Template v{version.templateVersion} · {new Date(version.updatedAt).toLocaleString()}
                    </p>
                  </article>
                ))}
            </div>
          </section>
        </section>

        <aside className="editor-column preview">
          <section className="panel sticky">
            <div className="panel-header-row">
              <div>
                <h3>Final scenario preview</h3>
                <p className="muted-copy">
                  Rendered against template v{activeScenario.templateVersion}.
                </p>
              </div>
              <span className={`status-pill ${preview.missingVariables.length ? "draft" : "ready"}`}>
                {preview.missingVariables.length ? "needs input" : "render ok"}
              </span>
            </div>
            {preview.missingVariables.length > 0 ? (
              <div className="warning-box">
                Missing fields: {preview.missingVariables.join(", ")}
              </div>
            ) : null}
            {preview.renderWarnings.length > 0 ? (
              <div className="warning-box">
                {preview.renderWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
            <div className="preview-block-list">
              {selectedPersonaCards.map((card) => (
                <article key={card.id} className="source-block">
                  <div className="panel-header-row">
                    <span className="source-pill">
                      {card.snippetName}
                      {card.pinnedVersion ? ` · v${card.pinnedVersion}` : ""}
                    </span>
                    <span className="ghost-link">{card.label}</span>
                  </div>
                  <pre>{card.content}</pre>
                </article>
              ))}
            </div>
            <div className="preview-block-list">
              {resolvedPreviewBlocks.map((block) => (
                <article key={block.id} className="source-block">
                  <div className="panel-header-row">
                    <span className="source-pill">
                      {block.sourceType === "snippet"
                        ? `${block.sourceName} · v${block.sourceVersion}`
                        : block.sourceName}
                    </span>
                    <span className="ghost-link">{block.slot}</span>
                  </div>
                  <pre>{block.content}</pre>
                </article>
              ))}
            </div>
            <article className="render-output">
              <h4>Rendered prompt</h4>
              <pre>{preview.renderedPrompt}</pre>
            </article>
            <article className="render-output">
              <h4>Rendered evaluation prompt</h4>
              <pre>{evaluationPreview.renderedPrompt}</pre>
            </article>
          </section>
        </aside>
      </div>
    </section>
  );
}

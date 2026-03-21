import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStudio } from "../../studio/StudioContext";
import {
  getTemplateInputSchema,
  hasPersonasPlaceholder,
  resolveTemplateVersion
} from "../../studio/render";
import type { LanguageCode, ScenarioPersonaBinding } from "../../studio/types";
import { PageState } from "../components/PageState";
import { PersonaBindingsEditor } from "../components/PersonaBindingsEditor";
import { LANGUAGE_LABELS } from "../constants";

export function ScenarioCreatePage() {
  const { templates, snippets, createScenario } = useStudio();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTemplateId = searchParams.get("templateId") ?? templates[0]?.id ?? "";
  const initialTemplate = templates.find((template) => template.id === defaultTemplateId) ?? templates[0];
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [templateVersion, setTemplateVersion] = useState<number>(initialTemplate?.version ?? 1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState<LanguageCode>(initialTemplate?.defaultLanguage ?? "en");
  const [personaBindings, setPersonaBindings] = useState<ScenarioPersonaBinding[]>([]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? templates[0],
    [templateId, templates]
  );

  const resolvedTemplate = useMemo(
    () =>
      selectedTemplate ? resolveTemplateVersion(selectedTemplate, templateVersion) : undefined,
    [selectedTemplate, templateVersion]
  );
  const inputSchema = useMemo(
    () => (resolvedTemplate ? getTemplateInputSchema(resolvedTemplate) : []),
    [resolvedTemplate]
  );

  if (!selectedTemplate || !resolvedTemplate) {
    return (
      <PageState
        title="No templates available"
        description="Create a template first so new scenarios have a structure to inherit."
        action={{ label: "Go to templates", to: "/templates", variant: "primary" }}
      />
    );
  }

  function handleTemplateChange(nextTemplateId: string) {
    const nextTemplate =
      templates.find((template) => template.id === nextTemplateId) ?? templates[0];
    setTemplateId(nextTemplate?.id ?? "");
    setTemplateVersion(nextTemplate?.version ?? 1);
    setLanguage(nextTemplate?.defaultLanguage ?? "en");
    setPersonaBindings([]);
  }

  function addPersona() {
    const defaultPersona = snippets.find((item) => item.type === "persona");
    setPersonaBindings((current) => [
      ...current,
      {
        id: `persona-binding-${Date.now()}`,
        snippetId: defaultPersona?.id,
        pinnedVersion: defaultPersona?.currentVersion
      }
    ]);
  }

  function updatePersona(index: number, snippetId: string) {
    if (!snippetId) {
      setPersonaBindings((current) => current.filter((_, itemIndex) => itemIndex !== index));
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    setPersonaBindings((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, snippetId, pinnedVersion: snippet.currentVersion }
          : item
      )
    );
  }

  function updatePersonaVersion(index: number, version: number) {
    setPersonaBindings((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, pinnedVersion: version } : item
      )
    );
  }

  function movePersona(index: number, direction: -1 | 1) {
    setPersonaBindings((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Scenario Create</p>
          <h2>Create a scenario instance</h2>
          <p className="page-copy">
            Pick a template and version first. The scenario will pin to that version and
            expose its variables and variants in the next step.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/scenarios" className="secondary-button">
            Back to scenarios
          </Link>
        </div>
      </header>

      <div className="detail-grid weighted-grid">
        <section className="panel primary-panel">
          <div className="panel-header-row">
            <div>
              <p className="eyebrow">Primary form</p>
              <h3>Scenario setup</h3>
              <p className="muted-copy">
                Capture the essentials first, then pin to the right template version.
              </p>
            </div>
            <span className="pill subtle">Step 1</span>
          </div>

          <div className="form-section">
            <p className="section-label">Scenario basics</p>
            <label className="field">
              <span className="field-label">Scenario name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Friday Night Host"
              />
            </label>
            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short description of this scenario"
              />
            </label>
          </div>

          <div className="form-section">
            <p className="section-label">Template binding</p>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Template</span>
                <select
                  value={selectedTemplate.id}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                >
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Template version</span>
                <select
                  value={templateVersion}
                  onChange={(event) => setTemplateVersion(Number(event.target.value))}
                >
                  {selectedTemplate.versions
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
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as LanguageCode)}
                >
                  {resolvedTemplate.supportedLanguages.map((item) => (
                    <option key={item} value={item}>
                      {LANGUAGE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="muted-copy">
              Switching templates resets the pinned version and drives the upcoming fields.
            </p>
          </div>

          <div className="form-section">
            <PersonaBindingsEditor
              bindings={personaBindings}
              snippets={snippets}
              emptyMessage={'No persona cards selected yet. Add one if this template uses {{personas}}.'}
              onAdd={addPersona}
              onMove={movePersona}
              onChangeSnippet={updatePersona}
              onChangeVersion={updatePersonaVersion}
              onRemove={(index) => updatePersona(index, "")}
            />
          </div>

          <div className="form-actions">
            <p className="muted-copy">Create the draft to reveal template-driven fields next.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                const scenarioId = createScenario({
                  templateId: selectedTemplate.id,
                  templateVersion,
                  name,
                  description,
                  language,
                  personaBindings
                });
                if (scenarioId) {
                  navigate(`/scenarios/${scenarioId}`);
                }
              }}
            >
              Create scenario draft
            </button>
          </div>
        </section>

        <section className="panel secondary-panel sticky">
          <div className="panel-header-row">
            <div>
              <p className="eyebrow">Step 2</p>
              <h3>Template version summary</h3>
              <p className="muted-copy">
                Preview the fields and slots that will appear after creating the draft.
              </p>
            </div>
          </div>
          <div className="stack-list">
            <article className="nested-card">
              <strong>{selectedTemplate.name}</strong>
              <p className="muted-copy">
                Version v{templateVersion} · {resolvedTemplate.status}
              </p>
            </article>
            <article className="nested-card">
              <strong>Scenario fields</strong>
              <p className="muted-copy">{inputSchema.length} fields will appear after creation.</p>
              {inputSchema.map((item) => (
                <p key={item.key} className="muted-copy">
                  {item.label} · {item.type === "select" ? "select / variant" : item.type}
                </p>
              ))}
            </article>
            <article className="nested-card">
              <strong>Language policy</strong>
              <p className="muted-copy">
                Default language: {LANGUAGE_LABELS[resolvedTemplate.defaultLanguage]}
              </p>
              <p className="muted-copy">
                Supported:{" "}
                {resolvedTemplate.supportedLanguages
                  .map((item) => LANGUAGE_LABELS[item])
                  .join(", ")}
              </p>
            </article>
            <article className="nested-card">
              <strong>Persona placeholder</strong>
              <p className="muted-copy">
                {hasPersonasPlaceholder(resolvedTemplate.body)
                  ? "This template injects ordered persona cards into the dialogue prompt."
                  : "This template does not currently inject persona cards into the dialogue prompt."}
              </p>
            </article>
            <article className="nested-card">
              <strong>Snippet slots</strong>
              <p className="muted-copy">{resolvedTemplate.slots.length} slots configured.</p>
              {resolvedTemplate.slots.map((slot) => (
                <p key={slot.id} className="muted-copy">
                  {slot.label} · {slot.allowedSnippetTypes.join(", ")}
                </p>
              ))}
            </article>
            <article className="nested-card">
              <strong>Evaluation dimensions</strong>
              <p className="muted-copy">
                {resolvedTemplate.evaluationDimensions.length} dimensions will be configured on
                the scenario.
              </p>
              {resolvedTemplate.evaluationDimensions.map((dimension) => (
                <p key={dimension.id} className="muted-copy">
                  {dimension.label} · default weight {dimension.defaultWeight ?? 1}
                </p>
              ))}
            </article>
          </div>
        </section>
      </div>
    </section>
  );
}

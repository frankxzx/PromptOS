import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useStudio } from "../../studio/StudioContext";
import { getTemplateInputSchema, resolveTemplateVersion } from "../../studio/render";

export function ScenarioCreatePage() {
  const { templates, createScenario } = useStudio();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTemplateId = searchParams.get("templateId") ?? templates[0]?.id ?? "";
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId) ?? templates[0],
    [templateId, templates]
  );
  const [templateVersion, setTemplateVersion] = useState<number>(
    selectedTemplate?.version ?? 1
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const resolvedTemplate = selectedTemplate
    ? resolveTemplateVersion(selectedTemplate, templateVersion)
    : undefined;
  const inputSchema = resolvedTemplate ? getTemplateInputSchema(resolvedTemplate) : [];

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
                  value={selectedTemplate?.id ?? ""}
                  onChange={(event) => {
                    const nextTemplate =
                      templates.find((template) => template.id === event.target.value) ??
                      templates[0];
                    setTemplateId(nextTemplate?.id ?? "");
                    setTemplateVersion(nextTemplate?.version ?? 1);
                  }}
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
                  {selectedTemplate?.versions
                    .slice()
                    .reverse()
                    .map((version) => (
                      <option key={version.version} value={version.version}>
                        v{version.version}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <p className="muted-copy">
              Switching templates resets the pinned version and drives the upcoming fields.
            </p>
          </div>

          <div className="form-actions">
            <p className="muted-copy">Create the draft to reveal template-driven fields next.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (!selectedTemplate) {
                  return;
                }
                const scenarioId = createScenario({
                  templateId: selectedTemplate.id,
                  templateVersion,
                  name,
                  description
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
          {resolvedTemplate ? (
            <div className="stack-list">
              <article className="nested-card">
                <strong>{selectedTemplate?.name}</strong>
                <p className="muted-copy">
                  Version v{templateVersion} · {resolvedTemplate.status}
                </p>
              </article>
              <article className="nested-card">
                <strong>Scenario fields</strong>
                <p className="muted-copy">
                  {inputSchema.length} fields will appear after creation.
                </p>
                {inputSchema.map((item) => (
                  <p key={item.key} className="muted-copy">
                    {item.label} · {item.type === "select" ? "select / variant" : item.type}
                  </p>
                ))}
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
            </div>
          ) : (
            <p className="muted-copy">No template selected.</p>
          )}
        </section>
      </div>
    </section>
  );
}

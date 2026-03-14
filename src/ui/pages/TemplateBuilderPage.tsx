import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  buildTemplateModeOptions,
  createEmptyTemplate,
  createEditableTemplate,
  useStudio
} from "../../studio/StudioContext";
import { syncScenarioToTemplateVersion } from "../../studio/operations";
import {
  createTemplateTestScenario,
  getTemplateInputSchema,
  renderEvaluationPreview,
  renderScenarioPreview,
  resolveTemplateVersion,
  validateScenario,
  validateTemplateStructure
} from "../../studio/render";
import type {
  EvaluationDimensionDefinition,
  LanguageCode,
  PromptTemplate,
  Scenario,
  Snippet,
  TemplateMode,
  TemplateSlotDefinition,
  TemplateTestCase,
  TemplateVariantDefinition,
  VariableSchemaItem,
  VariantFieldType
} from "../../studio/types";

type ToastState = { tone: "success" | "error"; message: string } | null;

interface BodySegment {
  id: string;
  kind: "text" | "slot";
  value: string;
}

function parseBodySegments(body: string): BodySegment[] {
  return body.split(/\n\s*\n/).map((chunk, index) => {
    const trimmed = chunk.trim();
    const slotMatch = trimmed.match(/^\{\{slot:([^}]+)\}\}$/);
    if (slotMatch) {
      return { id: `segment-slot-${index}`, kind: "slot", value: slotMatch[1] };
    }
    return { id: `segment-text-${index}`, kind: "text", value: chunk };
  });
}

function composeBodySegments(segments: BodySegment[]) {
  return segments
    .map((segment) =>
      segment.kind === "slot" ? `{{slot:${segment.value}}}` : segment.value.trim()
    )
    .filter(Boolean)
    .join("\n\n");
}

function createVariant(index: number): TemplateVariantDefinition {
  return {
    id: `variant-${index}`,
    key: `variant_${index}`,
    label: `Variant ${index}`,
    description: "New variant",
    required: true,
    type: "dropdown",
    options: ["default"],
    defaultValue: "default"
  };
}

function createSlot(index: number): TemplateSlotDefinition {
  return {
    id: `slot-${index}`,
    slot: `slot_${index}`,
    label: `Slot ${index}`,
    description: "New snippet slot",
    required: false,
    allowedSnippetTypes: ["instruction"]
  };
}

function getVersionOptions(template: PromptTemplate) {
  return [template.version, ...template.versions.map((item) => item.version)]
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort((left, right) => right - left);
}

function getSnippetChoices(snippets: Snippet[], allowedTypes: Snippet["type"][] | undefined) {
  if (!allowedTypes || allowedTypes.length === 0) {
    return [];
  }
  return snippets.filter((snippet) => allowedTypes.includes(snippet.type));
}

const LANGUAGE_OPTIONS: Array<{ value: LanguageCode; label: string }> = [
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese" },
  { value: "es", label: "Spanish" },
  { value: "ja", label: "Japanese" }
];

function createEvaluationDimension(index: number): EvaluationDimensionDefinition {
  return {
    id: `evaluation-dimension-${index}`,
    key: `evaluation_dimension_${index}`,
    label: `Evaluation Dimension ${index}`,
    description: "Describe what this evaluator should check.",
    enabledByDefault: true,
    defaultWeight: 1
  };
}

export function TemplateBuilderPage() {
  const { templateId } = useParams();
  const {
    currentRole,
    templates,
    snippets,
    createTemplate,
    deleteTemplate,
    getTemplate,
    saveTemplateDraft,
    restoreTemplateVersion
  } = useStudio();
  const navigate = useNavigate();
  const isNewTemplate = templateId === "new";
  const sourceTemplate = templateId
    ? isNewTemplate
      ? undefined
      : getTemplate(templateId)
    : templates[0];
  const [draft, setDraft] = useState<PromptTemplate | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [showRawWarning, setShowRawWarning] = useState(false);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState("__default__");
  const [testCaseName, setTestCaseName] = useState("");
  const [testScenario, setTestScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    if (isNewTemplate) {
      const editable = createEmptyTemplate();
      setDraft(editable);
      setSelectedTestCaseId("__default__");
      setTestCaseName("");
      setTestScenario(createTemplateTestScenario(editable, snippets, editable.version));
      return;
    }

    if (!sourceTemplate) {
      return;
    }
    const editable = createEditableTemplate(sourceTemplate);
    setDraft(editable);
    setSelectedTestCaseId("__default__");
    setTestCaseName("");
    setTestScenario(createTemplateTestScenario(editable, snippets, editable.version));
  }, [isNewTemplate, sourceTemplate, snippets]);

  const availableModes = buildTemplateModeOptions(currentRole);

  const resolvedTestTemplate = useMemo(() => {
    if (!draft || !testScenario) {
      return null;
    }
    return resolveTemplateVersion(draft, testScenario.templateVersion);
  }, [draft, testScenario]);

  if ((!isNewTemplate && !sourceTemplate) || !draft || !testScenario || !resolvedTestTemplate) {
    return (
      <section className="page-shell">
        <p>Template not found.</p>
      </section>
    );
  }

  const activeTemplate = draft;
  const persistedTemplate = sourceTemplate ?? activeTemplate;
  const activeTestScenario = testScenario;
  const bodySegments = parseBodySegments(activeTemplate.body);
  const staticValidation = validateTemplateStructure(activeTemplate, snippets);
  const testPreview = renderScenarioPreview(activeTemplate, activeTestScenario, snippets);
  const evaluationPreview = renderEvaluationPreview(activeTemplate, activeTestScenario);
  const testValidation = validateScenario(activeTemplate, activeTestScenario, snippets);
  const testInputSchema = getTemplateInputSchema(resolvedTestTemplate);
  const fieldVariantsByKey = new Map(
    resolvedTestTemplate.variants.map((variant) => [variant.key, variant])
  );
  const snippetVariants = resolvedTestTemplate.variants.filter(
    (variant) => variant.type === "snippet"
  );
  const versionOptions = getVersionOptions(activeTemplate);
  const selectedTestPersonaCards = activeTestScenario.personaBindings.map((binding, index) => {
    const snippet = snippets.find((item) => item.id === binding.snippetId);
    const version = snippet?.versions.find((item) => item.version === binding.pinnedVersion);
    return {
      id: binding.id,
      label: `Persona ${index + 1}`,
      snippetName: snippet?.name ?? "Missing persona",
      pinnedVersion: binding.pinnedVersion,
      content: version?.content ?? "Persona content unavailable."
    };
  });

  function updateDraft(nextTemplate: PromptTemplate) {
    setDraft(nextTemplate);
    setToast(null);
    setTestScenario((current) =>
      current
        ? syncScenarioToTemplateVersion(
            {
              ...current,
              variableValues: { ...current.variableValues },
              personaBindings: current.personaBindings.map((item) => ({ ...item })),
              variantSnippetBindings: current.variantSnippetBindings.map((item) => ({ ...item })),
              snippetBindings: current.snippetBindings.map((item) => ({ ...item }))
            },
            nextTemplate
          )
        : createTemplateTestScenario(nextTemplate, snippets, nextTemplate.version)
    );
  }

  function updateVariable(index: number, nextItem: VariableSchemaItem) {
    updateDraft({
      ...activeTemplate,
      variableSchema: activeTemplate.variableSchema.map((item, itemIndex) =>
        itemIndex === index ? nextItem : item
      )
    });
  }

  function updateVariant(index: number, nextItem: TemplateVariantDefinition) {
    updateDraft({
      ...activeTemplate,
      variants: activeTemplate.variants.map((item, itemIndex) =>
        itemIndex === index ? nextItem : item
      )
    });
  }

  function updateVariantType(index: number, type: VariantFieldType) {
    const current = activeTemplate.variants[index];
    if (type === "input") {
      updateVariant(index, {
        ...current,
        type,
        options: [],
        defaultValue: current.defaultValue ?? "",
        allowedSnippetTypes: undefined,
        defaultSnippetId: undefined
      });
      return;
    }

    if (type === "snippet") {
      updateVariant(index, {
        ...current,
        type,
        options: [],
        defaultValue: undefined,
        allowedSnippetTypes: current.allowedSnippetTypes ?? ["tone"],
        defaultSnippetId: current.defaultSnippetId
      });
      return;
    }

    updateVariant(index, {
      ...current,
      type,
      options: current.options.length > 0 ? current.options : ["default"],
      defaultValue: current.defaultValue ?? current.options[0] ?? "default",
      allowedSnippetTypes: undefined,
      defaultSnippetId: undefined
    });
  }

  function addVariant() {
    updateDraft({
      ...activeTemplate,
      variants: [...activeTemplate.variants, createVariant(activeTemplate.variants.length + 1)]
    });
  }

  function updateSlot(index: number, nextItem: TemplateSlotDefinition) {
    updateDraft({
      ...activeTemplate,
      slots: activeTemplate.slots.map((item, itemIndex) =>
        itemIndex === index ? nextItem : item
      )
    });
  }

  function addSlot() {
    updateDraft({
      ...activeTemplate,
      slots: [...activeTemplate.slots, createSlot(activeTemplate.slots.length + 1)]
    });
  }

  function updateMode(mode: TemplateMode) {
    if (mode === "raw" && currentRole !== "admin") {
      return;
    }
    if (mode === "raw" && !showRawWarning) {
      setShowRawWarning(true);
      return;
    }
    updateDraft({ ...activeTemplate, templateMode: mode });
    setShowRawWarning(false);
  }

  function moveSegment(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= bodySegments.length) {
      return;
    }
    const nextSegments = [...bodySegments];
    [nextSegments[index], nextSegments[nextIndex]] = [nextSegments[nextIndex], nextSegments[index]];
    updateDraft({ ...activeTemplate, body: composeBodySegments(nextSegments) });
  }

  function updateSegment(index: number, value: string) {
    const nextSegments = bodySegments.map((segment, segmentIndex) =>
      segmentIndex === index ? { ...segment, value } : segment
    );
    updateDraft({ ...activeTemplate, body: composeBodySegments(nextSegments) });
  }

  function addTextSegment() {
    updateDraft({
      ...activeTemplate,
      body: composeBodySegments([
        ...bodySegments,
        {
          id: `segment-text-new-${Date.now()}`,
          kind: "text",
          value: "New text block"
        }
      ])
    });
  }

  function addSlotSegment() {
    const fallbackSlot =
      activeTemplate.slots[0]?.slot ?? createSlot(activeTemplate.slots.length + 1).slot;
    const nextSlots =
      activeTemplate.slots.length > 0
        ? activeTemplate.slots
        : [...activeTemplate.slots, createSlot(activeTemplate.slots.length + 1)];
    updateDraft({
      ...activeTemplate,
      slots: nextSlots,
      body: composeBodySegments([
        ...bodySegments,
        {
          id: `segment-slot-new-${Date.now()}`,
          kind: "slot",
          value: fallbackSlot
        }
      ])
    });
  }

  function deleteSegment(index: number) {
    updateDraft({
      ...activeTemplate,
      body: composeBodySegments(
        bodySegments.filter((_, segmentIndex) => segmentIndex !== index)
      )
    });
  }

  function save(status: "draft" | "ready") {
    if (status === "ready" && staticValidation.errors.length > 0) {
      setToast({
        tone: "error",
        message: "Template has structural errors. Fix them before marking it ready."
      });
      return;
    }

    if (isNewTemplate) {
      const result = createTemplate(activeTemplate, status);
      if (!result.ok || !result.templateId) {
        setToast({
          tone: "error",
          message: result.message ?? "Template could not be created."
        });
        return;
      }
      navigate(`/templates/${result.templateId}`);
      return;
    }

    saveTemplateDraft(persistedTemplate.id, activeTemplate, status);
    setToast({
      tone: "success",
      message: status === "ready" ? "Template saved as ready." : "Template draft saved."
    });
  }

  function updateTestScenario(nextScenario: Scenario) {
    setTestScenario(nextScenario);
    setToast(null);
  }

  function updateTestVariable(key: string, value: string | boolean) {
    updateTestScenario({
      ...activeTestScenario,
      variableValues: {
        ...activeTestScenario.variableValues,
        [key]: value
      }
    });
  }

  function updateTestTemplateVersion(nextVersion: number) {
    updateTestScenario(
      syncScenarioToTemplateVersion(
        {
          ...activeTestScenario,
          templateVersion: nextVersion
        },
        activeTemplate
      )
    );
  }

  function updateTestBinding(slot: string, snippetId: string) {
    if (!snippetId) {
      updateTestScenario({
        ...activeTestScenario,
        snippetBindings: activeTestScenario.snippetBindings.filter((item) => item.slot !== slot)
      });
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    const currentBinding = activeTestScenario.snippetBindings.find((item) => item.slot === slot);
    const nextBinding = {
      slot,
      snippetId,
      pinnedVersion: currentBinding?.pinnedVersion ?? snippet.currentVersion
    };
    updateTestScenario({
      ...activeTestScenario,
      snippetBindings: currentBinding
        ? activeTestScenario.snippetBindings.map((item) =>
            item.slot === slot ? nextBinding : item
          )
        : [...activeTestScenario.snippetBindings, nextBinding]
    });
  }

  function updateTestBindingVersion(slot: string, version: number) {
    updateTestScenario({
      ...activeTestScenario,
      snippetBindings: activeTestScenario.snippetBindings.map((item) =>
        item.slot === slot ? { ...item, pinnedVersion: version } : item
      )
    });
  }

  function updateTestVariantSnippetBinding(key: string, snippetId: string) {
    if (!snippetId) {
      updateTestScenario({
        ...activeTestScenario,
        variantSnippetBindings: activeTestScenario.variantSnippetBindings.filter(
          (item) => item.key !== key
        )
      });
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    const currentBinding = activeTestScenario.variantSnippetBindings.find(
      (item) => item.key === key
    );
    const nextBinding = {
      key,
      snippetId,
      pinnedVersion: currentBinding?.pinnedVersion ?? snippet.currentVersion
    };
    updateTestScenario({
      ...activeTestScenario,
      variantSnippetBindings: currentBinding
        ? activeTestScenario.variantSnippetBindings.map((item) =>
            item.key === key ? nextBinding : item
          )
        : [...activeTestScenario.variantSnippetBindings, nextBinding]
    });
  }

  function updateTestVariantSnippetVersion(key: string, version: number) {
    updateTestScenario({
      ...activeTestScenario,
      variantSnippetBindings: activeTestScenario.variantSnippetBindings.map((item) =>
        item.key === key ? { ...item, pinnedVersion: version } : item
      )
    });
  }

  function addTestPersona() {
    const defaultPersona = snippets.find((item) => item.type === "persona");
    updateTestScenario({
      ...activeTestScenario,
      personaBindings: [
        ...activeTestScenario.personaBindings,
        {
          id: `persona-binding-${Date.now()}`,
          snippetId: defaultPersona?.id,
          pinnedVersion: defaultPersona?.currentVersion
        }
      ]
    });
  }

  function updateTestPersona(index: number, snippetId: string) {
    if (!snippetId) {
      updateTestScenario({
        ...activeTestScenario,
        personaBindings: activeTestScenario.personaBindings.filter(
          (_, itemIndex) => itemIndex !== index
        )
      });
      return;
    }
    const snippet = snippets.find((item) => item.id === snippetId);
    if (!snippet) {
      return;
    }
    updateTestScenario({
      ...activeTestScenario,
      personaBindings: activeTestScenario.personaBindings.map((item, itemIndex) =>
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

  function updateTestPersonaVersion(index: number, version: number) {
    updateTestScenario({
      ...activeTestScenario,
      personaBindings: activeTestScenario.personaBindings.map((item, itemIndex) =>
        itemIndex === index ? { ...item, pinnedVersion: version } : item
      )
    });
  }

  function moveTestPersona(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= activeTestScenario.personaBindings.length) {
      return;
    }
    const nextBindings = [...activeTestScenario.personaBindings];
    [nextBindings[index], nextBindings[nextIndex]] = [
      nextBindings[nextIndex],
      nextBindings[index]
    ];
    updateTestScenario({
      ...activeTestScenario,
      personaBindings: nextBindings
    });
  }

  function loadTestCase(testCaseId: string) {
    setSelectedTestCaseId(testCaseId);
    if (testCaseId === "__default__") {
      setTestCaseName("");
      setTestScenario(createTemplateTestScenario(activeTemplate, snippets, activeTemplate.version));
      return;
    }

    const testCase = activeTemplate.testCases.find((item) => item.id === testCaseId);
    if (!testCase) {
      return;
    }
    setTestCaseName(testCase.name);
    setTestScenario(
      createTemplateTestScenario(activeTemplate, snippets, testCase.templateVersion, testCase)
    );
  }

  function saveCurrentAsTestCase() {
    const nextName = testCaseName.trim() || `Test case ${activeTemplate.testCases.length + 1}`;
    const nextTestCase: TemplateTestCase = {
      id: selectedTestCaseId !== "__default__" ? selectedTestCaseId : `test-case-${Date.now()}`,
      name: nextName,
      templateVersion: activeTestScenario.templateVersion,
      language: activeTestScenario.language,
      variableValues: { ...activeTestScenario.variableValues },
      evaluationDimensions: activeTestScenario.evaluationDimensions.map((item) => ({
        ...item
      })),
      personaBindings: activeTestScenario.personaBindings.map((item) => ({ ...item })),
      variantSnippetBindings: activeTestScenario.variantSnippetBindings.map((item) => ({
        ...item
      })),
      snippetBindings: activeTestScenario.snippetBindings.map((item) => ({ ...item }))
    };

    updateDraft({
      ...activeTemplate,
      testCases:
        selectedTestCaseId !== "__default__"
          ? activeTemplate.testCases.map((item) =>
              item.id === selectedTestCaseId ? nextTestCase : item
            )
          : [...activeTemplate.testCases, nextTestCase]
    });
    setSelectedTestCaseId(nextTestCase.id);
    setTestCaseName(nextName);
    setToast({ tone: "success", message: "Template test case saved." });
  }

  function updateSupportedLanguages(rawValue: string) {
    const nextLanguages = rawValue
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item): item is LanguageCode =>
        LANGUAGE_OPTIONS.some((option) => option.value === item)
      );
    const deduped = Array.from(new Set(nextLanguages)) as LanguageCode[];
    const fallback: LanguageCode[] = deduped.length > 0 ? deduped : ["en"];
    updateDraft({
      ...activeTemplate,
      supportedLanguages: fallback,
      defaultLanguage: fallback.includes(activeTemplate.defaultLanguage)
        ? activeTemplate.defaultLanguage
        : fallback[0]
    });
  }

  function updateEvaluationDimension(
    index: number,
    nextDimension: EvaluationDimensionDefinition
  ) {
    updateDraft({
      ...activeTemplate,
      evaluationDimensions: activeTemplate.evaluationDimensions.map((item, itemIndex) =>
        itemIndex === index ? nextDimension : item
      )
    });
  }

  function addEvaluationDimension() {
    updateDraft({
      ...activeTemplate,
      evaluationDimensions: [
        ...activeTemplate.evaluationDimensions,
        createEvaluationDimension(activeTemplate.evaluationDimensions.length + 1)
      ]
    });
  }

  function updateTestLanguage(language: LanguageCode) {
    updateTestScenario({
      ...activeTestScenario,
      language
    });
  }

  function updateTestEvaluationDimension(
    key: string,
    updates: Partial<Scenario["evaluationDimensions"][number]>
  ) {
    updateTestScenario({
      ...activeTestScenario,
      evaluationDimensions: activeTestScenario.evaluationDimensions.map((item) =>
        item.key === key ? { ...item, ...updates } : item
      )
    });
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Template Builder</p>
          <h2>{isNewTemplate ? "New Template" : persistedTemplate.name}</h2>
          <p className="page-copy">
            Define structure, base variables, variants, slot rules, and template versions.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/templates" className="secondary-button">
            Back to templates
          </Link>
          {!isNewTemplate ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate(`/scenarios/new?templateId=${persistedTemplate.id}`)}
            >
              Create scenario
            </button>
          ) : null}
          {!isNewTemplate && currentRole === "admin" ? (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (!window.confirm("Delete this template? This cannot be undone.")) {
                  return;
                }
                const result = deleteTemplate(persistedTemplate.id);
                if (!result.ok) {
                  setToast({
                    tone: "error",
                    message: result.message ?? "Unable to delete template."
                  });
                  return;
                }
                navigate("/templates");
              }}
            >
              Delete template
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={() => save("draft")}>
            {isNewTemplate ? "Create draft" : "Save draft"}
          </button>
          <button type="button" className="primary-button" onClick={() => save("ready")}>
            {isNewTemplate ? "Create as ready" : "Save as ready"}
          </button>
        </div>
      </header>

      {toast ? <div className={`banner ${toast.tone}`}>{toast.message}</div> : null}

      <div className="editor-shell">
        <aside className="editor-column side">
          <section className="panel">
            <h3>Template metadata</h3>
            <label className="field">
              <span className="field-label">Template name</span>
              <input
                value={activeTemplate.name}
                onChange={(event) => updateDraft({ ...activeTemplate, name: event.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Business domain</span>
              <input
                value={activeTemplate.businessDomain}
                onChange={(event) =>
                  updateDraft({ ...activeTemplate, businessDomain: event.target.value })
                }
              />
            </label>
            <label className="field">
              <span className="field-label">Template mode</span>
              <select
                value={activeTemplate.templateMode}
                onChange={(event) => updateMode(event.target.value as TemplateMode)}
              >
                {availableModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Supported languages</span>
              <input
                value={activeTemplate.supportedLanguages.join(", ")}
                onChange={(event) => updateSupportedLanguages(event.target.value)}
                placeholder="en, zh"
              />
            </label>
            <label className="field">
              <span className="field-label">Default language</span>
              <select
                value={activeTemplate.defaultLanguage}
                onChange={(event) =>
                  updateDraft({
                    ...activeTemplate,
                    defaultLanguage: event.target.value as LanguageCode
                  })
                }
              >
                {activeTemplate.supportedLanguages.map((language) => (
                  <option key={language} value={language}>
                    {LANGUAGE_OPTIONS.find((item) => item.value === language)?.label ?? language}
                  </option>
                ))}
              </select>
            </label>
            {showRawWarning ? (
              <div className="warning-box">
                Raw mode can break template safety. Choose it again to confirm.
              </div>
            ) : null}
          </section>

          <section className="panel">
            <h3>Base variables</h3>
            <div className="stack-list">
              {activeTemplate.variableSchema.map((item, index) => (
                <article key={item.key} className="nested-card">
                  <label className="field">
                    <span className="field-label">Label</span>
                    <input
                      value={item.label}
                      onChange={(event) =>
                        updateVariable(index, { ...item, label: event.target.value })
                      }
                    />
                  </label>
                  <p className="muted-copy">
                    Key: <code>{item.key}</code> · Type: {item.type} ·{" "}
                    {item.required ? "required" : "optional"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header-row">
              <div>
                <h3>Conversation variants</h3>
                <p className="muted-copy">
                  Variants appear as scenario form fields when creating or editing an instance.
                </p>
              </div>
              <button type="button" className="secondary-button" onClick={addVariant}>
                Add variant
              </button>
            </div>
            <div className="stack-list">
              {activeTemplate.variants.map((variant, index) => (
                <article key={variant.id} className="nested-card">
                  <label className="field">
                    <span className="field-label">Variant label</span>
                    <input
                      value={variant.label}
                      onChange={(event) =>
                        updateVariant(index, { ...variant, label: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Variant type</span>
                    <select
                      value={variant.type}
                      onChange={(event) =>
                        updateVariantType(index, event.target.value as VariantFieldType)
                      }
                    >
                      <option value="dropdown">Dropdown</option>
                      <option value="input">Input</option>
                      <option value="creatable_select">Mutable select</option>
                      <option value="snippet">Snippet picker</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Variant key</span>
                    <input
                      value={variant.key}
                      onChange={(event) =>
                        updateVariant(index, { ...variant, key: event.target.value })
                      }
                    />
                  </label>
                  {variant.type === "dropdown" || variant.type === "creatable_select" ? (
                    <>
                      <label className="field">
                        <span className="field-label">Options (comma separated)</span>
                        <input
                          value={variant.options.join(", ")}
                          onChange={(event) => {
                            const nextOptions = event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean);
                            updateVariant(index, {
                              ...variant,
                              options: nextOptions,
                              defaultValue: nextOptions[0] ?? variant.defaultValue
                            });
                          }}
                        />
                      </label>
                      <label className="field">
                        <span className="field-label">Default option</span>
                        <select
                          value={variant.defaultValue ?? ""}
                          onChange={(event) =>
                            updateVariant(index, {
                              ...variant,
                              defaultValue: event.target.value
                            })
                          }
                        >
                          {variant.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}
                  {variant.type === "input" ? (
                    <label className="field">
                      <span className="field-label">Default text</span>
                      <input
                        value={variant.defaultValue ?? ""}
                        onChange={(event) =>
                          updateVariant(index, {
                            ...variant,
                            defaultValue: event.target.value
                          })
                        }
                      />
                    </label>
                  ) : null}
                  {variant.type === "snippet" ? (
                    <>
                      <label className="field">
                        <span className="field-label">Allowed snippet type</span>
                        <select
                          value={variant.allowedSnippetTypes?.[0] ?? "tone"}
                          onChange={(event) =>
                            updateVariant(index, {
                              ...variant,
                              allowedSnippetTypes: [
                                event.target.value as typeof snippets[number]["type"]
                              ],
                              defaultSnippetId: undefined
                            })
                          }
                        >
                          <option value="role">role</option>
                          <option value="persona">persona</option>
                          <option value="instruction">instruction</option>
                          <option value="format">format</option>
                          <option value="safety">safety</option>
                          <option value="tone">tone</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="field-label">Default snippet</span>
                        <select
                          value={variant.defaultSnippetId ?? ""}
                          onChange={(event) =>
                            updateVariant(index, {
                              ...variant,
                              defaultSnippetId: event.target.value || undefined
                            })
                          }
                        >
                          <option value="">None</option>
                          {getSnippetChoices(snippets, variant.allowedSnippetTypes).map((snippet) => (
                            <option key={snippet.id} value={snippet.id}>
                              {snippet.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : null}
                  <p className="muted-copy">
                    Scenario field key: <code>{variant.key}</code> · {variant.type}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header-row">
              <div>
                <h3>Slots</h3>
                <p className="muted-copy">
                  Slots define which snippet types a scenario creator can plug into structure blocks.
                </p>
              </div>
              <button type="button" className="secondary-button" onClick={addSlot}>
                Add slot
              </button>
            </div>
            <div className="stack-list">
              {activeTemplate.slots.map((slot, index) => (
                <article key={slot.id} className="nested-card">
                  <label className="field">
                    <span className="field-label">Slot label</span>
                    <input
                      value={slot.label}
                      onChange={(event) =>
                        updateSlot(index, { ...slot, label: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Slot key</span>
                    <input
                      value={slot.slot}
                      onChange={(event) =>
                        updateSlot(index, { ...slot, slot: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Allowed snippet type</span>
                    <select
                      value={slot.allowedSnippetTypes[0] ?? "instruction"}
                      onChange={(event) =>
                        updateSlot(index, {
                          ...slot,
                          allowedSnippetTypes: [
                            event.target.value as typeof snippets[number]["type"]
                          ],
                          defaultSnippetId: undefined
                        })
                      }
                    >
                      <option value="role">role</option>
                      <option value="persona">persona</option>
                      <option value="instruction">instruction</option>
                      <option value="format">format</option>
                      <option value="safety">safety</option>
                      <option value="tone">tone</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Default snippet</span>
                    <select
                      value={slot.defaultSnippetId ?? ""}
                      onChange={(event) =>
                        updateSlot(index, {
                          ...slot,
                          defaultSnippetId: event.target.value || undefined
                        })
                      }
                    >
                      <option value="">None</option>
                      {getSnippetChoices(snippets, slot.allowedSnippetTypes).map((snippet) => (
                        <option key={snippet.id} value={snippet.id}>
                          {snippet.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Description</span>
                    <input
                      value={slot.description}
                      onChange={(event) =>
                        updateSlot(index, { ...slot, description: event.target.value })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Required</span>
                    <select
                      value={String(slot.required)}
                      onChange={(event) =>
                        updateSlot(index, {
                          ...slot,
                          required: event.target.value === "true"
                        })
                      }
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                  <p className="muted-copy">
                    Placeholder: <code>{`{{slot:${slot.slot}}}`}</code>
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header-row">
              <div>
                <h3>Evaluation setup</h3>
                <p className="muted-copy">
                  Define the evaluation prompt body and the dimensions an evaluator can score.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={addEvaluationDimension}
              >
                Add dimension
              </button>
            </div>
            <label className="field">
              <span className="field-label">Evaluation prompt body</span>
              <textarea
                rows={8}
                value={activeTemplate.evaluationBody}
                onChange={(event) =>
                  updateDraft({ ...activeTemplate, evaluationBody: event.target.value })
                }
              />
            </label>
            <div className="stack-list">
              {activeTemplate.evaluationDimensions.map((dimension, index) => (
                <article key={dimension.id} className="nested-card">
                  <label className="field">
                    <span className="field-label">Dimension label</span>
                    <input
                      value={dimension.label}
                      onChange={(event) =>
                        updateEvaluationDimension(index, {
                          ...dimension,
                          label: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Dimension key</span>
                    <input
                      value={dimension.key}
                      onChange={(event) =>
                        updateEvaluationDimension(index, {
                          ...dimension,
                          key: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Description</span>
                    <textarea
                      rows={3}
                      value={dimension.description}
                      onChange={(event) =>
                        updateEvaluationDimension(index, {
                          ...dimension,
                          description: event.target.value
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Default weight</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={dimension.defaultWeight ?? 1}
                      onChange={(event) =>
                        updateEvaluationDimension(index, {
                          ...dimension,
                          defaultWeight: Number(event.target.value) || 1
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Enabled by default</span>
                    <select
                      value={String(dimension.enabledByDefault)}
                      onChange={(event) =>
                        updateEvaluationDimension(index, {
                          ...dimension,
                          enabledByDefault: event.target.value === "true"
                        })
                      }
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <section className="editor-column center">
          <section className="panel">
            <div className="panel-header-row">
              <div>
                <h3>Template structure</h3>
                <p className="muted-copy">
                  Add ordered blocks here. Text blocks can reference base variables and variants;
                  slot blocks reference your slot definitions. Use <code>{"{{personas}}"}</code>{" "}
                  when the dialogue prompt should inject ordered persona cards.
                </p>
              </div>
              {activeTemplate.templateMode === "visual" ? (
                <div className="inline-actions">
                  <button type="button" className="secondary-button" onClick={addTextSegment}>
                    Add text block
                  </button>
                  <button type="button" className="secondary-button" onClick={addSlotSegment}>
                    Add slot block
                  </button>
                </div>
              ) : null}
            </div>
            {activeTemplate.templateMode === "visual" ? (
              <div className="stack-list">
                {bodySegments.map((segment, index) => (
                  <article key={segment.id} className="composer-card">
                    <div className="composer-toolbar">
                      <span className="composer-tag">
                        {segment.kind === "slot" ? "Slot placeholder" : "Plain text"}
                      </span>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => moveSegment(index, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => moveSegment(index, 1)}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => deleteSegment(index)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {segment.kind === "slot" ? (
                      <label className="field">
                        <span className="field-label">Slot</span>
                        <select
                          value={segment.value}
                          onChange={(event) => updateSegment(index, event.target.value)}
                        >
                          {activeTemplate.slots.length === 0 ? (
                            <option value="">No slots defined</option>
                          ) : null}
                          {activeTemplate.slots.map((slot) => (
                            <option key={slot.id} value={slot.slot}>
                              {slot.slot}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="field">
                        <span className="field-label">Text block</span>
                        <textarea
                          rows={4}
                          value={segment.value}
                          onChange={(event) => updateSegment(index, event.target.value)}
                        />
                      </label>
                    )}
                  </article>
                ))}
                {bodySegments.length === 0 ? (
                  <article className="nested-card">
                    <p className="muted-copy">
                      No blocks yet. Start by adding a text block or a slot block.
                    </p>
                  </article>
                ) : null}
              </div>
            ) : (
              <label className="field">
                <span className="field-label">Template body</span>
                <textarea
                  rows={20}
                  value={activeTemplate.body}
                  onChange={(event) => updateDraft({ ...activeTemplate, body: event.target.value })}
                />
              </label>
            )}
          </section>

          <section className="panel">
            <h3>Version history</h3>
            {isNewTemplate ? (
              <p className="muted-copy">
                Version history appears after the first save. You can still test the draft on the
                right before creating it.
              </p>
            ) : (
              <div className="version-list">
                {persistedTemplate.versions
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
                            onClick={() =>
                              restoreTemplateVersion(persistedTemplate.id, version.version)
                            }
                          >
                            Restore
                          </button>
                        ) : null}
                      </div>
                      <p className="muted-copy">{new Date(version.updatedAt).toLocaleString()}</p>
                      <p className="muted-copy">
                        Variants: {version.variants.length} · Slots: {version.slots.length} · Test
                        cases: {version.testCases?.length ?? 0}
                      </p>
                    </article>
                  ))}
              </div>
            )}
          </section>
        </section>

        <aside className="editor-column preview">
          <section className="panel sticky">
            <div className="panel-header-row">
              <div>
                <h3>Template Test</h3>
                <p className="muted-copy">
                  Run static checks and simulate the exact form an Editor will use.
                </p>
              </div>
              <span
                className={`status-pill ${
                  staticValidation.errors.length || testValidation.errors.length ? "draft" : "ready"
                }`}
              >
                {staticValidation.errors.length || testValidation.errors.length
                  ? "needs review"
                  : "test ok"}
              </span>
            </div>

            <article className="nested-card">
              <strong>Static validation</strong>
              {staticValidation.errors.length === 0 && staticValidation.warnings.length === 0 ? (
                <p className="muted-copy">No structural issues found.</p>
              ) : null}
              {staticValidation.errors.map((error) => (
                <p key={error} className="muted-copy">
                  Error: {error}
                </p>
              ))}
              {staticValidation.warnings.map((warning) => (
                <p key={warning} className="muted-copy">
                  Warning: {warning}
                </p>
              ))}
            </article>

            <article className="nested-card">
              <div className="panel-header-row">
                <strong>Saved test cases</strong>
                <button type="button" className="ghost-button" onClick={saveCurrentAsTestCase}>
                  Save current
                </button>
              </div>
              <label className="field">
                <span className="field-label">Test case</span>
                <select
                  value={selectedTestCaseId}
                  onChange={(event) => loadTestCase(event.target.value)}
                >
                  <option value="__default__">Fresh default simulation</option>
                  {activeTemplate.testCases.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Case name</span>
                <input
                  value={testCaseName}
                  onChange={(event) => setTestCaseName(event.target.value)}
                  placeholder="Default host flow"
                />
              </label>
            </article>

            <article className="nested-card">
              <div className="panel-header-row">
                <strong>Simulate as Editor</strong>
                <span className="version-chip">v{activeTestScenario.templateVersion}</span>
              </div>
              <label className="field">
                <span className="field-label">Template version under test</span>
                <select
                  value={activeTestScenario.templateVersion}
                  onChange={(event) => updateTestTemplateVersion(Number(event.target.value))}
                >
                  {versionOptions.map((version) => (
                    <option key={version} value={version}>
                      v{version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Language under test</span>
                <select
                  value={activeTestScenario.language}
                  onChange={(event) => updateTestLanguage(event.target.value as LanguageCode)}
                >
                  {resolvedTestTemplate.supportedLanguages.map((language) => (
                    <option key={language} value={language}>
                      {LANGUAGE_OPTIONS.find((item) => item.value === language)?.label ?? language}
                    </option>
                  ))}
                </select>
              </label>

              <div className="panel-header-row">
                <strong>Persona cards</strong>
                <button type="button" className="ghost-button" onClick={addTestPersona}>
                  Add persona
                </button>
              </div>
              {activeTestScenario.personaBindings.length === 0 ? (
                <p className="muted-copy">
                  No persona cards selected. Add one if this template uses{" "}
                  <code>{"{{personas}}"}</code>.
                </p>
              ) : (
                <div className="stack-list">
                  {activeTestScenario.personaBindings.map((binding, index) => {
                    const personaSnippets = snippets.filter((item) => item.type === "persona");
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
                              onClick={() => moveTestPersona(index, -1)}
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => moveTestPersona(index, 1)}
                            >
                              Down
                            </button>
                          </div>
                        </div>
                        <label className="field">
                          <span className="field-label">Persona snippet</span>
                          <select
                            value={binding.snippetId ?? ""}
                            onChange={(event) => updateTestPersona(index, event.target.value)}
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
                            onChange={(event) =>
                              updateTestPersonaVersion(index, Number(event.target.value))
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
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => updateTestPersona(index, "")}
                        >
                          Remove persona
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              {testInputSchema.map((item) => {
                const fieldVariant = fieldVariantsByKey.get(item.key);
                return (
                  <label key={item.key} className="field">
                    <span className="field-label">
                      {item.label}
                      {item.required ? " *" : ""}
                    </span>
                    {item.type === "boolean" ? (
                      <select
                        value={String(activeTestScenario.variableValues[item.key] ?? false)}
                        onChange={(event) =>
                          updateTestVariable(item.key, event.target.value === "true")
                        }
                        className={
                          testPreview.missingVariables.includes(item.key) ? "field-error" : ""
                        }
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : fieldVariant?.type === "creatable_select" ? (
                      <>
                        <input
                          list={`template-test-${item.key}`}
                          value={String(
                            activeTestScenario.variableValues[item.key] ?? item.defaultValue ?? ""
                          )}
                          onChange={(event) => updateTestVariable(item.key, event.target.value)}
                          className={
                            testPreview.missingVariables.includes(item.key) ? "field-error" : ""
                          }
                        />
                        <datalist id={`template-test-${item.key}`}>
                          {item.options?.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </>
                    ) : item.type === "select" ? (
                      <select
                        value={String(
                          activeTestScenario.variableValues[item.key] ?? item.defaultValue ?? ""
                        )}
                        onChange={(event) => updateTestVariable(item.key, event.target.value)}
                        className={
                          testPreview.missingVariables.includes(item.key) ? "field-error" : ""
                        }
                      >
                        {item.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={String(activeTestScenario.variableValues[item.key] ?? "")}
                        onChange={(event) => updateTestVariable(item.key, event.target.value)}
                        className={
                          testPreview.missingVariables.includes(item.key) ? "field-error" : ""
                        }
                      />
                    )}
                  </label>
                );
              })}

              {snippetVariants.length > 0 ? (
                <div className="stack-list">
                  {snippetVariants.map((variant) => {
                    const binding = activeTestScenario.variantSnippetBindings.find(
                      (item) => item.key === variant.key
                    );
                    const allowedSnippets = getSnippetChoices(
                      snippets,
                      variant.allowedSnippetTypes
                    );
                    const selectedSnippet = allowedSnippets.find(
                      (snippet) => snippet.id === binding?.snippetId
                    );

                    return (
                      <article key={variant.id} className="nested-card">
                        <div className="panel-header-row">
                          <strong>{variant.label}</strong>
                          <span className="version-chip">{variant.key}</span>
                        </div>
                        <label className="field">
                          <span className="field-label">Nested snippet</span>
                          <select
                            value={binding?.snippetId ?? variant.defaultSnippetId ?? ""}
                            onChange={(event) =>
                              updateTestVariantSnippetBinding(variant.key, event.target.value)
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
                              updateTestVariantSnippetVersion(
                                variant.key,
                                Number(event.target.value)
                              )
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
              ) : null}

              <div className="stack-list">
                {resolvedTestTemplate.slots.map((slot) => {
                  const binding = activeTestScenario.snippetBindings.find(
                    (item) => item.slot === slot.slot
                  );
                  const allowedSnippets = getSnippetChoices(snippets, slot.allowedSnippetTypes);
                  const selectedSnippet = allowedSnippets.find(
                    (snippet) => snippet.id === binding?.snippetId
                  );

                  return (
                    <article key={slot.id} className="nested-card">
                      <div className="panel-header-row">
                        <strong>{slot.label}</strong>
                        <span className="version-chip">{slot.slot}</span>
                      </div>
                      <label className="field">
                        <span className="field-label">Snippet</span>
                        <select
                          value={binding?.snippetId ?? slot.defaultSnippetId ?? ""}
                          onChange={(event) => updateTestBinding(slot.slot, event.target.value)}
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
                            updateTestBindingVersion(slot.slot, Number(event.target.value))
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

              {activeTestScenario.evaluationDimensions.length > 0 ? (
                <div className="stack-list">
                  {activeTestScenario.evaluationDimensions.map((dimension) => (
                    <article key={dimension.key} className="nested-card">
                      <div className="panel-header-row">
                        <strong>{dimension.label}</strong>
                        <span className="version-chip">{dimension.key}</span>
                      </div>
                      <p className="muted-copy">{dimension.description}</p>
                      <label className="field">
                        <span className="field-label">Enabled</span>
                        <select
                          value={String(dimension.enabled)}
                          onChange={(event) =>
                            updateTestEvaluationDimension(dimension.key, {
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
                            updateTestEvaluationDimension(dimension.key, {
                              weight: Number(event.target.value) || 1
                            })
                          }
                        />
                      </label>
                    </article>
                  ))}
                </div>
              ) : null}
            </article>

            {testValidation.errors.length > 0 ? (
              <div className="warning-box">
                {testValidation.errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}

            {testPreview.renderWarnings.length > 0 ? (
              <div className="warning-box">
                {testPreview.renderWarnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}

            <div className="preview-block-list">
              {selectedTestPersonaCards.map((card) => (
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
              {testPreview.resolvedBlocks
                .filter((block) => !block.slot.startsWith("persona:"))
                .map((block) => (
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
              <h4>Rendered test prompt</h4>
              <pre>{testPreview.renderedPrompt}</pre>
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

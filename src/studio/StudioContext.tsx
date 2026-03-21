import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { initialStudioState } from "./mockData";
import {
  cloneDialoguePromptSections,
  compileDialoguePromptSections,
  createDefaultDialogueSections,
  getTemplateDefaults,
  renderScenarioPreview,
  resolveTemplateVersion,
  validateScenario,
  type VariableValues
} from "./render";
import { createScenarioFromTemplate, syncScenarioToTemplateVersion } from "./operations";
import type {
  DialoguePromptSections,
  EvaluationDimensionDefinition,
  EntityStatus,
  LanguageCode,
  LocalBlock,
  PromptTemplate,
  PromptTemplateVersion,
  Scenario,
  ScenarioEvaluationDimension,
  ScenarioPersonaBinding,
  ScenarioSlotBinding,
  ScenarioVariantSnippetBinding,
  ScenarioVersion,
  Snippet,
  SnippetStatus,
  SnippetType,
  SnippetVersion,
  StudioState,
  TemplateSlotDefinition,
  TemplateVariantDefinition,
  TemplateMode,
  VariableSchemaItem,
  UserRole
} from "./types";

const STORAGE_KEY = "prompt-studio-v1-state";

function cloneLanguages(languages: LanguageCode[] | undefined) {
  return [...(languages ?? ["en"])];
}

function cloneTestCases(testCases: PromptTemplate["testCases"] | undefined) {
  return (testCases ?? []).map((item) => ({
    ...item,
    language: item.language ?? "en",
    variableValues: { ...item.variableValues },
    evaluationDimensions: cloneScenarioEvaluationDimensions(item.evaluationDimensions),
    personaBindings: cloneScenarioPersonaBindings(item.personaBindings),
    variantSnippetBindings: item.variantSnippetBindings.map((entry) => ({ ...entry })),
    snippetBindings: item.snippetBindings.map((entry) => ({ ...entry }))
  }));
}

function cloneVariantOptions(options: string[] | undefined) {
  return [...(options ?? [])];
}

function cloneSampleValues(values: VariableSchemaItem["sampleValues"] | undefined) {
  return values ? [...values] : undefined;
}

function cloneVariableSchemaItem(item: VariableSchemaItem): VariableSchemaItem {
  return {
    ...item,
    options: cloneVariantOptions(item.options),
    sampleValues: cloneSampleValues(item.sampleValues)
  };
}

function cloneVariableSchema(schema: VariableSchemaItem[] | undefined) {
  return (schema ?? []).map(cloneVariableSchemaItem);
}

function cloneTemplateVariant(variant: TemplateVariantDefinition): TemplateVariantDefinition {
  return {
    ...variant,
    options: cloneVariantOptions(variant.options),
    allowedSnippetTypes: [...(variant.allowedSnippetTypes ?? [])]
  };
}

function cloneTemplateVariants(variants: TemplateVariantDefinition[] | undefined) {
  return (variants ?? []).map(cloneTemplateVariant);
}

function ensureDialogueSections(
  sections: DialoguePromptSections | undefined,
  body: string
) {
  const nextSections = cloneDialoguePromptSections(sections);
  if (!sections && body) {
    nextSections.roleObjective = body;
  }
  return nextSections;
}

function cloneTemplateSlot(slot: TemplateSlotDefinition): TemplateSlotDefinition {
  return {
    ...slot,
    allowedSnippetTypes: [...(slot.allowedSnippetTypes ?? [])],
    conditionRule: slot.conditionRule ? { ...slot.conditionRule } : undefined
  };
}

function cloneTemplateSlots(slots: TemplateSlotDefinition[] | undefined) {
  return (slots ?? []).map(cloneTemplateSlot);
}

function cloneLocalBlock(block: LocalBlock): LocalBlock {
  return {
    ...block,
    conditionRule: block.conditionRule ? { ...block.conditionRule } : undefined
  };
}

function cloneLocalBlocks(blocks: LocalBlock[] | undefined) {
  return (blocks ?? []).map(cloneLocalBlock);
}

function cloneEvaluationDimensionDefinition(
  item: EvaluationDimensionDefinition
): EvaluationDimensionDefinition {
  return { ...item };
}

function cloneEvaluationDimensionDefinitions(
  items: EvaluationDimensionDefinition[] | undefined
) {
  return (items ?? []).map(cloneEvaluationDimensionDefinition);
}

function cloneScenarioEvaluationDimension(
  item: ScenarioEvaluationDimension
): ScenarioEvaluationDimension {
  return { ...item };
}

function cloneScenarioEvaluationDimensions(
  items: ScenarioEvaluationDimension[] | undefined
) {
  return (items ?? []).map(cloneScenarioEvaluationDimension);
}

function cloneScenarioPersonaBinding(
  item: ScenarioPersonaBinding
): ScenarioPersonaBinding {
  return { ...item };
}

function cloneScenarioPersonaBindings(items: ScenarioPersonaBinding[] | undefined) {
  return (items ?? []).map(cloneScenarioPersonaBinding);
}

function cloneScenarioVariantBindings(
  bindings: ScenarioVariantSnippetBinding[] | undefined
) {
  return (bindings ?? []).map((item) => ({ ...item }));
}

function cloneScenarioSlotBindings(bindings: ScenarioSlotBinding[] | undefined) {
  return (bindings ?? []).map((item) => ({ ...item }));
}

function cloneSnippetVersions(versions: SnippetVersion[] | undefined) {
  return (versions ?? []).map((version) => ({ ...version }));
}

function normalizeTemplate(template: PromptTemplate): PromptTemplate {
  const dialogueSections = ensureDialogueSections(template.dialogueSections, template.body);
  return {
    ...template,
    body: compileDialoguePromptSections(dialogueSections) || template.body,
    dialogueSections,
    variableSchema: cloneVariableSchema(template.variableSchema),
    variants: cloneTemplateVariants(template.variants),
    slots: cloneTemplateSlots(template.slots),
    localBlocks: cloneLocalBlocks(template.localBlocks),
    supportedLanguages: cloneLanguages(template.supportedLanguages),
    defaultLanguage: template.defaultLanguage ?? "en",
    evaluationBody: template.evaluationBody ?? "",
    evaluationDimensions: cloneEvaluationDimensionDefinitions(template.evaluationDimensions),
    testCases: cloneTestCases(template.testCases),
    versions: (template.versions ?? []).map((version) => {
      const versionSections = ensureDialogueSections(version.dialogueSections, version.body);
      return {
        ...version,
        body: compileDialoguePromptSections(versionSections) || version.body,
        dialogueSections: versionSections,
        variableSchema: cloneVariableSchema(version.variableSchema),
        variants: cloneTemplateVariants(version.variants),
        slots: cloneTemplateSlots(version.slots),
        localBlocks: cloneLocalBlocks(version.localBlocks),
        supportedLanguages: cloneLanguages(version.supportedLanguages),
        defaultLanguage: version.defaultLanguage ?? template.defaultLanguage ?? "en",
        evaluationBody: version.evaluationBody ?? template.evaluationBody ?? "",
        evaluationDimensions: cloneEvaluationDimensionDefinitions(
          version.evaluationDimensions
        ),
        testCases: cloneTestCases(version.testCases)
      };
    })
  };
}

function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    language: scenario.language ?? "en",
    variableValues: { ...(scenario.variableValues ?? {}) },
    evaluationDimensions: cloneScenarioEvaluationDimensions(scenario.evaluationDimensions),
    personaBindings: cloneScenarioPersonaBindings(scenario.personaBindings),
    variantSnippetBindings: cloneScenarioVariantBindings(scenario.variantSnippetBindings),
    snippetBindings: cloneScenarioSlotBindings(scenario.snippetBindings),
    renderedEvaluationPrompt: scenario.renderedEvaluationPrompt ?? "",
    versions: (scenario.versions ?? []).map((version) => ({
      ...version,
      language: version.language ?? scenario.language ?? "en",
      variableValues: { ...(version.variableValues ?? {}) },
      evaluationDimensions: cloneScenarioEvaluationDimensions(version.evaluationDimensions),
      personaBindings: cloneScenarioPersonaBindings(version.personaBindings),
      variantSnippetBindings: cloneScenarioVariantBindings(version.variantSnippetBindings),
      snippetBindings: cloneScenarioSlotBindings(version.snippetBindings),
      renderedEvaluationPrompt: version.renderedEvaluationPrompt ?? ""
    }))
  };
}

function normalizeSnippet(snippet: Snippet): Snippet {
  return {
    ...snippet,
    versions: cloneSnippetVersions(snippet.versions)
  };
}

function isStudioStateShape(value: unknown): value is StudioState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StudioState> & { prompts?: unknown };
  if (Array.isArray(candidate.prompts)) {
    return false;
  }

  return (
    Array.isArray(candidate.templates) &&
    Array.isArray(candidate.scenarios) &&
    Array.isArray(candidate.snippets) &&
    candidate.templates.every(
      (template) =>
        template &&
        typeof template === "object" &&
        Array.isArray((template as PromptTemplate).variants) &&
        Array.isArray((template as PromptTemplate).versions) &&
        (template as PromptTemplate).versions.every((version) =>
          Array.isArray(version.variants)
        )
    ) &&
    candidate.scenarios.every(
      (scenario) =>
        scenario &&
        typeof scenario === "object" &&
        typeof (scenario as Scenario).templateVersion === "number"
    ) &&
    (candidate.currentRole === "editor" || candidate.currentRole === "admin")
  );
}

function loadInitialState(): StudioState {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return initialStudioState;
  }

  try {
    const parsed = JSON.parse(saved) as unknown;
    if (isStudioStateShape(parsed)) {
      return {
        ...parsed,
        templates: parsed.templates.map(normalizeTemplate),
        scenarios: parsed.scenarios.map(normalizeScenario),
        snippets: parsed.snippets.map(normalizeSnippet)
      };
    }
    return initialStudioState;
  } catch {
    return initialStudioState;
  }
}

interface StudioContextValue extends StudioState {
  setRole: (role: UserRole) => void;
  getTemplate: (templateId: string) => PromptTemplate | undefined;
  getScenario: (scenarioId: string) => Scenario | undefined;
  getSnippet: (snippetId: string) => Snippet | undefined;
  getScenariosForTemplate: (templateId: string) => Scenario[];
  deleteTemplate: (templateId: string) => { ok: boolean; message?: string };
  deleteScenario: (scenarioId: string) => { ok: boolean; message?: string };
  deleteSnippet: (snippetId: string) => { ok: boolean; message?: string };
  createTemplate: (
    template: PromptTemplate,
    status: EntityStatus
  ) => { ok: boolean; templateId?: string; message?: string };
  createScenario: (args: {
    templateId: string;
    templateVersion: number;
    name?: string;
    description?: string;
    language?: LanguageCode;
    personaBindings?: ScenarioPersonaBinding[];
  }) => string | null;
  getScenarioUsageForSnippet: (snippetId: string) => Array<{
    scenarioId: string;
    scenarioName: string;
    pinnedVersion: number;
    updatedAt: string;
  }>;
  saveTemplateDraft: (
    templateId: string,
    nextTemplate: PromptTemplate,
    status: EntityStatus
  ) => void;
  restoreTemplateVersion: (templateId: string, version: number) => void;
  saveScenarioDraft: (
    scenarioId: string,
    nextScenario: Scenario,
    status: EntityStatus
  ) => { ok: boolean; errors: string[] };
  restoreScenarioVersion: (scenarioId: string, version: number) => void;
  createSnippetVersion: (
    snippetId: string,
    content: string,
    notes: string
  ) => { ok: boolean; message?: string };
  createSnippet: (args: {
    name: string;
    type: SnippetType;
    description: string;
    status?: SnippetStatus;
    content: string;
    notes?: string;
  }) => { ok: boolean; snippetId?: string; message?: string };
  updateSnippetMetadata: (
    snippetId: string,
    updates: {
      name: string;
      type: SnippetType;
      description: string;
      status: SnippetStatus;
    }
  ) => { ok: boolean; message?: string };
  restoreSnippetVersion: (snippetId: string, version: number) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

function cloneTemplateVersion(template: PromptTemplate): PromptTemplateVersion {
  return {
    version: template.version,
    body: compileDialoguePromptSections(template.dialogueSections) || template.body,
    dialogueSections: cloneDialoguePromptSections(template.dialogueSections),
    status: template.status,
    templateMode: template.templateMode,
    variableSchema: cloneVariableSchema(template.variableSchema),
    variants: cloneTemplateVariants(template.variants),
    slots: cloneTemplateSlots(template.slots),
    localBlocks: cloneLocalBlocks(template.localBlocks),
    supportedLanguages: cloneLanguages(template.supportedLanguages),
    defaultLanguage: template.defaultLanguage,
    evaluationBody: template.evaluationBody,
    evaluationDimensions: cloneEvaluationDimensionDefinitions(template.evaluationDimensions),
    testCases: cloneTestCases(template.testCases),
    updatedAt: template.updatedAt,
    updatedBy: template.updatedBy,
    notes: "Template snapshot."
  };
}

function cloneScenarioVersion(scenario: Scenario): ScenarioVersion {
  return {
    version: scenario.version,
    status: scenario.status,
    templateId: scenario.templateId,
    templateVersion: scenario.templateVersion,
    language: scenario.language,
    variableValues: { ...scenario.variableValues },
    evaluationDimensions: cloneScenarioEvaluationDimensions(scenario.evaluationDimensions),
    personaBindings: cloneScenarioPersonaBindings(scenario.personaBindings),
    variantSnippetBindings: cloneScenarioVariantBindings(scenario.variantSnippetBindings),
    snippetBindings: cloneScenarioSlotBindings(scenario.snippetBindings),
    renderedPrompt: scenario.renderedPrompt,
    renderedEvaluationPrompt: scenario.renderedEvaluationPrompt,
    updatedAt: scenario.updatedAt,
    updatedBy: scenario.updatedBy,
    notes: "Scenario snapshot."
  };
}

function appendSnippetVersion(
  snippet: Snippet,
  content: string,
  notes: string,
  createdBy: string
): Snippet {
  const nextVersion: SnippetVersion = {
    version: snippet.currentVersion + 1,
    content,
    createdAt: new Date().toISOString(),
    createdBy,
    notes
  };

  return {
    ...snippet,
    currentVersion: nextVersion.version,
    versions: [...snippet.versions, nextVersion]
  };
}

function templateReferencesSnippet(template: PromptTemplate, snippetId: string) {
  const currentMatches =
    template.variants.some((variant) => variant.defaultSnippetId === snippetId) ||
    template.slots.some((slot) => slot.defaultSnippetId === snippetId) ||
    template.testCases.some(
      (testCase) =>
        testCase.personaBindings.some((binding) => binding.snippetId === snippetId) ||
        testCase.variantSnippetBindings.some((binding) => binding.snippetId === snippetId) ||
        testCase.snippetBindings.some((binding) => binding.snippetId === snippetId)
    );

  if (currentMatches) {
    return true;
  }

  return template.versions.some(
    (version) =>
      version.variants.some((variant) => variant.defaultSnippetId === snippetId) ||
      version.slots.some((slot) => slot.defaultSnippetId === snippetId) ||
      (version.testCases ?? []).some(
        (testCase) =>
          testCase.personaBindings.some((binding) => binding.snippetId === snippetId) ||
          testCase.variantSnippetBindings.some((binding) => binding.snippetId === snippetId) ||
          testCase.snippetBindings.some((binding) => binding.snippetId === snippetId)
      )
  );
}

export function StudioProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<StudioState>(() => loadInitialState());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage failures so the editor remains usable in restricted environments.
    }
  }, [state]);

  const value = useMemo<StudioContextValue>(
    () => ({
      ...state,
      setRole: (role) => {
        startTransition(() => {
          setState((current) => ({ ...current, currentRole: role }));
        });
      },
      getTemplate: (templateId) => state.templates.find((item) => item.id === templateId),
      getScenario: (scenarioId) => state.scenarios.find((item) => item.id === scenarioId),
      getSnippet: (snippetId) => state.snippets.find((item) => item.id === snippetId),
      getScenariosForTemplate: (templateId) =>
        state.scenarios.filter((item) => item.templateId === templateId),
      deleteTemplate: (templateId) => {
        if (state.currentRole !== "admin") {
          return { ok: false, message: "Only Admin can delete templates." };
        }
        if (state.scenarios.some((scenario) => scenario.templateId === templateId)) {
          return {
            ok: false,
            message: "This template is still referenced by scenarios. Delete those scenarios first."
          };
        }
        setState((current) => ({
          ...current,
          templates: current.templates.filter((template) => template.id !== templateId)
        }));
        return { ok: true };
      },
      deleteScenario: (scenarioId) => {
        setState((current) => ({
          ...current,
          scenarios: current.scenarios.filter((scenario) => scenario.id !== scenarioId)
        }));
        return { ok: true };
      },
      deleteSnippet: (snippetId) => {
        if (state.currentRole !== "admin") {
          return { ok: false, message: "Only Admin can delete snippets." };
        }
        if (
          state.scenarios.some(
            (scenario) =>
              scenario.personaBindings.some((binding) => binding.snippetId === snippetId) ||
              scenario.snippetBindings.some((binding) => binding.snippetId === snippetId) ||
              scenario.variantSnippetBindings.some((binding) => binding.snippetId === snippetId)
          )
        ) {
          return {
            ok: false,
            message: "This snippet is still referenced by scenarios. Remove those bindings first."
          };
        }
        if (state.templates.some((template) => templateReferencesSnippet(template, snippetId))) {
          return {
            ok: false,
            message:
              "This snippet is still referenced by templates or template test cases. Remove those references first."
          };
        }
        setState((current) => ({
          ...current,
          snippets: current.snippets.filter((snippet) => snippet.id !== snippetId)
        }));
        return { ok: true };
      },
      createTemplate: (template, status) => {
        if (state.currentRole !== "admin") {
          return { ok: false, message: "Only Admin can create templates." };
        }
        const createdAt = new Date().toISOString();
        const templateId = `template-${template.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") || "untitled"}-${Date.now()}`;
        const createdTemplate: PromptTemplate = {
          ...createEditableTemplate(template),
          id: templateId,
          status,
          version: 1,
          updatedAt: createdAt,
          updatedBy: "Admin User",
          versions: []
        };

        setState((current) => ({
          ...current,
          templates: [
            ...current.templates,
            {
              ...createdTemplate,
              versions: [
                {
                  ...cloneTemplateVersion(createdTemplate),
                  version: 1,
                  updatedAt: createdAt,
                  updatedBy: "Admin User",
                  notes:
                    status === "ready"
                      ? "Template created as ready."
                      : "Template created as draft."
                }
              ]
            }
          ]
        }));

        return { ok: true, templateId };
      },
      createScenario: ({
        templateId,
        templateVersion,
        name,
        description,
        language,
        personaBindings
      }) => {
        const template = state.templates.find((item) => item.id === templateId);
        if (!template) {
          return null;
        }
        const baseScenario = createScenarioFromTemplate(
          template,
          state.snippets,
          templateVersion
        );
        const scenarioId = `${baseScenario.id}-${Date.now()}`;
        const scenario: Scenario = {
          ...baseScenario,
          id: scenarioId,
          name: name?.trim() || baseScenario.name,
          description: description?.trim() || baseScenario.description,
          language: language ?? baseScenario.language,
          personaBindings: personaBindings?.map((item) => ({ ...item })) ?? baseScenario.personaBindings,
          renderedPrompt: "",
          renderedEvaluationPrompt: ""
        };
        const validation = validateScenario(template, scenario, state.snippets);
        scenario.renderedPrompt = validation.preview.renderedPrompt;
        scenario.renderedEvaluationPrompt = validation.evaluationPreview.renderedPrompt;
        setState((current) => ({
          ...current,
          scenarios: [...current.scenarios, scenario]
        }));
        return scenarioId;
      },
      getScenarioUsageForSnippet: (snippetId) =>
        state.scenarios
          .flatMap((scenario) =>
            [
              ...scenario.personaBindings
                .filter((binding) => binding.snippetId === snippetId)
                .map((binding) => ({
                  scenarioId: scenario.id,
                  scenarioName: scenario.name,
                  pinnedVersion: binding.pinnedVersion ?? 0,
                  updatedAt: scenario.updatedAt
                })),
              ...scenario.snippetBindings
                .filter((binding) => binding.snippetId === snippetId)
                .map((binding) => ({
                  scenarioId: scenario.id,
                  scenarioName: scenario.name,
                  pinnedVersion: binding.pinnedVersion ?? 0,
                  updatedAt: scenario.updatedAt
                })),
              ...scenario.variantSnippetBindings
                .filter((binding) => binding.snippetId === snippetId)
                .map((binding) => ({
                  scenarioId: scenario.id,
                  scenarioName: scenario.name,
                  pinnedVersion: binding.pinnedVersion ?? 0,
                  updatedAt: scenario.updatedAt
                }))
            ]
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      saveTemplateDraft: (templateId, nextTemplate, status) => {
        setState((current) => ({
          ...current,
          templates: current.templates.map((template) => {
            if (template.id !== templateId) {
              return template;
            }
            const nextVersion = template.version + 1;
            const updatedTemplate: PromptTemplate = {
              ...nextTemplate,
              status,
              version: nextVersion,
              updatedAt: new Date().toISOString(),
              updatedBy: current.currentRole === "admin" ? "Admin User" : "Editor User"
            };
            return {
              ...updatedTemplate,
              versions: [
                ...template.versions,
                {
                  ...cloneTemplateVersion(updatedTemplate),
                  version: nextVersion,
                  updatedAt: updatedTemplate.updatedAt,
                  updatedBy: updatedTemplate.updatedBy,
                  notes:
                    status === "ready"
                      ? "Template saved as ready."
                      : "Template draft saved."
                }
              ]
            };
          })
        }));
      },
      restoreTemplateVersion: (templateId, version) => {
        setState((current) => ({
          ...current,
          templates: current.templates.map((template) => {
            if (template.id !== templateId) {
              return template;
            }
            const snapshot = template.versions.find((item) => item.version === version);
            if (!snapshot) {
              return template;
            }
            const nextVersion = template.version + 1;
            return {
              ...template,
              body: snapshot.body,
              dialogueSections: cloneDialoguePromptSections(snapshot.dialogueSections),
              status: snapshot.status,
              templateMode: snapshot.templateMode,
              variableSchema: cloneVariableSchema(snapshot.variableSchema),
              variants: cloneTemplateVariants(snapshot.variants),
              slots: cloneTemplateSlots(snapshot.slots),
              localBlocks: cloneLocalBlocks(snapshot.localBlocks),
              supportedLanguages: cloneLanguages(snapshot.supportedLanguages),
              defaultLanguage: snapshot.defaultLanguage,
              evaluationBody: snapshot.evaluationBody,
              evaluationDimensions: cloneEvaluationDimensionDefinitions(
                snapshot.evaluationDimensions
              ),
              testCases: cloneTestCases(snapshot.testCases),
              version: nextVersion,
              updatedAt: new Date().toISOString(),
              updatedBy: current.currentRole === "admin" ? "Admin User" : "Editor User",
              versions: [
                ...template.versions,
                {
                  ...snapshot,
                  version: nextVersion,
                  updatedAt: new Date().toISOString(),
                  updatedBy:
                    current.currentRole === "admin" ? "Admin User" : "Editor User",
                  notes: `Restored from v${version}.`
                }
              ]
            };
          })
        }));
      },
      saveScenarioDraft: (scenarioId, nextScenario, status) => {
        const template = state.templates.find((item) => item.id === nextScenario.templateId);
        if (!template) {
          return { ok: false, errors: ["Scenario template is missing."] };
        }
        const syncedScenario = syncScenarioToTemplateVersion(nextScenario, template);
        const validation = validateScenario(template, syncedScenario, state.snippets);
        if (status === "ready" && validation.errors.length > 0) {
          return { ok: false, errors: validation.errors };
        }

        setState((current) => ({
          ...current,
          scenarios: current.scenarios.map((scenario) => {
            if (scenario.id !== scenarioId) {
              return scenario;
            }
            const nextVersion = scenario.version + 1;
            const preview = validation.preview;
            const evaluationPreview = validation.evaluationPreview;
            const updatedScenario: Scenario = {
              ...syncedScenario,
              status,
              renderedPrompt: preview.renderedPrompt,
              renderedEvaluationPrompt: evaluationPreview.renderedPrompt,
              version: nextVersion,
              updatedAt: new Date().toISOString(),
              updatedBy: current.currentRole === "admin" ? "Admin User" : "Editor User"
            };
            return {
              ...updatedScenario,
              versions: [
                ...scenario.versions,
                {
                  ...cloneScenarioVersion(updatedScenario),
                  version: nextVersion,
                  updatedAt: updatedScenario.updatedAt,
                  updatedBy: updatedScenario.updatedBy,
                  notes:
                    status === "ready"
                      ? "Scenario saved as ready."
                      : "Scenario draft saved."
                }
              ]
            };
          })
        }));

        return { ok: true, errors: validation.errors };
      },
      restoreScenarioVersion: (scenarioId, version) => {
        setState((current) => ({
          ...current,
          scenarios: current.scenarios.map((scenario) => {
            if (scenario.id !== scenarioId) {
              return scenario;
            }
            const snapshot = scenario.versions.find((item) => item.version === version);
            if (!snapshot) {
              return scenario;
            }
            const nextVersion = scenario.version + 1;
            return {
              ...scenario,
              status: snapshot.status,
              templateId: snapshot.templateId,
              templateVersion: snapshot.templateVersion,
              language: snapshot.language,
              variableValues: { ...snapshot.variableValues },
              evaluationDimensions: cloneScenarioEvaluationDimensions(
                snapshot.evaluationDimensions
              ),
              personaBindings: cloneScenarioPersonaBindings(snapshot.personaBindings),
              variantSnippetBindings: cloneScenarioVariantBindings(
                snapshot.variantSnippetBindings
              ),
              snippetBindings: cloneScenarioSlotBindings(snapshot.snippetBindings),
              renderedPrompt: snapshot.renderedPrompt,
              renderedEvaluationPrompt: snapshot.renderedEvaluationPrompt,
              version: nextVersion,
              updatedAt: new Date().toISOString(),
              updatedBy: current.currentRole === "admin" ? "Admin User" : "Editor User",
              versions: [
                ...scenario.versions,
                {
                  ...snapshot,
                  version: nextVersion,
                  updatedAt: new Date().toISOString(),
                  updatedBy:
                    current.currentRole === "admin" ? "Admin User" : "Editor User",
                  notes: `Restored from v${version}.`
                }
              ]
            };
          })
        }));
      },
      createSnippetVersion: (snippetId, content, notes) => {
        if (state.currentRole !== "admin") {
          return { ok: false, message: "Only Admin can create snippet versions." };
        }
        setState((current) => ({
          ...current,
          snippets: current.snippets.map((snippet) =>
            snippet.id === snippetId
              ? appendSnippetVersion(
                  snippet,
                  content,
                  notes,
                  current.currentRole === "admin" ? "Admin User" : "Editor User"
                )
              : snippet
          )
        }));
        return { ok: true };
      },
      createSnippet: ({ name, type, description, status = "active", content, notes }) => {
        if (state.currentRole !== "admin") {
          return { ok: false, message: "Only Admin can create snippets." };
        }
        const snippetId = `snippet-${name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
        const createdAt = new Date().toISOString();
        const snippet: Snippet = {
          id: snippetId,
          name: name.trim(),
          type,
          description: description.trim(),
          status,
          usageCount: 0,
          currentVersion: 1,
          versions: [
            {
              version: 1,
              content,
              createdAt,
              createdBy: "Admin User",
              notes: notes?.trim() || "Initial snippet version."
            }
          ]
        };
        setState((current) => ({
          ...current,
          snippets: [...current.snippets, snippet]
        }));
        return { ok: true, snippetId };
      },
      updateSnippetMetadata: (snippetId, updates) => {
        if (state.currentRole !== "admin") {
          return { ok: false, message: "Only Admin can edit snippet metadata." };
        }
        setState((current) => ({
          ...current,
          snippets: current.snippets.map((snippet) =>
            snippet.id === snippetId
              ? {
                  ...snippet,
                  name: updates.name.trim(),
                  type: updates.type,
                  description: updates.description.trim(),
                  status: updates.status
                }
              : snippet
          )
        }));
        return { ok: true };
      },
      restoreSnippetVersion: (snippetId, version) => {
        setState((current) => ({
          ...current,
          snippets: current.snippets.map((snippet) => {
            if (snippet.id !== snippetId) {
              return snippet;
            }
            const snapshot = snippet.versions.find((item) => item.version === version);
            if (!snapshot) {
              return snippet;
            }
            return appendSnippetVersion(
              snippet,
              snapshot.content,
              `Restored from v${version}.`,
              current.currentRole === "admin" ? "Admin User" : "Editor User"
            );
          })
        }));
      }
    }),
    [state]
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const context = useContext(StudioContext);
  if (!context) {
    throw new Error("useStudio must be used within StudioProvider");
  }
  return context;
}

export function createEditableTemplate(template: PromptTemplate): PromptTemplate {
  return normalizeTemplate(template);
}

export function createEmptyTemplate(): PromptTemplate {
  const now = new Date().toISOString();
  const dialogueSections = {
    ...createDefaultDialogueSections(),
    roleObjective: "Guide the user through the scenario goal with concise realtime responses.",
    personas: "Use the following persona cards as the behavioral anchor for the conversation.\n\n{{personas}}",
    language:
      "Reply only in the configured scenario language. If the user switches languages, stay in the configured language unless policy says otherwise.",
    unclearAudio:
      "If audio is unclear or incomplete, ask the user to repeat in one short sentence. Do not guess the missing words.",
    conversationFlow:
      "Open clearly, ask one question at a time, and move the conversation toward the scenario goal.",
    responseStyle:
      "Keep responses short, spoken, and natural. Prefer one idea at a time and avoid long monologues.",
    tools: "",
    safetyEscalation:
      "Refuse unsafe requests briefly and redirect to the next safe action or clarification."
  };
  return {
    id: "template-draft",
    name: "Untitled Template",
    businessDomain: "New Domain",
    description: "New prompt template",
    status: "draft",
    templateMode: "visual",
    body: compileDialoguePromptSections(dialogueSections),
    dialogueSections,
    variableSchema: [
      {
        key: "primary_goal",
        label: "Primary Goal",
        type: "text",
        required: true,
        defaultValue: "",
        sampleValues: ["Moderate a live host", "Generate a character brief"]
      }
    ],
    variants: [],
    slots: [
      {
        id: "slot-instruction",
        slot: "instruction",
        label: "Instruction snippet",
        description: "Main task snippet selected by the scenario creator.",
        required: true,
        allowedSnippetTypes: ["instruction"]
      }
    ],
    localBlocks: [],
    supportedLanguages: ["en", "zh"],
    defaultLanguage: "en",
    evaluationBody: [
      "Review the conversation against the configured evaluation dimensions.",
      "",
      "Scenario language: {{language}}",
      "",
      "{{evaluation_dimensions}}"
    ].join("\n"),
    evaluationDimensions: [
      {
        id: "dimension-language-compliance",
        key: "language_compliance",
        label: "Language Compliance",
        description: "Checks whether the assistant stayed in the required scenario language.",
        enabledByDefault: true,
        defaultWeight: 1
      }
    ],
    testCases: [],
    version: 1,
    updatedAt: now,
    updatedBy: "Admin User",
    versions: []
  };
}

export function createEditableScenario(scenario: Scenario): Scenario {
  return normalizeScenario(scenario);
}

export function buildVariableDefaults(template: PromptTemplate) {
  return getTemplateDefaults(resolveTemplateVersion(template, template.version));
}

export function buildTemplateModeOptions(role: UserRole): TemplateMode[] {
  return role === "admin" ? ["visual", "structured", "raw"] : ["visual", "structured"];
}

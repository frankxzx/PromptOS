import type {
  ConditionRule,
  PromptTemplate,
  PromptTemplateVersion,
  RenderPreviewResult,
  Scenario,
  ScenarioVariantSnippetBinding,
  Snippet,
  TemplateTestCase,
  TemplateVariantDefinition,
  TemplateSlotDefinition,
  VariableSchemaItem
} from "./types";

export type VariableValues = Record<string, string | boolean>;

export interface TemplateValidationResult {
  errors: string[];
  warnings: string[];
}

function cloneTestCases(testCases: TemplateTestCase[] | undefined) {
  return (testCases ?? []).map((item) => ({
    ...item,
    variableValues: { ...item.variableValues },
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

function cloneLocalBlocks(blocks: PromptTemplate["localBlocks"] | PromptTemplateVersion["localBlocks"]) {
  return (blocks ?? []).map((block) => ({
    ...block,
    conditionRule: block.conditionRule ? { ...block.conditionRule } : undefined
  }));
}

function evaluateCondition(
  rule: ConditionRule | undefined,
  variables: VariableValues
): boolean {
  if (!rule) {
    return true;
  }

  const value = variables[rule.variableKey];
  if (rule.operator === "exists") {
    return value !== undefined && value !== "";
  }

  return value === rule.value;
}

function interpolateTemplate(template: string, variables: VariableValues): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = variables[key];
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return value === undefined ? `{{${key}}}` : value;
  });
}

function getSnippetContent(snippet: Snippet, version: number): string | undefined {
  return snippet.versions.find((item) => item.version === version)?.content;
}

function cloneVariant(variant: TemplateVariantDefinition): TemplateVariantDefinition {
  return {
    ...variant,
    options: cloneVariantOptions(variant.options),
    allowedSnippetTypes: variant.allowedSnippetTypes
      ? [...variant.allowedSnippetTypes]
      : undefined
  };
}

export function getDefaultVariables(schema: VariableSchemaItem[]): VariableValues {
  return schema.reduce<VariableValues>((accumulator, item) => {
    if (item.defaultValue !== undefined) {
      accumulator[item.key] = item.defaultValue;
      return accumulator;
    }
    if (item.sampleValues?.[0] !== undefined) {
      accumulator[item.key] = item.sampleValues[0];
      return accumulator;
    }
    accumulator[item.key] = item.type === "boolean" ? false : "";
    return accumulator;
  }, {});
}

function mapVariantToVariable(variant: TemplateVariantDefinition): VariableSchemaItem {
  return {
    key: variant.key,
    label: variant.label,
    type:
      variant.type === "input"
        ? "text"
        : variant.type === "snippet"
          ? "text"
          : "select",
    required: variant.required,
    defaultValue: variant.defaultValue,
    options: variant.type === "input" || variant.type === "snippet" ? undefined : variant.options,
    sampleValues:
      variant.type === "input" || variant.type === "snippet"
        ? variant.defaultValue
          ? [variant.defaultValue]
          : []
        : variant.options.slice(0, 2),
    helperText: variant.description
  };
}

export function getTemplateInputSchema(template: PromptTemplate | PromptTemplateVersion) {
  return [
    ...cloneVariableSchema(template.variableSchema),
    ...(template.variants ?? []).map(mapVariantToVariable)
  ];
}

export function resolveTemplateVersion(
  template: PromptTemplate,
  version: number
): PromptTemplate {
  if (template.version === version) {
    return {
      ...template,
      variableSchema: cloneVariableSchema(template.variableSchema),
      variants: template.variants.map(cloneVariant),
      slots: cloneTemplateSlots(template.slots),
      localBlocks: cloneLocalBlocks(template.localBlocks),
      testCases: cloneTestCases(template.testCases)
    };
  }

  const snapshot = template.versions.find((item) => item.version === version);
  if (!snapshot) {
    return resolveTemplateVersion(template, template.version);
  }

  return {
    ...template,
    version: snapshot.version,
    status: snapshot.status,
    templateMode: snapshot.templateMode,
    body: snapshot.body,
    variableSchema: cloneVariableSchema(snapshot.variableSchema),
    variants: snapshot.variants.map(cloneVariant),
    slots: cloneTemplateSlots(snapshot.slots),
    localBlocks: cloneLocalBlocks(snapshot.localBlocks),
    testCases: cloneTestCases(snapshot.testCases)
  };
}

export function getTemplateDefaults(template: PromptTemplate | PromptTemplateVersion) {
  return getDefaultVariables(getTemplateInputSchema(template));
}

export function createTemplateTestScenario(
  template: PromptTemplate,
  snippets: Snippet[],
  templateVersion: number,
  testCase?: TemplateTestCase
): Scenario {
  const resolvedTemplate = resolveTemplateVersion(template, templateVersion);
  return {
    id: `template-test-${template.id}`,
    name: testCase?.name ?? `${template.name} test`,
    description: "Template simulation run",
    templateId: template.id,
    templateVersion,
    status: "draft",
    variableValues: {
      ...getTemplateDefaults(resolvedTemplate),
      ...(testCase?.variableValues ?? {})
    },
    variantSnippetBindings:
      testCase?.variantSnippetBindings.map((item) => ({ ...item })) ??
      resolvedTemplate.variants
        .filter((variant) => variant.type === "snippet" && variant.defaultSnippetId)
        .map((variant) => ({
          key: variant.key,
          snippetId: variant.defaultSnippetId,
          pinnedVersion:
            snippets.find((item) => item.id === variant.defaultSnippetId)?.currentVersion
        })),
    snippetBindings:
      testCase?.snippetBindings.map((item) => ({ ...item })) ??
      resolvedTemplate.slots
        .filter((slot) => slot.defaultSnippetId)
        .map((slot) => ({
          slot: slot.slot,
          snippetId: slot.defaultSnippetId,
          pinnedVersion:
            snippets.find((item) => item.id === slot.defaultSnippetId)?.currentVersion
        })),
    renderedPrompt: "",
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "Admin User",
    versions: []
  };
}

export function validateTemplateStructure(
  template: PromptTemplate,
  snippets: Snippet[]
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const versionTemplate = resolveTemplateVersion(template, template.version);

  const fieldKeys = new Set<string>();
  versionTemplate.variableSchema.forEach((item) => {
    if (fieldKeys.has(item.key)) {
      errors.push(`Duplicate field key "${item.key}".`);
    }
    fieldKeys.add(item.key);
  });

  versionTemplate.variants.forEach((variant) => {
    if (fieldKeys.has(variant.key)) {
      errors.push(`Variant key "${variant.key}" conflicts with another field.`);
    }
    fieldKeys.add(variant.key);

    if (
      (variant.type === "dropdown" || variant.type === "creatable_select") &&
      variant.options.length === 0
    ) {
      errors.push(`Variant "${variant.label}" must define at least one option.`);
    }

    if (variant.type === "snippet") {
      if (!variant.allowedSnippetTypes || variant.allowedSnippetTypes.length === 0) {
        errors.push(`Snippet variant "${variant.label}" must declare allowed snippet types.`);
      }
      if (variant.defaultSnippetId) {
        const snippet = snippets.find((item) => item.id === variant.defaultSnippetId);
        if (!snippet) {
          errors.push(`Snippet variant "${variant.label}" references a missing default snippet.`);
        } else if (
          variant.allowedSnippetTypes &&
          !variant.allowedSnippetTypes.includes(snippet.type)
        ) {
          errors.push(`Snippet variant "${variant.label}" has an incompatible default snippet.`);
        }
      }
    }
  });

  versionTemplate.slots.forEach((slot) => {
    if (slot.defaultSnippetId) {
      const snippet = snippets.find((item) => item.id === slot.defaultSnippetId);
      if (!snippet) {
        errors.push(`Slot "${slot.slot}" references a missing default snippet.`);
      } else if (!slot.allowedSnippetTypes.includes(snippet.type)) {
        errors.push(`Slot "${slot.slot}" has an incompatible default snippet.`);
      }
    }
    if (slot.conditionRule && !fieldKeys.has(slot.conditionRule.variableKey)) {
      errors.push(`Slot "${slot.slot}" references unknown field "${slot.conditionRule.variableKey}".`);
    }
  });

  versionTemplate.localBlocks.forEach((block) => {
    if (block.conditionRule && !fieldKeys.has(block.conditionRule.variableKey)) {
      errors.push(
        `Local block "${block.title}" references unknown field "${block.conditionRule.variableKey}".`
      );
    }
  });

  const bodyVariableTokens = Array.from(
    versionTemplate.body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)
  ).map((match) => match[1]);
  bodyVariableTokens.forEach((token) => {
    if (!fieldKeys.has(token)) {
      errors.push(`Body references unknown field "${token}".`);
    }
  });

  const slotTokens = Array.from(versionTemplate.body.matchAll(/\{\{slot:([^}]+)\}\}/g)).map(
    (match) => match[1]
  );
  slotTokens.forEach((slot) => {
    if (
      !versionTemplate.slots.some((item) => item.slot === slot) &&
      !versionTemplate.localBlocks.some((item) => item.slot === slot)
    ) {
      warnings.push(`Body references unknown slot "${slot}".`);
    }
  });

  return { errors, warnings };
}

function resolveVariantSnippetBinding(
  variant: TemplateVariantDefinition,
  bindings: ScenarioVariantSnippetBinding[],
  snippets: Snippet[],
  rawVariables: VariableValues,
  warnings: string[]
) {
  const binding =
    bindings.find((item) => item.key === variant.key) ??
    (variant.defaultSnippetId
      ? {
          key: variant.key,
          snippetId: variant.defaultSnippetId,
          pinnedVersion: snippets.find((item) => item.id === variant.defaultSnippetId)?.currentVersion
        }
      : undefined);

  if (!binding?.snippetId || !binding.pinnedVersion) {
    if (variant.required) {
      warnings.push(`Variant "${variant.label}" requires a snippet selection.`);
    }
    return "";
  }

  const snippet = snippets.find((item) => item.id === binding.snippetId);
  if (!snippet) {
    warnings.push(`Variant "${variant.label}" references a missing snippet.`);
    return "";
  }
  if (
    variant.allowedSnippetTypes &&
    !variant.allowedSnippetTypes.includes(snippet.type)
  ) {
    warnings.push(`Variant "${variant.label}" does not accept snippet type "${snippet.type}".`);
    return "";
  }
  const content = getSnippetContent(snippet, binding.pinnedVersion);
  if (!content) {
    warnings.push(`Variant "${variant.label}" references an unavailable snippet version.`);
    return "";
  }
  return interpolateTemplate(content, rawVariables);
}

export function buildScenarioRenderVariables(
  template: PromptTemplate,
  scenario: Scenario,
  snippets: Snippet[],
  warnings: string[]
) {
  const resolvedTemplate = resolveTemplateVersion(template, scenario.templateVersion);
  const baseVariables: VariableValues = { ...scenario.variableValues };

  resolvedTemplate.variants.forEach((variant) => {
    if (variant.type !== "snippet") {
      return;
    }
    baseVariables[variant.key] = resolveVariantSnippetBinding(
      variant,
      scenario.variantSnippetBindings,
      snippets,
      baseVariables,
      warnings
    );
  });

  return baseVariables;
}

function resolveSlot(
  slot: TemplateSlotDefinition,
  scenario: Scenario,
  snippets: Snippet[],
  warnings: string[]
) {
  if (!evaluateCondition(slot.conditionRule, scenario.variableValues)) {
    return null;
  }

  const binding =
    scenario.snippetBindings.find((item) => item.slot === slot.slot) ??
    (slot.defaultSnippetId
      ? {
          slot: slot.slot,
          snippetId: slot.defaultSnippetId,
          pinnedVersion: snippets.find((item) => item.id === slot.defaultSnippetId)?.currentVersion
        }
      : undefined);

  if (!binding?.snippetId || !binding.pinnedVersion) {
    if (slot.required) {
      warnings.push(`Slot "${slot.slot}" is missing a snippet binding.`);
    }
    return null;
  }

  const snippet = snippets.find((item) => item.id === binding.snippetId);
  if (!snippet) {
    warnings.push(`Slot "${slot.slot}" references a missing snippet.`);
    return null;
  }

  if (!slot.allowedSnippetTypes.includes(snippet.type)) {
    warnings.push(`Slot "${slot.slot}" cannot use snippet type "${snippet.type}".`);
    return null;
  }

  const content = getSnippetContent(snippet, binding.pinnedVersion);
  if (!content) {
    warnings.push(
      `Snippet "${snippet.name}" version ${binding.pinnedVersion} is unavailable.`
    );
    return null;
  }

  return {
    id: `${slot.id}-${binding.snippetId}-${binding.pinnedVersion}`,
    sourceType: "snippet" as const,
    sourceName: snippet.name,
    sourceVersion: binding.pinnedVersion,
    slot: slot.slot,
    content: interpolateTemplate(content, scenario.variableValues)
  };
}

export function renderScenarioPreview(
  template: PromptTemplate,
  scenario: Scenario,
  snippets: Snippet[]
): RenderPreviewResult {
  const resolvedTemplate = resolveTemplateVersion(template, scenario.templateVersion);
  const renderWarnings: string[] = [];
  const renderVariables = buildScenarioRenderVariables(
    template,
    scenario,
    snippets,
    renderWarnings
  );
  const missingVariables = getTemplateInputSchema(resolvedTemplate)
    .filter((item) => item.required)
    .filter((item) => {
      const value = renderVariables[item.key];
      if (item.type === "boolean") {
        return value === undefined;
      }
      return value === undefined || value === "";
    })
    .map((item) => item.key);

  const resolvedBlocks = [
    ...resolvedTemplate.slots
      .map((slot) => resolveSlot(slot, { ...scenario, variableValues: renderVariables }, snippets, renderWarnings))
      .filter((value): value is NonNullable<typeof value> => Boolean(value)),
    ...resolvedTemplate.localBlocks
      .filter((block) => evaluateCondition(block.conditionRule, renderVariables))
      .map((block) => ({
        id: block.id,
        sourceType: "local" as const,
        sourceName: block.title,
        slot: block.slot,
        content: interpolateTemplate(block.content, renderVariables)
      }))
  ];

  let renderedPrompt = interpolateTemplate(resolvedTemplate.body, renderVariables);
  resolvedTemplate.slots.forEach((slot) => {
    const block = resolvedBlocks.find(
      (item) => item.sourceType === "snippet" && item.slot === slot.slot
    );
    renderedPrompt = renderedPrompt.replace(`{{slot:${slot.slot}}}`, block?.content ?? "");
  });

  resolvedTemplate.localBlocks.forEach((block) => {
    const resolvedBlock = resolvedBlocks.find(
      (item) => item.sourceType === "local" && item.slot === block.slot
    );
    renderedPrompt = renderedPrompt.replace(
      `{{slot:${block.slot}}}`,
      resolvedBlock?.content ?? ""
    );
  });

  if (/\{\{slot:[^}]+\}\}/.test(renderedPrompt)) {
    renderWarnings.push("One or more slots remain unresolved.");
  }

  return {
    renderedPrompt: renderedPrompt.trim(),
    resolvedBlocks,
    missingVariables,
    renderWarnings
  };
}

export function validateScenario(
  template: PromptTemplate,
  scenario: Scenario,
  snippets: Snippet[]
) {
  const resolvedTemplate = resolveTemplateVersion(template, scenario.templateVersion);
  const preview = renderScenarioPreview(template, scenario, snippets);
  const errors: string[] = [];

  if (preview.missingVariables.length > 0) {
    errors.push(`Missing required variables: ${preview.missingVariables.join(", ")}`);
  }

  getTemplateInputSchema(resolvedTemplate).forEach((item) => {
    const value =
      item.key in scenario.variableValues ? scenario.variableValues[item.key] : undefined;
    if (value === undefined || value === "") {
      return;
    }
    if (item.type === "boolean" && typeof value !== "boolean") {
      errors.push(`Variable "${item.key}" must be a boolean.`);
    }
    const variant = resolvedTemplate.variants.find((entry) => entry.key === item.key);
    if (
      item.type === "select" &&
      variant?.type !== "creatable_select" &&
      item.options &&
      !item.options.includes(String(value))
    ) {
      errors.push(`Variable "${item.key}" must match one of the configured options.`);
    }
  });

  resolvedTemplate.variants
    .filter((variant) => variant.type === "snippet")
    .forEach((variant) => {
      const binding =
        scenario.variantSnippetBindings.find((item) => item.key === variant.key) ??
        (variant.defaultSnippetId
          ? {
              key: variant.key,
              snippetId: variant.defaultSnippetId,
              pinnedVersion:
                snippets.find((item) => item.id === variant.defaultSnippetId)?.currentVersion ?? 0
            }
          : undefined);

      if (!binding?.snippetId || !binding.pinnedVersion) {
        if (variant.required) {
          errors.push(`Variant "${variant.label}" requires a snippet selection.`);
        }
        return;
      }

      const snippet = snippets.find((item) => item.id === binding.snippetId);
      if (!snippet) {
        errors.push(`Variant "${variant.label}" references a missing snippet.`);
        return;
      }
      if (
        variant.allowedSnippetTypes &&
        !variant.allowedSnippetTypes.includes(snippet.type)
      ) {
        errors.push(
          `Variant "${variant.label}" only accepts ${variant.allowedSnippetTypes.join(", ")} snippets.`
        );
        return;
      }
      if (!snippet.versions.some((item) => item.version === binding.pinnedVersion)) {
        errors.push(`Variant "${variant.label}" references an unavailable snippet version.`);
      }
    });

  resolvedTemplate.slots.forEach((slot) => {
    if (!evaluateCondition(slot.conditionRule, scenario.variableValues)) {
      return;
    }

    const binding =
      scenario.snippetBindings.find((item) => item.slot === slot.slot) ??
      (slot.defaultSnippetId
        ? {
            slot: slot.slot,
            snippetId: slot.defaultSnippetId,
            pinnedVersion:
              snippets.find((item) => item.id === slot.defaultSnippetId)?.currentVersion ?? 0
          }
        : undefined);

    if (!binding?.snippetId || !binding.pinnedVersion) {
      if (slot.required) {
        errors.push(`Slot "${slot.slot}" requires a snippet selection.`);
      }
      return;
    }

    const snippet = snippets.find((item) => item.id === binding.snippetId);
    if (!snippet) {
      errors.push(`Slot "${slot.slot}" references a missing snippet.`);
      return;
    }
    if (!slot.allowedSnippetTypes.includes(snippet.type)) {
      errors.push(`Slot "${slot.slot}" only accepts ${slot.allowedSnippetTypes.join(", ")} snippets.`);
      return;
    }
    if (!snippet.versions.some((item) => item.version === binding.pinnedVersion)) {
      errors.push(`Snippet "${snippet.name}" version ${binding.pinnedVersion} is unavailable.`);
    }
  });

  if (preview.renderWarnings.some((item) => item.includes("unresolved"))) {
    errors.push("Scenario contains unresolved slots.");
  }

  return {
    errors,
    preview
  };
}

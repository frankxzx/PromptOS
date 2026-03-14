import type { PromptTemplate, Scenario, Snippet } from "./types";
import { getTemplateDefaults, resolveTemplateVersion } from "./render";

export function createScenarioFromTemplate(
  template: PromptTemplate,
  snippets: Snippet[],
  templateVersion: number
): Scenario {
  const resolvedTemplate = resolveTemplateVersion(template, templateVersion);
  return {
    id: `scenario-${template.id}`,
    name: `${template.name} Scenario`,
    description: "New scenario instance",
    templateId: template.id,
    templateVersion,
    status: "draft",
    language: resolvedTemplate.defaultLanguage,
    variableValues: getTemplateDefaults(resolvedTemplate),
    evaluationDimensions: resolvedTemplate.evaluationDimensions.map((item) => ({
      key: item.key,
      label: item.label,
      description: item.description,
      enabled: item.enabledByDefault,
      weight: item.defaultWeight ?? 1
    })),
    personaBindings: [],
    variantSnippetBindings: resolvedTemplate.variants
      .filter((variant) => variant.type === "snippet" && variant.defaultSnippetId)
      .map((variant) => ({
        key: variant.key,
        snippetId: variant.defaultSnippetId,
        pinnedVersion:
          snippets.find((item) => item.id === variant.defaultSnippetId)?.currentVersion
      })),
    snippetBindings: resolvedTemplate.slots
      .filter((slot) => slot.defaultSnippetId)
      .map((slot) => ({
        slot: slot.slot,
        snippetId: slot.defaultSnippetId,
        pinnedVersion: snippets.find((item) => item.id === slot.defaultSnippetId)?.currentVersion
      })),
    renderedPrompt: "",
    renderedEvaluationPrompt: "",
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: "Editor User",
    versions: []
  };
}

export function syncScenarioToTemplateVersion(
  scenario: Scenario,
  template: PromptTemplate
): Scenario {
  const resolvedTemplate = resolveTemplateVersion(template, scenario.templateVersion);
  const defaults = getTemplateDefaults(resolvedTemplate);
  const allowedSlots = new Set(resolvedTemplate.slots.map((slot) => slot.slot));
  const allowedVariantKeys = new Set(resolvedTemplate.variants.map((variant) => variant.key));
  const allowedLanguages = new Set(resolvedTemplate.supportedLanguages);
  const allowedEvaluationKeys = new Set(
    resolvedTemplate.evaluationDimensions.map((dimension) => dimension.key)
  );

  return {
    ...scenario,
    language: allowedLanguages.has(scenario.language)
      ? scenario.language
      : resolvedTemplate.defaultLanguage,
    variableValues: {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(scenario.variableValues).filter(([key]) =>
          Object.prototype.hasOwnProperty.call(defaults, key)
        )
      )
    },
    evaluationDimensions: resolvedTemplate.evaluationDimensions.map((dimension) => {
      const current = scenario.evaluationDimensions.find((item) => item.key === dimension.key);
      return {
        key: dimension.key,
        label: dimension.label,
        description: dimension.description,
        enabled: current?.enabled ?? dimension.enabledByDefault,
        weight: current?.weight ?? dimension.defaultWeight ?? 1
      };
    }).filter((dimension) => allowedEvaluationKeys.has(dimension.key)),
    personaBindings: scenario.personaBindings.map((binding) => ({ ...binding })),
    variantSnippetBindings: scenario.variantSnippetBindings.filter((binding) =>
      allowedVariantKeys.has(binding.key)
    ),
    snippetBindings: scenario.snippetBindings.filter((binding) => allowedSlots.has(binding.slot))
  };
}

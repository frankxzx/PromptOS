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
    variableValues: getTemplateDefaults(resolvedTemplate),
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

  return {
    ...scenario,
    variableValues: {
      ...defaults,
      ...Object.fromEntries(
        Object.entries(scenario.variableValues).filter(([key]) =>
          Object.prototype.hasOwnProperty.call(defaults, key)
        )
      )
    },
    variantSnippetBindings: scenario.variantSnippetBindings.filter((binding) =>
      allowedVariantKeys.has(binding.key)
    ),
    snippetBindings: scenario.snippetBindings.filter((binding) => allowedSlots.has(binding.slot))
  };
}

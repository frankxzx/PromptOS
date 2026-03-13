import { describe, expect, it } from "vitest";
import { initialStudioState } from "./mockData";
import {
  renderScenarioPreview,
  resolveTemplateVersion,
  validateScenario,
  validateTemplateStructure
} from "./render";

describe("scenario rendering", () => {
  const template = initialStudioState.templates[0];
  const snippets = initialStudioState.snippets;
  const scenario = initialStudioState.scenarios[0];

  it("uses the pinned snippet version selected by the scenario", () => {
    const preview = renderScenarioPreview(template, scenario, snippets);

    expect(preview.renderedPrompt).toContain(
      "Protect narrative consistency and keep the exchange safe."
    );
    expect(preview.renderedPrompt).not.toContain("Keep the exchange immersive");
    expect(preview.renderedPrompt).toContain("Use a warm, concise, encouraging tone.");
  });

  it("blocks ready validation when required variables are missing or invalid", () => {
    const result = validateScenario(
      template,
      {
        ...scenario,
        variableValues: {
          role_name: "",
          response_format: "yaml",
          include_guardrail: true
        }
      },
      snippets
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Missing required variables: role_name"),
        expect.stringContaining('Variable "response_format" must match one of the configured options.')
      ])
    );
  });

  it("rejects snippets whose type is not allowed by the template slot", () => {
    const result = validateScenario(
      template,
      {
        ...scenario,
        snippetBindings: scenario.snippetBindings.map((binding) =>
          binding.slot === "tone"
            ? {
                ...binding,
                snippetId: "snippet-format-json",
                pinnedVersion: 1
              }
            : binding
        )
      },
      snippets
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Slot "tone" only accepts tone snippets.')
      ])
    );
  });

  it("resolves the scenario against the pinned template version", () => {
    const resolved = resolveTemplateVersion(template, 1);

    expect(resolved.version).toBe(1);
    expect(resolved.variants).toHaveLength(0);
    expect(resolved.slots.find((slot) => slot.slot === "tone")).toBeUndefined();
  });

  it("allows creatable select variants to use custom values", () => {
    const briefTemplate = initialStudioState.templates[1];
    const briefScenario = initialStudioState.scenarios[1];

    const result = validateScenario(
      briefTemplate,
      {
        ...briefScenario,
        variableValues: {
          ...briefScenario.variableValues,
          brief_depth: "ultra-brief"
        }
      },
      snippets
    );

    expect(result.errors).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('Variable "brief_depth" must match one of the configured options.')
      ])
    );
  });

  it("flags template structure problems before an admin marks it ready", () => {
    const result = validateTemplateStructure(
      {
        ...template,
        slots: template.slots.map((slot) =>
          slot.slot === "tone"
            ? {
                ...slot,
                defaultSnippetId: "snippet-format-json"
              }
            : slot
        )
      },
      snippets
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Slot "tone" has an incompatible default snippet.')
      ])
    );
  });

  it("flags unknown body placeholders that are not declared in template fields", () => {
    const result = validateTemplateStructure(
      {
        ...template,
        body: `${template.body}\n\nUse fallback for {{role_name_error}}`
      },
      snippets
    );

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Body references unknown field "role_name_error".')
      ])
    );
  });
});

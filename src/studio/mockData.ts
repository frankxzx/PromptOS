import type { PromptTemplate, Scenario, Snippet, StudioState } from "./types";

const snippets: Snippet[] = [
  {
    id: "snippet-persona-host-aiko",
    name: "Aiko, Calm Host",
    type: "persona",
    description: "A culturally grounded, calm host persona with measured language.",
    status: "active",
    usageCount: 1,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content: [
          "Name: Aiko",
          "Personality: calm, precise, emotionally controlled.",
          "Cultural background: Japanese urban professional with strong etiquette norms.",
          "Communication style: polite, indirect, steady, and respectful.",
          "Behavior boundary: never become confrontational or chaotic."
        ].join("\n"),
        createdAt: "2026-03-02T08:00:00.000Z",
        createdBy: "Mina",
        notes: "Primary host persona."
      }
    ]
  },
  {
    id: "snippet-persona-advisor-mateo",
    name: "Mateo, Direct Advisor",
    type: "persona",
    description: "A pragmatic supporting persona with clear decision framing.",
    status: "active",
    usageCount: 1,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content: [
          "Name: Mateo",
          "Personality: pragmatic, decisive, commercially aware.",
          "Cultural background: multilingual insurance advisor used to high-pressure tradeoffs.",
          "Communication style: direct, concise, confident.",
          "Behavior boundary: stay factual and avoid manipulative pressure."
        ].join("\n"),
        createdAt: "2026-03-03T08:00:00.000Z",
        createdBy: "Avery",
        notes: "Supporting advisor persona."
      }
    ]
  },
  {
    id: "snippet-role-moderator",
    name: "Moderator Persona",
    type: "role",
    description: "Defines the assistant as a trusted live role-play moderator.",
    status: "active",
    usageCount: 2,
    currentVersion: 2,
    versions: [
      {
        version: 1,
        content:
          "You are a live role-play moderator. Protect narrative consistency and keep the exchange safe.",
        createdAt: "2026-03-01T08:00:00.000Z",
        createdBy: "Mina",
        notes: "Initial production version."
      },
      {
        version: 2,
        content:
          "You are a live role-play moderator. Keep the exchange immersive, safe, and internally consistent.",
        createdAt: "2026-03-06T08:00:00.000Z",
        createdBy: "Avery",
        notes: "Tightened language for immersion."
      }
    ]
  },
  {
    id: "snippet-tone-friendly",
    name: "Friendly Tone",
    type: "tone",
    description: "Adds a concise and friendly tone guide.",
    status: "active",
    usageCount: 1,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content: "Use a warm, concise, encouraging tone. Avoid slang.",
        createdAt: "2026-03-02T08:00:00.000Z",
        createdBy: "Avery",
        notes: "Default tone guidance."
      }
    ]
  },
  {
    id: "snippet-tone-strict",
    name: "Strict Tone",
    type: "tone",
    description: "A more policy-heavy and restrained tone option.",
    status: "active",
    usageCount: 0,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content: "Use a direct, restrained, procedural tone. Avoid warmth and embellishment.",
        createdAt: "2026-03-07T08:00:00.000Z",
        createdBy: "Mina",
        notes: "Fallback tone for policy-sensitive flows."
      }
    ]
  },
  {
    id: "snippet-format-json",
    name: "Structured JSON Output",
    type: "format",
    description: "Pins the assistant to a stable JSON schema.",
    status: "active",
    usageCount: 1,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content:
          "Return valid JSON with keys: summary, actions, safety_flags. Do not wrap in markdown fences.",
        createdAt: "2026-03-01T08:00:00.000Z",
        createdBy: "Mina",
        notes: "JSON shape for downstream parsing."
      }
    ]
  },
  {
    id: "snippet-safety-boundary",
    name: "Safety Boundary",
    type: "safety",
    description: "Explains refusal boundary for unsafe requests.",
    status: "active",
    usageCount: 2,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content:
          "If the user requests disallowed content, refuse briefly and redirect to a safe alternative.",
        createdAt: "2026-03-01T08:00:00.000Z",
        createdBy: "Mina",
        notes: "Core safety guardrail."
      }
    ]
  },
  {
    id: "snippet-instruction-host",
    name: "Host Task",
    type: "instruction",
    description: "Default task block for live host moderation scenarios.",
    status: "active",
    usageCount: 1,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content:
          "Moderate the conversation for {{role_name}}. Keep responses under 120 words and preserve scene continuity.",
        createdAt: "2026-03-08T08:00:00.000Z",
        createdBy: "Avery",
        notes: "Scenario task default."
      }
    ]
  },
  {
    id: "snippet-instruction-brief",
    name: "Character Brief Task",
    type: "instruction",
    description: "Task block for character briefing scenarios.",
    status: "active",
    usageCount: 1,
    currentVersion: 1,
    versions: [
      {
        version: 1,
        content:
          "Create a short operating brief for character {{character_name}} with motivations, boundaries, and hooks.",
        createdAt: "2026-03-08T09:00:00.000Z",
        createdBy: "Mina",
        notes: "Default brief task."
      }
    ]
  }
];

const templates: PromptTemplate[] = [
  {
    id: "template-live-host",
    name: "Live Host Moderation Template",
    businessDomain: "Role Play",
    description: "Defines the moderation prompt structure and allowed snippet slots.",
    status: "ready",
    templateMode: "visual",
    body: [
      "Context for role: {{role_name}}",
      "Moderation style: {{moderation_style}}",
      "",
      "{{personas}}",
      "",
      "{{slot:role}}",
      "",
      "{{slot:tone}}",
      "",
      "{{slot:instruction}}",
      "",
      "{{slot:safety}}",
      "",
      "{{slot:format}}"
    ].join("\n"),
    variableSchema: [
      {
        key: "role_name",
        label: "Role Name",
        type: "text",
        required: true,
        defaultValue: "Host",
        sampleValues: ["Host", "Game Master"],
        helperText: "Shown in template intro and can be referenced by snippets."
      },
      {
        key: "response_format",
        label: "Response Format",
        type: "select",
        required: true,
        defaultValue: "json",
        options: ["json", "markdown"],
        sampleValues: ["json", "markdown"]
      },
      {
        key: "include_guardrail",
        label: "Include Guardrail",
        type: "boolean",
        required: false,
        defaultValue: true,
        sampleValues: [true, false]
      }
    ],
    variants: [
      {
        id: "variant-moderation-style",
        key: "moderation_style",
        label: "Moderation Style",
        description: "Controls the overall stance the scenario should emphasize.",
        required: true,
        type: "dropdown",
        options: ["balanced", "strict", "playful"],
        defaultValue: "balanced"
      },
      {
        id: "variant-tone-override",
        key: "tone_override",
        label: "Tone Override Snippet",
        description: "Lets the scenario choose a nested tone snippet as a variant.",
        required: false,
        type: "snippet",
        options: [],
        allowedSnippetTypes: ["tone"],
        defaultSnippetId: "snippet-tone-friendly"
      }
    ],
    slots: [
      {
        id: "slot-role",
        slot: "role",
        label: "Role snippet",
        description: "Persona or system identity block.",
        required: true,
        allowedSnippetTypes: ["role"],
        defaultSnippetId: "snippet-role-moderator"
      },
      {
        id: "slot-tone",
        slot: "tone",
        label: "Tone snippet",
        description: "Optional tone guidance.",
        required: false,
        allowedSnippetTypes: ["tone"]
      },
      {
        id: "slot-instruction",
        slot: "instruction",
        label: "Instruction snippet",
        description: "Scenario task instruction selected at instance time.",
        required: true,
        allowedSnippetTypes: ["instruction"]
      },
      {
        id: "slot-safety",
        slot: "safety",
        label: "Safety snippet",
        description: "Safety boundary shown when guardrail is enabled.",
        required: false,
        allowedSnippetTypes: ["safety"],
        defaultSnippetId: "snippet-safety-boundary",
        conditionRule: {
          variableKey: "include_guardrail",
          operator: "equals",
          value: true
        }
      },
      {
        id: "slot-format",
        slot: "format",
        label: "Format snippet",
        description: "Output contract.",
        required: false,
        allowedSnippetTypes: ["format"],
        defaultSnippetId: "snippet-format-json",
        conditionRule: {
          variableKey: "response_format",
          operator: "equals",
          value: "json"
        }
      }
    ],
    localBlocks: [],
    supportedLanguages: ["en", "zh"],
    defaultLanguage: "en",
    evaluationBody: [
      "Review the realtime conversation for policy compliance, flow quality, and language control.",
      "",
      "Required language: {{language}}",
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
      },
      {
        id: "dimension-policy-compliance",
        key: "policy_compliance",
        label: "Policy Compliance",
        description: "Checks whether the assistant followed the configured safety policy.",
        enabledByDefault: true,
        defaultWeight: 1
      },
      {
        id: "dimension-conversation-quality",
        key: "conversation_quality",
        label: "Conversation Quality",
        description: "Checks clarity, flow, and responsiveness in the conversation.",
        enabledByDefault: true,
        defaultWeight: 1
      }
    ],
    testCases: [
      {
        id: "test-live-host-default",
        name: "Default host flow",
        templateVersion: 2,
        language: "en",
        variableValues: {
          role_name: "Host",
          response_format: "json",
          include_guardrail: true,
          moderation_style: "balanced"
        },
        personaBindings: [
          {
            id: "persona-binding-aiko",
            snippetId: "snippet-persona-host-aiko",
            pinnedVersion: 1
          },
          {
            id: "persona-binding-mateo",
            snippetId: "snippet-persona-advisor-mateo",
            pinnedVersion: 1
          }
        ],
        evaluationDimensions: [
          {
            key: "language_compliance",
            label: "Language Compliance",
            description: "Checks whether the assistant stayed in the required scenario language.",
            enabled: true,
            weight: 1
          },
          {
            key: "policy_compliance",
            label: "Policy Compliance",
            description: "Checks whether the assistant followed the configured safety policy.",
            enabled: true,
            weight: 1
          },
          {
            key: "conversation_quality",
            label: "Conversation Quality",
            description: "Checks clarity, flow, and responsiveness in the conversation.",
            enabled: true,
            weight: 1
          }
        ],
        variantSnippetBindings: [
          {
            key: "tone_override",
            snippetId: "snippet-tone-friendly",
            pinnedVersion: 1
          }
        ],
        snippetBindings: [
          {
            slot: "role",
            snippetId: "snippet-role-moderator",
            pinnedVersion: 1
          },
          {
            slot: "instruction",
            snippetId: "snippet-instruction-host",
            pinnedVersion: 1
          },
          {
            slot: "safety",
            snippetId: "snippet-safety-boundary",
            pinnedVersion: 1
          },
          {
            slot: "format",
            snippetId: "snippet-format-json",
            pinnedVersion: 1
          }
        ]
      }
    ],
    version: 2,
    updatedAt: "2026-03-08T10:45:00.000Z",
    updatedBy: "Avery",
    versions: [
      {
        version: 1,
        body: ["{{slot:role}}", "", "{{slot:instruction}}", "", "{{slot:safety}}"].join("\n"),
        status: "draft",
        templateMode: "structured",
        variableSchema: [
          {
            key: "role_name",
            label: "Role Name",
            type: "text",
            required: true
          }
        ],
        variants: [],
        slots: [
          {
            id: "slot-role",
            slot: "role",
            label: "Role snippet",
            description: "Persona block.",
            required: true,
            allowedSnippetTypes: ["role"]
          }
        ],
        localBlocks: [],
        supportedLanguages: ["en", "zh"],
        defaultLanguage: "en",
        evaluationBody: [
          "Review the realtime conversation for policy compliance, flow quality, and language control.",
          "",
          "Required language: {{language}}",
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
          },
          {
            id: "dimension-policy-compliance",
            key: "policy_compliance",
            label: "Policy Compliance",
            description: "Checks whether the assistant followed the configured safety policy.",
            enabledByDefault: true,
            defaultWeight: 1
          },
          {
            id: "dimension-conversation-quality",
            key: "conversation_quality",
            label: "Conversation Quality",
            description: "Checks clarity, flow, and responsiveness in the conversation.",
            enabledByDefault: true,
            defaultWeight: 1
          }
        ],
        testCases: [],
        updatedAt: "2026-03-04T09:30:00.000Z",
        updatedBy: "Avery",
        notes: "Introduced slot-based structure."
      },
      {
        version: 2,
        body: [
          "Context for role: {{role_name}}",
          "Moderation style: {{moderation_style}}",
          "",
          "{{personas}}",
          "",
          "{{slot:role}}",
          "",
          "{{slot:tone}}",
          "",
          "{{slot:instruction}}",
          "",
          "{{slot:safety}}",
          "",
          "{{slot:format}}"
        ].join("\n"),
        status: "ready",
        templateMode: "visual",
        variableSchema: [
          {
            key: "role_name",
            label: "Role Name",
            type: "text",
            required: true,
            defaultValue: "Host",
            sampleValues: ["Host", "Game Master"]
          },
          {
            key: "response_format",
            label: "Response Format",
            type: "select",
            required: true,
            defaultValue: "json",
            options: ["json", "markdown"],
            sampleValues: ["json", "markdown"]
          },
          {
            key: "include_guardrail",
            label: "Include Guardrail",
            type: "boolean",
            required: false,
            defaultValue: true,
            sampleValues: [true, false]
          }
        ],
        variants: [
          {
            id: "variant-moderation-style",
            key: "moderation_style",
            label: "Moderation Style",
            description: "Controls the overall stance the scenario should emphasize.",
            required: true,
            type: "dropdown",
            options: ["balanced", "strict", "playful"],
            defaultValue: "balanced"
          },
          {
            id: "variant-tone-override",
            key: "tone_override",
            label: "Tone Override Snippet",
            description: "Lets the scenario choose a nested tone snippet as a variant.",
            required: false,
            type: "snippet",
            options: [],
            allowedSnippetTypes: ["tone"],
            defaultSnippetId: "snippet-tone-friendly"
          }
        ],
        slots: [
          {
            id: "slot-role",
            slot: "role",
            label: "Role snippet",
            description: "Persona or system identity block.",
            required: true,
            allowedSnippetTypes: ["role"],
            defaultSnippetId: "snippet-role-moderator"
          },
          {
            id: "slot-tone",
            slot: "tone",
            label: "Tone snippet",
            description: "Optional tone guidance.",
            required: false,
            allowedSnippetTypes: ["tone"]
          },
          {
            id: "slot-instruction",
            slot: "instruction",
            label: "Instruction snippet",
            description: "Scenario task instruction selected at instance time.",
            required: true,
            allowedSnippetTypes: ["instruction"]
          },
          {
            id: "slot-safety",
            slot: "safety",
            label: "Safety snippet",
            description: "Safety boundary shown when guardrail is enabled.",
            required: false,
            allowedSnippetTypes: ["safety"],
            defaultSnippetId: "snippet-safety-boundary",
            conditionRule: {
              variableKey: "include_guardrail",
              operator: "equals",
              value: true
            }
          },
          {
            id: "slot-format",
            slot: "format",
            label: "Format snippet",
            description: "Output contract.",
            required: false,
            allowedSnippetTypes: ["format"],
            defaultSnippetId: "snippet-format-json",
            conditionRule: {
              variableKey: "response_format",
              operator: "equals",
              value: "json"
            }
          }
        ],
        localBlocks: [],
        supportedLanguages: ["en", "zh"],
        defaultLanguage: "en",
        evaluationBody: [
          "Review the realtime conversation for policy compliance, flow quality, and language control.",
          "",
          "Required language: {{language}}",
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
          },
          {
            id: "dimension-policy-compliance",
            key: "policy_compliance",
            label: "Policy Compliance",
            description: "Checks whether the assistant followed the configured safety policy.",
            enabledByDefault: true,
            defaultWeight: 1
          },
          {
            id: "dimension-conversation-quality",
            key: "conversation_quality",
            label: "Conversation Quality",
            description: "Checks clarity, flow, and responsiveness in the conversation.",
            enabledByDefault: true,
            defaultWeight: 1
          }
        ],
        testCases: [
          {
            id: "test-live-host-default",
            name: "Default host flow",
            templateVersion: 2,
            language: "en",
            variableValues: {
              role_name: "Host",
              response_format: "json",
              include_guardrail: true,
              moderation_style: "balanced"
            },
            personaBindings: [
              {
                id: "persona-binding-aiko",
                snippetId: "snippet-persona-host-aiko",
                pinnedVersion: 1
              },
              {
                id: "persona-binding-mateo",
                snippetId: "snippet-persona-advisor-mateo",
                pinnedVersion: 1
              }
            ],
            evaluationDimensions: [
              {
                key: "language_compliance",
                label: "Language Compliance",
                description: "Checks whether the assistant stayed in the required scenario language.",
                enabled: true,
                weight: 1
              },
              {
                key: "policy_compliance",
                label: "Policy Compliance",
                description: "Checks whether the assistant followed the configured safety policy.",
                enabled: true,
                weight: 1
              },
              {
                key: "conversation_quality",
                label: "Conversation Quality",
                description: "Checks clarity, flow, and responsiveness in the conversation.",
                enabled: true,
                weight: 1
              }
            ],
            variantSnippetBindings: [
              {
                key: "tone_override",
                snippetId: "snippet-tone-friendly",
                pinnedVersion: 1
              }
            ],
            snippetBindings: [
              {
                slot: "role",
                snippetId: "snippet-role-moderator",
                pinnedVersion: 1
              },
              {
                slot: "instruction",
                snippetId: "snippet-instruction-host",
                pinnedVersion: 1
              },
              {
                slot: "safety",
                snippetId: "snippet-safety-boundary",
                pinnedVersion: 1
              },
              {
                slot: "format",
                snippetId: "snippet-format-json",
                pinnedVersion: 1
              }
            ]
          }
        ],
        updatedAt: "2026-03-08T10:45:00.000Z",
        updatedBy: "Avery",
        notes: "Added tone and format slots."
      }
    ]
  },
  {
    id: "template-character-brief",
    name: "Character Brief Template",
    businessDomain: "Story Ops",
    description: "Builds short operational character briefs from reusable blocks.",
    status: "draft",
    templateMode: "structured",
    body: [
      "Character under review: {{character_name}}",
      "Brief depth: {{brief_depth}}",
      "",
      "{{personas}}",
      "",
      "{{slot:role}}",
      "",
      "{{slot:instruction}}",
      "",
      "{{slot:safety}}"
    ].join("\n"),
    variableSchema: [
      {
        key: "character_name",
        label: "Character Name",
        type: "text",
        required: true,
        sampleValues: ["Luna", "Kai"]
      }
    ],
    variants: [
      {
        id: "variant-brief-depth",
        key: "brief_depth",
        label: "Brief Depth",
        description: "Controls how detailed the brief should be.",
        required: true,
        type: "creatable_select",
        options: ["compact", "standard", "deep"],
        defaultValue: "standard"
      },
      {
        id: "variant-brief-note",
        key: "brief_note",
        label: "Brief Note",
        description: "Freeform note injected into the template.",
        required: false,
        type: "input",
        options: [],
        defaultValue: "Keep it production-ready"
      }
    ],
    slots: [
      {
        id: "slot-role-brief",
        slot: "role",
        label: "Role snippet",
        description: "Persona block for brief generation.",
        required: true,
        allowedSnippetTypes: ["role"],
        defaultSnippetId: "snippet-role-moderator"
      },
      {
        id: "slot-instruction-brief",
        slot: "instruction",
        label: "Instruction snippet",
        description: "The task definition chosen per scenario.",
        required: true,
        allowedSnippetTypes: ["instruction"],
        defaultSnippetId: "snippet-instruction-brief"
      },
      {
        id: "slot-safety-brief",
        slot: "safety",
        label: "Safety snippet",
        description: "Optional safety guidance.",
        required: false,
        allowedSnippetTypes: ["safety"]
      }
    ],
    localBlocks: [],
    supportedLanguages: ["en", "zh", "ja"],
    defaultLanguage: "en",
    evaluationBody: [
      "Evaluate the generated character brief for instruction quality and decision framing.",
      "",
      "Required language: {{language}}",
      "",
      "{{evaluation_dimensions}}"
    ].join("\n"),
    evaluationDimensions: [
      {
        id: "dimension-language-compliance-brief",
        key: "language_compliance",
        label: "Language Compliance",
        description: "Checks whether the brief stayed in the required scenario language.",
        enabledByDefault: true,
        defaultWeight: 1
      },
      {
        id: "dimension-instruction-following",
        key: "instruction_following",
        label: "Instruction Following",
        description: "Checks whether the brief follows the scenario constraints.",
        enabledByDefault: true,
        defaultWeight: 1
      },
      {
        id: "dimension-decision-quality",
        key: "decision_quality",
        label: "Decision Quality",
        description: "Checks whether motivations and choices are coherent and useful.",
        enabledByDefault: true,
        defaultWeight: 1
      }
    ],
    testCases: [
      {
        id: "test-character-brief-default",
        name: "Default brief flow",
        templateVersion: 1,
        language: "en",
        variableValues: {
          character_name: "Luna",
          brief_depth: "standard",
          brief_note: "Keep it production-ready"
        },
        personaBindings: [
          {
            id: "persona-binding-aiko-brief",
            snippetId: "snippet-persona-host-aiko",
            pinnedVersion: 1
          }
        ],
        evaluationDimensions: [
          {
            key: "language_compliance",
            label: "Language Compliance",
            description: "Checks whether the brief stayed in the required scenario language.",
            enabled: true,
            weight: 1
          },
          {
            key: "instruction_following",
            label: "Instruction Following",
            description: "Checks whether the brief follows the scenario constraints.",
            enabled: true,
            weight: 1
          },
          {
            key: "decision_quality",
            label: "Decision Quality",
            description: "Checks whether motivations and choices are coherent and useful.",
            enabled: true,
            weight: 1
          }
        ],
        variantSnippetBindings: [],
        snippetBindings: [
          {
            slot: "role",
            snippetId: "snippet-role-moderator",
            pinnedVersion: 1
          },
          {
            slot: "instruction",
            snippetId: "snippet-instruction-brief",
            pinnedVersion: 1
          }
        ]
      }
    ],
    version: 1,
    updatedAt: "2026-03-07T12:00:00.000Z",
    updatedBy: "Mina",
    versions: [
      {
        version: 1,
        body: [
          "Character under review: {{character_name}}",
          "Brief depth: {{brief_depth}}",
          "",
          "{{personas}}",
          "",
          "{{slot:role}}",
          "",
          "{{slot:instruction}}",
          "",
          "{{slot:safety}}"
        ].join("\n"),
        status: "draft",
        templateMode: "structured",
        variableSchema: [
          {
            key: "character_name",
            label: "Character Name",
            type: "text",
            required: true,
            sampleValues: ["Luna", "Kai"]
          }
        ],
        variants: [
          {
            id: "variant-brief-depth",
            key: "brief_depth",
            label: "Brief Depth",
            description: "Controls how detailed the brief should be.",
            required: true,
            type: "creatable_select",
            options: ["compact", "standard", "deep"],
            defaultValue: "standard"
          },
          {
            id: "variant-brief-note",
            key: "brief_note",
            label: "Brief Note",
            description: "Freeform note injected into the template.",
            required: false,
            type: "input",
            options: [],
            defaultValue: "Keep it production-ready"
          }
        ],
        slots: [
          {
            id: "slot-role-brief",
            slot: "role",
            label: "Role snippet",
            description: "Persona block for brief generation.",
            required: true,
            allowedSnippetTypes: ["role"],
            defaultSnippetId: "snippet-role-moderator"
          },
          {
            id: "slot-instruction-brief",
            slot: "instruction",
            label: "Instruction snippet",
            description: "The task definition chosen per scenario.",
            required: true,
            allowedSnippetTypes: ["instruction"],
            defaultSnippetId: "snippet-instruction-brief"
          },
          {
            id: "slot-safety-brief",
            slot: "safety",
            label: "Safety snippet",
            description: "Optional safety guidance.",
            required: false,
            allowedSnippetTypes: ["safety"]
          }
        ],
        localBlocks: [],
        supportedLanguages: ["en", "zh", "ja"],
        defaultLanguage: "en",
        evaluationBody: [
          "Evaluate the generated character brief for instruction quality and decision framing.",
          "",
          "Required language: {{language}}",
          "",
          "{{evaluation_dimensions}}"
        ].join("\n"),
        evaluationDimensions: [
          {
            id: "dimension-language-compliance-brief",
            key: "language_compliance",
            label: "Language Compliance",
            description: "Checks whether the brief stayed in the required scenario language.",
            enabledByDefault: true,
            defaultWeight: 1
          },
          {
            id: "dimension-instruction-following",
            key: "instruction_following",
            label: "Instruction Following",
            description: "Checks whether the brief follows the scenario constraints.",
            enabledByDefault: true,
            defaultWeight: 1
          },
          {
            id: "dimension-decision-quality",
            key: "decision_quality",
            label: "Decision Quality",
            description: "Checks whether motivations and choices are coherent and useful.",
            enabledByDefault: true,
            defaultWeight: 1
          }
        ],
        testCases: [
          {
            id: "test-character-brief-default",
            name: "Default brief flow",
            templateVersion: 1,
            language: "en",
            variableValues: {
              character_name: "Luna",
              brief_depth: "standard",
              brief_note: "Keep it production-ready"
            },
            personaBindings: [
              {
                id: "persona-binding-aiko-brief",
                snippetId: "snippet-persona-host-aiko",
                pinnedVersion: 1
              }
            ],
            evaluationDimensions: [
              {
                key: "language_compliance",
                label: "Language Compliance",
                description: "Checks whether the brief stayed in the required scenario language.",
                enabled: true,
                weight: 1
              },
              {
                key: "instruction_following",
                label: "Instruction Following",
                description: "Checks whether the brief follows the scenario constraints.",
                enabled: true,
                weight: 1
              },
              {
                key: "decision_quality",
                label: "Decision Quality",
                description: "Checks whether motivations and choices are coherent and useful.",
                enabled: true,
                weight: 1
              }
            ],
            variantSnippetBindings: [],
            snippetBindings: [
              {
                slot: "role",
                snippetId: "snippet-role-moderator",
                pinnedVersion: 1
              },
              {
                slot: "instruction",
                snippetId: "snippet-instruction-brief",
                pinnedVersion: 1
              }
            ]
          }
        ],
        updatedAt: "2026-03-07T12:00:00.000Z",
        updatedBy: "Mina",
        notes: "Initial draft."
      }
    ]
  }
];

const scenarios: Scenario[] = [
  {
    id: "scenario-live-host-json",
    name: "Friday Night Host",
    description: "A concrete live moderation scenario for JSON output.",
    templateId: "template-live-host",
    templateVersion: 2,
    status: "ready",
    language: "en",
    variableValues: {
      role_name: "Host",
      response_format: "json",
      include_guardrail: true,
      moderation_style: "balanced"
    },
    personaBindings: [
      {
        id: "scenario-persona-aiko",
        snippetId: "snippet-persona-host-aiko",
        pinnedVersion: 1
      },
      {
        id: "scenario-persona-mateo",
        snippetId: "snippet-persona-advisor-mateo",
        pinnedVersion: 1
      }
    ],
    evaluationDimensions: [
      {
        key: "language_compliance",
        label: "Language Compliance",
        description: "Checks whether the assistant stayed in the required scenario language.",
        enabled: true,
        weight: 1
      },
      {
        key: "policy_compliance",
        label: "Policy Compliance",
        description: "Checks whether the assistant followed the configured safety policy.",
        enabled: true,
        weight: 1
      },
      {
        key: "conversation_quality",
        label: "Conversation Quality",
        description: "Checks clarity, flow, and responsiveness in the conversation.",
        enabled: true,
        weight: 1
      }
    ],
    variantSnippetBindings: [
      {
        key: "tone_override",
        snippetId: "snippet-tone-friendly",
        pinnedVersion: 1
      }
    ],
    snippetBindings: [
      {
        slot: "role",
        snippetId: "snippet-role-moderator",
        pinnedVersion: 1
      },
      {
        slot: "tone",
        snippetId: "snippet-tone-friendly",
        pinnedVersion: 1
      },
      {
        slot: "instruction",
        snippetId: "snippet-instruction-host",
        pinnedVersion: 1
      },
      {
        slot: "safety",
        snippetId: "snippet-safety-boundary",
        pinnedVersion: 1
      },
      {
        slot: "format",
        snippetId: "snippet-format-json",
        pinnedVersion: 1
      }
    ],
    renderedPrompt: "",
    renderedEvaluationPrompt: "",
    version: 1,
    updatedAt: "2026-03-08T13:00:00.000Z",
    updatedBy: "Avery",
    versions: [
      {
        version: 1,
        status: "ready",
        templateId: "template-live-host",
        templateVersion: 2,
        language: "en",
        variableValues: {
          role_name: "Host",
          response_format: "json",
          include_guardrail: true,
          moderation_style: "balanced"
        },
        personaBindings: [
          {
            id: "scenario-persona-aiko",
            snippetId: "snippet-persona-host-aiko",
            pinnedVersion: 1
          },
          {
            id: "scenario-persona-mateo",
            snippetId: "snippet-persona-advisor-mateo",
            pinnedVersion: 1
          }
        ],
        evaluationDimensions: [
          {
            key: "language_compliance",
            label: "Language Compliance",
            description: "Checks whether the assistant stayed in the required scenario language.",
            enabled: true,
            weight: 1
          },
          {
            key: "policy_compliance",
            label: "Policy Compliance",
            description: "Checks whether the assistant followed the configured safety policy.",
            enabled: true,
            weight: 1
          },
          {
            key: "conversation_quality",
            label: "Conversation Quality",
            description: "Checks clarity, flow, and responsiveness in the conversation.",
            enabled: true,
            weight: 1
          }
        ],
        variantSnippetBindings: [
          {
            key: "tone_override",
            snippetId: "snippet-tone-friendly",
            pinnedVersion: 1
          }
        ],
        snippetBindings: [
          {
            slot: "role",
            snippetId: "snippet-role-moderator",
            pinnedVersion: 1
          },
          {
            slot: "tone",
            snippetId: "snippet-tone-friendly",
            pinnedVersion: 1
          },
          {
            slot: "instruction",
            snippetId: "snippet-instruction-host",
            pinnedVersion: 1
          },
          {
            slot: "safety",
            snippetId: "snippet-safety-boundary",
            pinnedVersion: 1
          },
          {
            slot: "format",
            snippetId: "snippet-format-json",
            pinnedVersion: 1
          }
        ],
        renderedPrompt: "",
        renderedEvaluationPrompt: "",
        updatedAt: "2026-03-08T13:00:00.000Z",
        updatedBy: "Avery",
        notes: "Initial ready scenario."
      }
    ]
  },
  {
    id: "scenario-character-brief",
    name: "Luna Character Brief",
    description: "A draft scenario for character briefing.",
    templateId: "template-character-brief",
    templateVersion: 1,
    status: "draft",
    language: "en",
    variableValues: {
      character_name: "Luna",
      brief_depth: "standard",
      brief_note: "Keep it production-ready"
    },
    personaBindings: [
      {
        id: "scenario-persona-aiko-brief",
        snippetId: "snippet-persona-host-aiko",
        pinnedVersion: 1
      }
    ],
    evaluationDimensions: [
      {
        key: "language_compliance",
        label: "Language Compliance",
        description: "Checks whether the brief stayed in the required scenario language.",
        enabled: true,
        weight: 1
      },
      {
        key: "instruction_following",
        label: "Instruction Following",
        description: "Checks whether the brief follows the scenario constraints.",
        enabled: true,
        weight: 1
      },
      {
        key: "decision_quality",
        label: "Decision Quality",
        description: "Checks whether motivations and choices are coherent and useful.",
        enabled: true,
        weight: 1
      }
    ],
    variantSnippetBindings: [],
    snippetBindings: [
      {
        slot: "role",
        snippetId: "snippet-role-moderator",
        pinnedVersion: 1
      },
      {
        slot: "instruction",
        snippetId: "snippet-instruction-brief",
        pinnedVersion: 1
      }
    ],
    renderedPrompt: "",
    renderedEvaluationPrompt: "",
    version: 1,
    updatedAt: "2026-03-08T14:00:00.000Z",
    updatedBy: "Mina",
    versions: [
      {
        version: 1,
        status: "draft",
        templateId: "template-character-brief",
        templateVersion: 1,
        language: "en",
        variableValues: {
          character_name: "Luna",
          brief_depth: "standard",
          brief_note: "Keep it production-ready"
        },
        personaBindings: [
          {
            id: "scenario-persona-aiko-brief",
            snippetId: "snippet-persona-host-aiko",
            pinnedVersion: 1
          }
        ],
        evaluationDimensions: [
          {
            key: "language_compliance",
            label: "Language Compliance",
            description: "Checks whether the brief stayed in the required scenario language.",
            enabled: true,
            weight: 1
          },
          {
            key: "instruction_following",
            label: "Instruction Following",
            description: "Checks whether the brief follows the scenario constraints.",
            enabled: true,
            weight: 1
          },
          {
            key: "decision_quality",
            label: "Decision Quality",
            description: "Checks whether motivations and choices are coherent and useful.",
            enabled: true,
            weight: 1
          }
        ],
        variantSnippetBindings: [],
        snippetBindings: [
          {
            slot: "role",
            snippetId: "snippet-role-moderator",
            pinnedVersion: 1
          },
          {
            slot: "instruction",
            snippetId: "snippet-instruction-brief",
            pinnedVersion: 1
          }
        ],
        renderedPrompt: "",
        renderedEvaluationPrompt: "",
        updatedAt: "2026-03-08T14:00:00.000Z",
        updatedBy: "Mina",
        notes: "Initial draft."
      }
    ]
  }
];

export const initialStudioState: StudioState = {
  currentRole: "editor",
  templates,
  scenarios,
  snippets
};

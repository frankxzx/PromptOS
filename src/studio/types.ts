export type UserRole = "editor" | "admin";

export type EntityStatus = "draft" | "ready";
export type TemplateMode = "visual" | "structured" | "raw";
export type LanguageCode = "en" | "zh" | "es" | "ja";
export type SnippetType =
  | "persona"
  | "role"
  | "instruction"
  | "format"
  | "safety"
  | "tone"
  | "evaluation_instruction"
  | "evaluation_rubric";
export type SnippetStatus = "active" | "deprecated";
export type VariableType = "text" | "select" | "boolean" | "json";
export type VariantFieldType = "dropdown" | "input" | "creatable_select" | "snippet";

export interface VariableSchemaItem {
  key: string;
  label: string;
  type: VariableType;
  required: boolean;
  defaultValue?: string | boolean;
  options?: string[];
  sampleValues?: Array<string | boolean>;
  helperText?: string;
}

export interface ConditionRule {
  variableKey: string;
  operator: "exists" | "equals";
  value?: string | boolean;
}

export interface SnippetVersion {
  version: number;
  content: string;
  createdAt: string;
  createdBy: string;
  notes: string;
}

export interface Snippet {
  id: string;
  name: string;
  type: SnippetType;
  description: string;
  status: SnippetStatus;
  usageCount: number;
  currentVersion: number;
  versions: SnippetVersion[];
}

export interface TemplateSlotDefinition {
  id: string;
  slot: string;
  label: string;
  description: string;
  required: boolean;
  allowedSnippetTypes: SnippetType[];
  defaultSnippetId?: string;
  conditionRule?: ConditionRule;
}

export interface TemplateVariantDefinition {
  id: string;
  key: string;
  label: string;
  description: string;
  required: boolean;
  type: VariantFieldType;
  options: string[];
  defaultValue?: string;
  allowedSnippetTypes?: SnippetType[];
  defaultSnippetId?: string;
}

export interface LocalBlock {
  id: string;
  title: string;
  slot: string;
  content: string;
  conditionRule?: ConditionRule;
}

export interface EvaluationDimensionDefinition {
  id: string;
  key: string;
  label: string;
  description: string;
  enabledByDefault: boolean;
  defaultWeight?: number;
}

export interface ScenarioEvaluationDimension {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  weight?: number;
}

export interface TemplateTestCase {
  id: string;
  name: string;
  templateVersion: number;
  language: LanguageCode;
  variableValues: Record<string, string | boolean>;
  evaluationDimensions: ScenarioEvaluationDimension[];
  personaBindings: ScenarioPersonaBinding[];
  variantSnippetBindings: ScenarioVariantSnippetBinding[];
  snippetBindings: ScenarioSlotBinding[];
}

export interface PromptTemplateVersion {
  version: number;
  body: string;
  status: EntityStatus;
  templateMode: TemplateMode;
  variableSchema: VariableSchemaItem[];
  variants: TemplateVariantDefinition[];
  slots: TemplateSlotDefinition[];
  localBlocks: LocalBlock[];
  supportedLanguages: LanguageCode[];
  defaultLanguage: LanguageCode;
  evaluationBody: string;
  evaluationDimensions: EvaluationDimensionDefinition[];
  testCases: TemplateTestCase[];
  updatedAt: string;
  updatedBy: string;
  notes: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  businessDomain: string;
  description: string;
  status: EntityStatus;
  templateMode: TemplateMode;
  body: string;
  variableSchema: VariableSchemaItem[];
  variants: TemplateVariantDefinition[];
  slots: TemplateSlotDefinition[];
  localBlocks: LocalBlock[];
  supportedLanguages: LanguageCode[];
  defaultLanguage: LanguageCode;
  evaluationBody: string;
  evaluationDimensions: EvaluationDimensionDefinition[];
  testCases: TemplateTestCase[];
  version: number;
  updatedAt: string;
  updatedBy: string;
  versions: PromptTemplateVersion[];
}

export interface ScenarioSlotBinding {
  slot: string;
  snippetId?: string;
  pinnedVersion?: number;
}

export interface ScenarioVariantSnippetBinding {
  key: string;
  snippetId?: string;
  pinnedVersion?: number;
}

export interface ScenarioPersonaBinding {
  id: string;
  snippetId?: string;
  pinnedVersion?: number;
}

export interface ScenarioVersion {
  version: number;
  status: EntityStatus;
  templateId: string;
  templateVersion: number;
  language: LanguageCode;
  variableValues: Record<string, string | boolean>;
  evaluationDimensions: ScenarioEvaluationDimension[];
  personaBindings: ScenarioPersonaBinding[];
  variantSnippetBindings: ScenarioVariantSnippetBinding[];
  snippetBindings: ScenarioSlotBinding[];
  renderedPrompt: string;
  renderedEvaluationPrompt: string;
  updatedAt: string;
  updatedBy: string;
  notes: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  templateId: string;
  templateVersion: number;
  status: EntityStatus;
  language: LanguageCode;
  variableValues: Record<string, string | boolean>;
  evaluationDimensions: ScenarioEvaluationDimension[];
  personaBindings: ScenarioPersonaBinding[];
  variantSnippetBindings: ScenarioVariantSnippetBinding[];
  snippetBindings: ScenarioSlotBinding[];
  renderedPrompt: string;
  renderedEvaluationPrompt: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  versions: ScenarioVersion[];
}

export interface ResolvedBlock {
  id: string;
  sourceType: "snippet" | "local";
  sourceName: string;
  sourceVersion?: number;
  slot: string;
  content: string;
}

export interface RenderPreviewResult {
  renderedPrompt: string;
  resolvedBlocks: ResolvedBlock[];
  missingVariables: string[];
  renderWarnings: string[];
}

export interface StudioState {
  currentRole: UserRole;
  templates: PromptTemplate[];
  scenarios: Scenario[];
  snippets: Snippet[];
}

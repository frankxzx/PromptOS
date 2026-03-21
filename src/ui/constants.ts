import type { LanguageCode, SnippetStatus, SnippetType } from "../studio/types";

export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  ja: "Japanese"
};

export const LANGUAGE_OPTIONS: Array<{ value: LanguageCode; label: string }> = [
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese" },
  { value: "es", label: "Spanish" },
  { value: "ja", label: "Japanese" }
];

export const SNIPPET_TYPE_OPTIONS: Array<{ value: SnippetType; label: string }> = [
  { value: "role", label: "Role" },
  { value: "persona", label: "Persona" },
  { value: "instruction", label: "Instruction" },
  { value: "format", label: "Format" },
  { value: "safety", label: "Safety" },
  { value: "tone", label: "Tone" },
  { value: "evaluation_instruction", label: "Evaluation instruction" },
  { value: "evaluation_rubric", label: "Evaluation rubric" }
];

export const SNIPPET_STATUS_OPTIONS: Array<{ value: SnippetStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "deprecated", label: "Deprecated" }
];

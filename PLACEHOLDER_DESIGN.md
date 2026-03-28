# Placeholder Design Discussion

## Overview

This document provides a detailed discussion of the current placeholder design in PromptOS across three architectural levels: **Snippets** (bottom), **Templates** (middle), and **Scenarios** (top). The placeholder system enables modular, reusable, and version-controlled prompt composition.

## Architecture Levels

### 1. Snippets (底层 - Reusable Content Blocks)

**Purpose**: Versioned, reusable prompt fragments that can be shared across multiple templates.

**Location**: `src/studio/types.ts` (lines 35-44)

**Key Characteristics**:
- **Typed Content**: Five types (`role`, `instruction`, `format`, `safety`, `tone`)
- **Version History**: Each snippet maintains multiple versions with content, notes, creator, and timestamp
- **Status Management**: Can be `active` or `deprecated`
- **Usage Tracking**: Tracks how many scenarios use each snippet
- **Placeholder Support**: Snippet content can contain variable placeholders like `{{variable_name}}`

**Example Snippet Content**:
```
You are a {{role_name}} assistant. Your primary responsibility is to {{task_description}}.
```

**Design Strengths**:
- ✅ Centralized content management - updates propagate to all users
- ✅ Type safety - prevents mismatched snippet usage
- ✅ Version control - allows rollback and change tracking
- ✅ Reusability - reduces duplication across templates

**Design Considerations**:
- ⚠️ Variable placeholders in snippets must match template's variable schema
- ⚠️ No automatic validation of variable references within snippet content
- ⚠️ Deprecated snippets may still be in use by scenarios via version pinning

### 2. Templates (中层 - Structure Definitions)

**Purpose**: Define the structure and composition logic for prompts, including variables, slots, and variants.

**Location**: `src/studio/types.ts` (lines 102-119)

**Key Components**:

#### a) Variable Schema
Defines base input fields that users fill when creating scenarios.

**Four Types**:
- `text`: Free-form text input
- `select`: Single choice from predefined options
- `boolean`: True/false checkbox
- `json`: Structured JSON input

**Example**:
```typescript
{
  key: "role_name",
  label: "Role Name",
  type: "text",
  required: true,
  helperText: "The role this assistant will play"
}
```

#### b) Variants
Advanced dynamic fields that can reference snippets or provide flexible input options.

**Four Types**:
1. `dropdown`: Fixed set of options (like select variables)
2. `input`: Free text input (like text variables)
3. `creatable_select`: Mutable dropdown where users can add new options
4. `snippet`: References a snippet dynamically based on user selection

**Snippet Variant Example**:
```typescript
{
  key: "custom_instruction",
  label: "Custom Instruction",
  type: "snippet",
  allowedSnippetTypes: ["instruction"],
  defaultSnippetId: "inst-001"
}
```

**Design Pattern**: Variants act as "meta-variables" - their resolved content becomes available as variables during rendering.

#### c) Slots
Placeholder positions in the template body where snippets are inserted.

**Slot Definition**:
```typescript
{
  id: "slot-1",
  slot: "role",
  label: "Role Definition",
  required: true,
  allowedSnippetTypes: ["role"],
  defaultSnippetId: "role-001",
  conditionRule?: {
    variableKey: "include_role",
    operator: "equals",
    value: true
  }
}
```

**Conditional Logic**: Slots can be shown/hidden based on variable values using `conditionRule`.

**Operators**:
- `exists`: Slot shown if variable has any non-empty value
- `equals`: Slot shown if variable matches specific value

#### d) Local Blocks
Template-specific content blocks that are not shared snippets.

**Use Case**: One-off content that doesn't need to be reusable.

**Example**:
```typescript
{
  id: "local-1",
  title: "Custom Footer",
  slot: "footer",
  content: "End of prompt for {{template_name}}",
  conditionRule: { ... }
}
```

#### e) Template Body
The main prompt structure using placeholder syntax:

**Variable Placeholders**: `{{variable_name}}`
**Slot Placeholders**: `{{slot:slot_name}}`

**Example Template Body**:
```
{{slot:role}}

Instructions:
{{slot:instruction}}

Response Format:
{{response_format}}

{{slot:footer}}
```

**Design Strengths**:
- ✅ Clear separation between structure (template) and content (snippets)
- ✅ Conditional logic enables dynamic prompt composition
- ✅ Type constraints ensure compatibility between slots and snippets
- ✅ Variants provide advanced customization without complexity

**Design Considerations**:
- ⚠️ Template body validation only checks for unknown references, not formatting
- ⚠️ Complex condition rules may be hard to debug without tooling
- ⚠️ No support for nested conditions (AND/OR logic)
- ⚠️ Slots and variants share similar concepts but have different mechanisms

### 3. Scenarios (上层 - Concrete Instances)

**Purpose**: Concrete prompt instances with all variables filled and snippets bound.

**Location**: `src/studio/types.ts` (lines 147-162)

**Key Components**:

#### a) Template Pinning
- `templateId`: Which template this scenario uses
- `templateVersion`: Pinned to specific version (prevents breaking changes)

#### b) Variable Values
```typescript
variableValues: {
  "role_name": "Customer Support Agent",
  "response_format": "JSON",
  "include_guardrail": true
}
```

#### c) Snippet Bindings
Maps each slot to a specific snippet and version:
```typescript
snippetBindings: [
  {
    slot: "role",
    snippetId: "snippet-001",
    pinnedVersion: 3
  }
]
```

#### d) Variant Snippet Bindings
For `snippet` type variants:
```typescript
variantSnippetBindings: [
  {
    key: "custom_instruction",
    snippetId: "snippet-042",
    pinnedVersion: 1
  }
]
```

#### e) Rendered Output
The final resolved prompt with all placeholders replaced:
```typescript
renderedPrompt: "You are a Customer Support Agent...\n\nInstructions:\n..."
```

**Design Strengths**:
- ✅ Complete version pinning - immune to upstream changes
- ✅ Immutable history - each scenario version is preserved
- ✅ Reproducibility - same inputs always produce same output
- ✅ Clear audit trail - who changed what and when

**Design Considerations**:
- ⚠️ No automatic updates when templates or snippets change
- ⚠️ Users must manually upgrade to new versions
- ⚠️ May accumulate stale references to deprecated content

## Placeholder Syntax

### Variable Placeholder: `{{variable_name}}`

**Used In**: Template body, snippet content, local blocks

**Resolution**: Replaced with value from scenario's `variableValues`

**Pattern**: `/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g`

**Examples**:
- `{{role_name}}` → "Customer Support Agent"
- `{{include_guardrail}}` → "true" (boolean converted to string)
- `{{missing_var}}` → "{{missing_var}}" (unresolved stays as-is)

**Design Notes**:
- ✅ Simple, familiar syntax (Mustache-style)
- ✅ Whitespace tolerant
- ⚠️ No escaping mechanism (can't render literal `{{` without escaping)
- ⚠️ Only alphanumeric and underscore allowed in keys

### Slot Placeholder: `{{slot:slot_name}}`

**Used In**: Template body only

**Resolution**: Replaced with snippet content (from scenario's `snippetBindings`)

**Pattern**: Special handling in render engine

**Examples**:
- `{{slot:role}}` → [Content from role snippet]
- `{{slot:instruction}}` → [Content from instruction snippet]

**Design Notes**:
- ✅ Clear distinction from variables (`:` prefix)
- ✅ Only valid in template body, not in snippets
- ⚠️ No nested slots (snippets can't contain `{{slot:...}}`)
- ⚠️ Conditional slots evaluated before resolution

### Local Block Placeholder: `{{slot:local_slot_name}}`

**Used In**: Template body only (same syntax as slots)

**Resolution**: Replaced with local block content

**Design Note**: Uses same syntax as snippet slots, distinguished by slot name lookup.

## Placeholder Resolution Flow

**Location**: `src/studio/render.ts`

### Phase 1: Variant Resolution (lines 332-374)

For each `snippet` type variant:
1. Find binding by variant key
2. Retrieve snippet content at pinned version
3. **Interpolate variables** within snippet content
4. Add resolved content to variable context as `{variantKey: resolvedContent}`

**Result**: Variant snippets become available as variables for later phases.

### Phase 2: Slot Resolution (lines 401-455)

For each slot in template:
1. **Evaluate condition rule** (if present)
   - If condition fails, skip this slot
2. Find snippet binding for this slot
3. Validate snippet type matches `allowedSnippetTypes`
4. Retrieve snippet content at pinned version
5. **Interpolate variables** within snippet content
6. Return resolved block with metadata

**Result**: Array of `ResolvedBlock` objects with final content.

### Phase 3: Final Assembly (lines 457-524)

1. **Interpolate variables** in template body (includes variant-resolved content)
2. **Replace slot placeholders** with resolved snippet content
3. **Replace local block slots** with local block content
4. **Validate** all placeholders resolved (check for remaining `{{` patterns)

**Result**: Final `renderedPrompt` string with all placeholders replaced.

### Critical Design Details

**Interpolation Order Matters**:
- Variants resolved first → become variables
- Snippet content interpolated **before** insertion
- Template body interpolated **after** slot insertion

**Multiple Interpolation Passes**:
- Snippet content gets variables interpolated during slot resolution
- Template body gets variables interpolated during final assembly
- This enables snippets to use template variables

**Example Flow**:
```
Template body: "Role: {{slot:role}}\nTask: {{task_name}}"
Slot binding: role → snippet "You are {{role_name}}"
Variables: {role_name: "Agent", task_name: "Support"}

Step 1: Resolve slot
  - Get snippet content: "You are {{role_name}}"
  - Interpolate: "You are Agent"

Step 2: Replace slot in template
  - "Role: You are Agent\nTask: {{task_name}}"

Step 3: Interpolate template body
  - "Role: You are Agent\nTask: Support"
```

## Validation System

### Template Validation (lines 239-330)

**Checks**:
- ✅ No duplicate variable/variant keys
- ✅ Variant configurations valid (options present for dropdown, etc.)
- ✅ Default snippets match allowed types
- ✅ Unknown variable references in body
- ✅ Unknown slot references in body

**Missing Validations**:
- ❌ Variable references within snippet content not validated
- ❌ Circular dependencies between variants
- ❌ Unreachable slots (conditions that can never be true)

### Scenario Validation (lines 526-644)

**Checks**:
- ✅ Required variables populated
- ✅ Variable type correctness (boolean is boolean, etc.)
- ✅ Variant snippet types match allowed types
- ✅ Slot snippet types match allowed types
- ✅ Snippet versions exist

**Missing Validations**:
- ❌ Whether bound snippets contain unresolvable variable references
- ❌ Whether deprecated snippets are being used
- ❌ Whether template version is still available

## Design Strengths

### 1. Clear Separation of Concerns
Each level has distinct responsibilities:
- **Snippets**: Reusable content
- **Templates**: Structure and composition rules
- **Scenarios**: Concrete instances

### 2. Version Control at All Levels
- Templates have versions
- Snippets have versions
- Scenarios have versions AND pin upstream versions

### 3. Type Safety
- Snippet types prevent mismatches
- Variable types ensure correct data
- Validation catches errors early

### 4. Conditional Logic
- Slots can be shown/hidden dynamically
- Enables flexible prompt composition
- Reduces need for multiple templates

### 5. Reusability
- Snippets shared across templates
- Templates instantiated as scenarios
- Reduces duplication and inconsistency

## Design Challenges

### 1. Complexity of Variants vs Variables
**Issue**: The distinction between variables and variants is subtle.

**Current State**:
- Variables: Basic input fields
- Variants: Advanced fields that can reference snippets

**Recommendation**: Consider consolidating or clarifying the conceptual model.

### 2. Snippet Variable References Not Validated
**Issue**: Snippets can contain `{{variable_name}}` but template doesn't know if that variable exists.

**Example Problem**:
```
Template has variable: "role_name"
Snippet contains: "You are {{assistant_name}}"  // Typo!
Error only caught at render time
```

**Recommendation**: Add static analysis to detect unresolvable references.

### 3. Placeholder Syntax Limitations
**Issue**: No escaping mechanism, no nested expressions, no filters.

**Missing Features**:
- Conditional rendering: `{{#if variable}}...{{/if}}`
- Loops: `{{#each items}}...{{/each}}`
- Filters: `{{variable | uppercase}}`
- Escaping: How to render literal `{{`?

**Recommendation**: Consider if richer templating is needed, or keep it simple.

### 4. Slot vs Local Block Overlap
**Issue**: Both use `{{slot:name}}` syntax but are resolved differently.

**Potential Confusion**:
- Slots reference external snippets
- Local blocks are inline content
- Same syntax, different semantics

**Recommendation**: Consider different syntax (e.g., `{{local:name}}`) or merge concepts.

### 5. No Composition at Snippet Level
**Issue**: Snippets can't include other snippets.

**Use Case**: Want a "role" snippet to include a "safety" snippet.

**Current Workaround**: Must handle at template level with multiple slots.

**Recommendation**: Consider if snippet composition is needed, or if it adds too much complexity.

### 6. Manual Version Management
**Issue**: Scenarios don't auto-update when templates/snippets change.

**Trade-off**:
- ✅ Pro: Stability, reproducibility
- ❌ Con: Stale content, manual upgrade burden

**Recommendation**: Add tooling to suggest/batch-apply updates.

## Design Patterns

### Pattern 1: Typed Slots
```typescript
slot: {
  allowedSnippetTypes: ["role", "instruction"]
}
```
**Benefit**: Type safety ensures content appropriateness.

### Pattern 2: Conditional Content
```typescript
slot: {
  conditionRule: {
    variableKey: "include_safety",
    operator: "equals",
    value: true
  }
}
```
**Benefit**: Dynamic prompts without template duplication.

### Pattern 3: Version Pinning
```typescript
binding: {
  snippetId: "snippet-001",
  pinnedVersion: 3
}
```
**Benefit**: Immutable scenarios, reproducible outputs.

### Pattern 4: Variant as Variable
```typescript
variant: {
  type: "snippet",
  key: "custom_instruction"
}
// After resolution, available as: {{custom_instruction}}
```
**Benefit**: Dynamic snippet selection becomes usable as variable.

## Use Case Examples

### Use Case 1: Multi-Role Chat Agent

**Snippets**:
- `role-support`: "You are a support agent..."
- `role-sales`: "You are a sales agent..."
- `instruction-friendly`: "Be warm and friendly..."
- `format-json`: "Respond in JSON format..."

**Template**:
```
{{slot:role}}

{{slot:instruction}}

{{slot:format}}

User: {{user_message}}
```

**Scenario**:
```typescript
variableValues: { user_message: "Help me buy a product" }
snippetBindings: [
  { slot: "role", snippetId: "role-sales", pinnedVersion: 1 },
  { slot: "instruction", snippetId: "instruction-friendly", pinnedVersion: 2 },
  { slot: "format", snippetId: "format-json", pinnedVersion: 1 }
]
```

### Use Case 2: Conditional Safety Guidelines

**Template**:
```
{{slot:role}}

{{slot:instruction}}

{{slot:safety}}  // Only if include_safety=true

Response: {{response_format}}
```

**Slot Definition**:
```typescript
{
  slot: "safety",
  required: false,
  allowedSnippetTypes: ["safety"],
  conditionRule: {
    variableKey: "include_safety",
    operator: "equals",
    value: true
  }
}
```

### Use Case 3: Dynamic Custom Instructions via Variants

**Template**:
```
{{slot:role}}

Main Instructions:
{{slot:instruction}}

Additional Context:
{{custom_context}}  // From variant snippet

Format: {{format_type}}
```

**Variant Definition**:
```typescript
{
  key: "custom_context",
  type: "snippet",
  allowedSnippetTypes: ["instruction"],
  defaultSnippetId: "inst-default"
}
```

**Scenario**:
```typescript
variantSnippetBindings: [
  { key: "custom_context", snippetId: "inst-specialized", pinnedVersion: 2 }
]
```

## Recommendations

### Short-term Improvements

1. **Add Snippet Variable Validation**
   - Extract variable references from snippet content
   - Validate against template schema at binding time
   - Show warnings in UI for unresolvable references

2. **Improve Error Messages**
   - Show which snippet/slot caused validation error
   - Provide suggestions for fixing issues
   - Highlight problematic placeholders in UI

3. **Add Deprecation Warnings**
   - Flag scenarios using deprecated snippets
   - Suggest upgrade paths in UI
   - Show impact analysis before deprecating

4. **Enhance Condition Rule UI**
   - Visual rule builder (no manual JSON)
   - Condition testing/preview
   - Show which slots are active given current variables

### Long-term Enhancements

1. **Snippet Composition**
   - Allow snippets to reference other snippets
   - Define composition rules (inheritance, mixins)
   - Prevent circular dependencies

2. **Advanced Templating**
   - Conditional blocks: `{{#if}}...{{/if}}`
   - Loops: `{{#each}}...{{/each}}`
   - Filters/transformations: `{{var | uppercase}}`
   - Escaping: `\{{` for literal braces

3. **Smart Version Management**
   - Detect when template/snippet changes are backward-compatible
   - Suggest auto-upgrades for scenarios
   - Bulk update tool for scenarios

4. **Template Testing**
   - Unit tests for templates (input → expected output)
   - Test coverage for all conditional branches
   - Automated regression testing

5. **Placeholder Linting**
   - Real-time validation in template editor
   - Detect typos in variable names
   - Suggest available variables/slots

## Comparison with Alternative Designs

### Alternative 1: Flat Structure (No Snippets)
**Approach**: Store all content directly in templates.

**Pros**:
- ❌ Simpler mental model
- ❌ No version pinning complexity

**Cons**:
- ❌ No reusability
- ❌ Duplication across templates
- ❌ Hard to maintain consistency

**Verdict**: Current design is superior for scale.

### Alternative 2: Full Templating Language (Handlebars/Jinja)
**Approach**: Use established templating engine.

**Pros**:
- ✅ Rich feature set (loops, conditionals, filters)
- ✅ Well-documented
- ✅ Community support

**Cons**:
- ❌ Steeper learning curve
- ❌ May be overkill for current needs
- ❌ Harder to validate/control

**Verdict**: Current design is simpler; consider migration if complexity increases.

### Alternative 3: Inheritance-Based Templates
**Approach**: Templates extend/override parent templates.

**Pros**:
- ✅ Clear hierarchies
- ✅ Override specific sections

**Cons**:
- ❌ More complex mental model
- ❌ Multiple inheritance issues
- ❌ Harder to debug

**Verdict**: Current composition model (slots + snippets) is more flexible.

## Conclusion

The current placeholder design provides a solid foundation for modular, version-controlled prompt composition:

**Strengths**:
- Clear three-level architecture
- Strong type safety
- Comprehensive version control
- Conditional logic support

**Key Opportunities**:
- Improve snippet variable validation
- Clarify variants vs variables conceptual model
- Enhance version management tooling
- Consider richer templating if needed

The design successfully balances simplicity with power, providing flexibility without overwhelming complexity. The main areas for improvement are around validation, error messages, and upgrade tooling rather than fundamental architectural changes.

## References

- Type Definitions: `src/studio/types.ts`
- Rendering Engine: `src/studio/render.ts`
- Template UI: `src/ui/pages/TemplateBuilderPage.tsx`
- Scenario UI: `src/ui/pages/ScenarioEditorPage.tsx`
- Snippet UI: `src/ui/pages/SnippetDetailPage.tsx`
- Mock Data Examples: `src/studio/mockData.ts`
- Test Suite: `src/studio/render.test.ts`

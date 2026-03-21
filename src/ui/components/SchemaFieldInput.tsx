import { memo } from "react";
import type { VariableSchemaItem, VariantFieldType } from "../../studio/types";

interface SchemaFieldInputProps {
  id: string;
  item: VariableSchemaItem;
  value: string | boolean | undefined;
  missing?: boolean;
  variantType?: VariantFieldType;
  onChange: (value: string | boolean) => void;
}

export const SchemaFieldInput = memo(function SchemaFieldInput({
  id,
  item,
  value,
  missing = false,
  variantType,
  onChange
}: SchemaFieldInputProps) {
  const className = missing ? "field-error" : undefined;

  if (item.type === "boolean") {
    return (
      <select
        id={id}
        value={String(value ?? false)}
        onChange={(event) => onChange(event.target.value === "true")}
        className={className}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (variantType === "creatable_select") {
    const listId = `${id}-options`;
    return (
      <>
        <input
          id={id}
          list={listId}
          value={String(value ?? item.defaultValue ?? "")}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
        <datalist id={listId}>
          {item.options?.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </>
    );
  }

  if (item.type === "select") {
    return (
      <select
        id={id}
        value={String(value ?? item.defaultValue ?? "")}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        {item.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={id}
      value={String(value ?? "")}
      onChange={(event) => onChange(event.target.value)}
      className={className}
    />
  );
});

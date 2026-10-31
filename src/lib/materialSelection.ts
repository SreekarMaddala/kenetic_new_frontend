import type { Field } from "../components/WorkflowLedger";
import type { InventoryItem } from "./api";

export function materialSelectionFields(items: InventoryItem[]): Field[] {
  const categories = [...new Set(items.map((item) => item.category || "General"))].sort();
  return [
    {
      key: "category",
      label: "Material category",
      required: true,
      options: categories.map((category) => ({ value: category, label: category })),
    },
    {
      key: "itemId",
      label: "Material",
      required: true,
      dependsOn: "category",
      optionsByValue: Object.fromEntries(
        categories.map((category) => [
          category,
          items
            .filter(
              (item) => (item.category || "General") === category && item.status !== "Inactive",
            )
            .map((item) => ({ value: item.itemId, label: `${item.name} (${item.unit})` })),
        ]),
      ),
      helperText: "Select a category first, then a registered material.",
    },
  ];
}

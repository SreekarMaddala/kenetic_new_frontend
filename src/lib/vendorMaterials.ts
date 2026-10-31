import type { InventoryItem, Vendor } from "./api";

export function vendorMaterialOptions(vendor: Vendor, items: InventoryItem[]) {
  const linked = items.filter((item) => vendor.materialIds?.includes(item.itemId));
  const names = new Set(linked.map((item) => item.name.trim().toLowerCase()));
  const options = linked.map((item) => ({ value: item.itemId, label: `${item.name} (${item.unit})` }));
  for (const entry of (vendor.materialsSupplied ?? "").split(/[,;\n]+/)) {
    const name = entry.trim();
    if (!name || names.has(name.toLowerCase()) || linked.some((item) => `${item.name} (${item.unit})`.toLowerCase() === name.toLowerCase())) continue;
    names.add(name.toLowerCase());
    options.push({ value: `manual:${name}`, label: name });
  }
  return options;
}

export function paymentMaterialSelection(value: string) {
  return value.startsWith("manual:")
    ? { materialName: value.slice(7) }
    : { materialId: value };
}

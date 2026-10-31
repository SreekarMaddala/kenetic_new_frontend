import test from "node:test";
import assert from "node:assert/strict";
import { vendorMaterialOptions, paymentMaterialSelection } from "../src/lib/vendorMaterials.ts";

test("vendor text materials appear without catalog links and use the manual payment field", () => {
  const options = vendorMaterialOptions({ materialsSupplied: "PLYWOOD, steel; plywood\nTimber", materialIds: [] }, []);
  assert.deepEqual(options.map((option) => option.label), ["PLYWOOD", "steel", "Timber"]);
  assert.deepEqual(paymentMaterialSelection(options[0].value), { materialName: "PLYWOOD" });
});

test("catalog links keep their IDs without duplicating the saved summary", () => {
  const options = vendorMaterialOptions({ materialIds: ["item-1"], materialsSupplied: "Steel (Kg), PLYWOOD" }, [{ itemId: "item-1", name: "Steel", unit: "Kg" }]);
  assert.deepEqual(options, [{ value: "item-1", label: "Steel (Kg)" }, { value: "manual:PLYWOOD", label: "PLYWOOD" }]);
  assert.deepEqual(paymentMaterialSelection(options[0].value), { materialId: "item-1" });
});

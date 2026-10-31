import type { DomainRecord } from "./api";

export function vehicleLabel(record: DomainRecord) {
  const raw = String(record.vehicle ?? record.model ?? "Vehicle");
  const model = String(record.model ?? raw);
  const plate = String(record.registrationNumber ?? record.plateNo ?? record.registrationNo ?? "");
  return plate && !raw.endsWith(`(${plate})`) ? `${model} (${plate})` : raw;
}

export type VehicleTotals = {
  trips: number;
  distance: number;
  fuelLiters: number;
  fuelCost: number;
  lastActivity: string;
};
export type VehicleAnalysis = VehicleTotals & {
  key: string;
  label: string;
  model: string;
  plate: string;
  registered: boolean;
  projects: (VehicleTotals & { projectId: string })[];
  logs: DomainRecord[];
};

const emptyTotals = (): VehicleTotals => ({
  trips: 0,
  distance: 0,
  fuelLiters: 0,
  fuelCost: 0,
  lastActivity: "",
});
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const amount = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

export function buildVehicleAnalysis(
  records: DomainRecord[],
  filters: { projectId?: string; month?: string } = {},
): VehicleAnalysis[] {
  const vehicles = new Map<string, VehicleAnalysis>();
  const aliases = new Map<string, Set<string>>();
  const addAlias = (label: string, key: string) => {
    const alias = normalized(label);
    if (!alias) return;
    if (!aliases.has(alias)) aliases.set(alias, new Set());
    aliases.get(alias)!.add(key);
  };
  for (const record of records.filter((r) => r.tripType === "vehicle_registration")) {
    const label = vehicleLabel(record);
    const plate = String(
      record.registrationNumber ?? record.plateNo ?? record.registrationNo ?? "",
    );
    const model = String(record.model ?? record.vehicle ?? "Vehicle");
    const key = plate
      ? `plate:${normalized(plate)}`
      : String(record.tripId ?? record.recordId ?? label);
    if (!vehicles.has(key))
      vehicles.set(key, {
        key,
        label,
        model,
        plate,
        registered: true,
        ...emptyTotals(),
        projects: [],
        logs: [],
      });
    for (const alias of [label, model, plate]) addAlias(alias, key);
  }
  for (const record of records) {
    if (!["vehicle", "fuel"].includes(String(record.tripType)) || !record.projectId) continue;
    if (filters.projectId && record.projectId !== filters.projectId) continue;
    if (filters.month && !String(record.date ?? "").startsWith(filters.month)) continue;
    const label = String(record.vehicle ?? "").trim();
    const candidates = aliases.get(normalized(label));
    // An ambiguous model name must never combine vehicles with different plates.
    const key = candidates?.size === 1 ? [...candidates][0] : `unlinked:${normalized(label)}`;
    if (!vehicles.has(key))
      vehicles.set(key, {
        key,
        label: label || "Unlinked vehicle",
        model: label || "Unlinked vehicle",
        plate: "",
        registered: false,
        ...emptyTotals(),
        projects: [],
        logs: [],
      });
    const vehicle = vehicles.get(key)!;
    const projectId = String(record.projectId);
    let project = vehicle.projects.find((p) => p.projectId === projectId);
    if (!project) {
      project = { projectId, ...emptyTotals() };
      vehicle.projects.push(project);
    }
    vehicle.logs.push(record);
    for (const totals of [vehicle, project]) {
      if (record.tripType === "vehicle") {
        totals.trips += 1;
        totals.distance += Math.max(0, amount(record.endKm) - amount(record.startKm));
      } else {
        totals.fuelLiters += amount(record.liters);
        totals.fuelCost += amount(record.total ?? amount(record.liters) * amount(record.rate));
      }
      const day = String(record.date ?? "");
      if (day > totals.lastActivity) totals.lastActivity = day;
    }
  }
  return [...vehicles.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((vehicle) => ({
      ...vehicle,
      projects: vehicle.projects.sort((a, b) => a.projectId.localeCompare(b.projectId)),
      logs: vehicle.logs.sort((a, b) => String(b.date).localeCompare(String(a.date))),
    }));
}

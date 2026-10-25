import type { DomainRecord } from "./api";

export function logisticsReport(records: DomainRecord[], projectId: string, month: string) {
  return records
    .filter(
      (record) =>
        record.projectId === projectId &&
        ["vehicle", "fuel", "rental"].includes(String(record.tripType)) &&
        (month === "all" || String(record.date ?? "").startsWith(month)),
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((record) => {
      const fuel = record.tripType === "fuel";
      const rental = record.tripType === "rental";
      const mileage = record.tripType === "vehicle";
      return {
        "Record ID": record.tripId ?? "",
        "Project ID": projectId,
        Date: record.date ?? "",
        Type: fuel ? "Fuel" : rental ? "Rental transport" : "Vehicle mileage",
        Vehicle: record.vehicle ?? "",
        "Driver / vendor": record.driver ?? record.vendor ?? "",
        Material: record.material ?? "",
        "Start km": mileage ? Number(record.startKm ?? 0) : "",
        "End km": mileage ? Number(record.endKm ?? 0) : "",
        "Distance km": mileage
          ? Math.max(0, Number(record.endKm ?? 0) - Number(record.startKm ?? 0))
          : "",
        Liters: fuel ? Number(record.liters ?? 0) : "",
        "Rate / hire (INR)": mileage ? "" : Number(record.rate ?? 0),
        "Helper (INR)": rental ? Number(record.helper ?? 0) : "",
        "Fuel cost (INR)": fuel
          ? Number(record.total ?? Number(record.liters ?? 0) * Number(record.rate ?? 0))
          : 0,
        "Transport cost (INR)": rental
          ? Number(record.total ?? Number(record.rate ?? 0) + Number(record.helper ?? 0))
          : 0,
        "Notes / receipt": record.notes ?? record.receipt ?? "",
      };
    });
}

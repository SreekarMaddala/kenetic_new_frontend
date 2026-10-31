import test from "node:test";
import assert from "node:assert/strict";
import { buildVehicleAnalysis, vehicleLabel } from "../src/lib/vehicleAnalysis.ts";

const registration = (plate = "TG15FM0050", id = "v1") => ({
  tripId: id,
  tripType: "vehicle_registration",
  vehicle: "Bolero",
  registrationNumber: plate,
});
const mileage = (projectId, date, vehicle = "Bolero (TG15FM0050)") => ({
  tripType: "vehicle",
  projectId,
  date,
  vehicle,
  startKm: 100,
  endKm: 150,
});
const fuel = (projectId, date, vehicle = "Bolero (TG15FM0050)") => ({
  tripType: "fuel",
  projectId,
  date,
  vehicle,
  liters: 5,
  rate: 100,
});

test("vehicle analysis combines project mileage and fuel with a project breakdown", () => {
  const [vehicle] = buildVehicleAnalysis([
    registration(),
    mileage("p1", "2026-10-01"),
    mileage("p2", "2026-10-02"),
    fuel("p1", "2026-10-03"),
    fuel("p2", "2026-10-04"),
  ]);
  assert.equal(vehicle.trips, 2);
  assert.equal(vehicle.distance, 100);
  assert.equal(vehicle.fuelLiters, 10);
  assert.equal(vehicle.fuelCost, 1000);
  assert.equal(vehicle.lastActivity, "2026-10-04");
  assert.equal(vehicle.projects.length, 2);
  assert.equal(vehicle.projects[0].distance, 50);
  assert.equal(vehicle.projects[1].fuelCost, 500);
  assert.deepEqual(
    vehicle.logs.map((r) => r.date),
    ["2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"],
  );
});

test("project and month filters apply to all metrics while keeping registered vehicles", () => {
  const rows = [
    registration(),
    registration("TG15FM0099", "v2"),
    mileage("p1", "2026-09-01"),
    mileage("p2", "2026-10-01"),
    fuel("p1", "2026-10-03"),
  ];
  const result = buildVehicleAnalysis(rows, { projectId: "p1", month: "2026-10" });
  assert.equal(result.length, 2);
  const vehicle = result.find((v) => v.plate === "TG15FM0050");
  assert.equal(vehicle.distance, 0);
  assert.equal(vehicle.trips, 0);
  assert.equal(vehicle.fuelCost, 500);
  assert.equal(vehicle.logs.length, 1);
  assert.equal(result.find((v) => v.plate === "TG15FM0099").logs.length, 0);
});

test("vehicles sharing a model do not share costs or distance", () => {
  const result = buildVehicleAnalysis([
    registration(),
    registration("TG15FM0099", "v2"),
    mileage("p1", "2026-10-01"),
    fuel("p1", "2026-10-01", "Bolero (TG15FM0099)"),
    mileage("p1", "2026-10-01", "Bolero"),
  ]);
  assert.equal(result.find((v) => v.plate === "TG15FM0050").fuelCost, 0);
  assert.equal(result.find((v) => v.plate === "TG15FM0099").distance, 0);
  const unlinked = result.find((v) => !v.registered);
  assert.equal(unlinked.distance, 50);
  assert.equal(unlinked.fuelCost, 0);
});

test("legacy unique model and plate labels match without losing unregistered entries", () => {
  const result = buildVehicleAnalysis([
    registration(),
    mileage("p1", "2026-10-01", "bolero"),
    fuel("p1", "2026-10-01", "TG-15-FM-0050"),
    mileage("p1", "2026-10-01", "Old truck"),
  ]);
  assert.equal(result.find((v) => v.registered).distance, 50);
  assert.equal(result.find((v) => v.registered).fuelCost, 500);
  assert.equal(result.find((v) => !v.registered).label, "Old truck");
  assert.equal(
    vehicleLabel({ vehicle: "Bolero (TG15FM0050)", registrationNumber: "TG15FM0050" }),
    "Bolero (TG15FM0050)",
  );
});

test("only project-linked mileage and fuel contribute to vehicle analysis", () => {
  const [vehicle] = buildVehicleAnalysis([
    registration(),
    mileage(undefined, "2026-10-01"),
    { tripType: "rental", projectId: "p1", vehicle: "Bolero (TG15FM0050)", total: 900 },
    { ...fuel("p1", "2026-10-02"), total: 0 },
    { ...mileage("p1", "2026-10-03"), endKm: 50 },
  ]);
  assert.equal(vehicle.distance, 0);
  assert.equal(vehicle.fuelCost, 0);
  assert.equal(vehicle.trips, 1);
  assert.equal(vehicle.logs.length, 2);
});

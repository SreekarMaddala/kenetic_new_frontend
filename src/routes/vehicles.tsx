import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/AppShell";
import { api, type DomainRecord } from "../lib/api";
import { useProject } from "../lib/ProjectContext";
import { buildVehicleAnalysis } from "../lib/vehicleAnalysis";
import { exportToExcel } from "../lib/excel";

export const Route = createFileRoute("/vehicles")({ component: VehiclesPage });

function VehiclesPage() {
  const qc = useQueryClient();
  const { projects } = useProject();
  const [projectFilter, setProjectFilter] = useState("");
  const [month, setMonth] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const fleet = useQuery({
    queryKey: ["logistics-trips", "fleet"],
    refetchInterval: 60000,
    queryFn: () => api.get<DomainRecord[]>("/supervisor/logistics/trips"),
  });
  const records = fleet.data ?? [];
  const allVehicles = buildVehicleAnalysis(records);
  const vehicles = buildVehicleAnalysis(records, { projectId: projectFilter, month }).filter(
    (vehicle) => !selectedVehicle || vehicle.key === selectedVehicle,
  );
  const selected = selectedVehicle ? vehicles[0] : undefined;
  const logRecords = records.filter(
    (r) => r.projectId && ["vehicle", "fuel"].includes(String(r.tripType)),
  );
  const months = [
    ...new Set(logRecords.map((r) => String(r.date ?? "").slice(0, 7)).filter(Boolean)),
  ]
    .sort()
    .reverse();
  const projectName = (id: string) => projects.find((p) => p.projectId === id)?.name ?? id;
  const recordedProjects = [...new Set(logRecords.map((r) => String(r.projectId)))];
  const totals = vehicles.reduce(
    (sum, v) => ({
      distance: sum.distance + v.distance,
      trips: sum.trips + v.trips,
      fuelLiters: sum.fuelLiters + v.fuelLiters,
      fuelCost: sum.fuelCost + v.fuelCost,
    }),
    { distance: 0, trips: 0, fuelLiters: 0, fuelCost: 0 },
  );
  const number = (value: unknown) =>
    Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const money = (value: number) =>
    value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  const selectClass = "w-full h-10 px-3 rounded-xl border border-border bg-background text-sm";
  const register = useMutation({
    mutationFn: (body: DomainRecord) => api.post("/supervisor/logistics/trips", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logistics-trips"] });
      setVehicleModel("");
      setLicensePlate("");
      setShowRegister(false);
      toast.success("Vehicle registered successfully.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (register.isPending) return;
    if (!vehicleModel.trim()) {
      toast.error("Enter the vehicle make and model.");
      return;
    }
    register.mutate({
      tripType: "vehicle_registration",
      vehicle: vehicleModel.trim(),
      registrationNumber: licensePlate.trim(),
    });
  }
  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
      <PageHeader
        title="Vehicle Analysis"
        eyebrow="Global Workspace"
        actions={
          <>
            <button
              type="button"
              onClick={() => fleet.refetch()}
              disabled={fleet.isFetching}
              className="h-10 px-4 rounded-xl border border-border text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
            <button
              type="button"
              disabled={!vehicles.length || fleet.isPending || fleet.isError}
              onClick={() =>
                exportToExcel(
                  vehicles.map((v) => ({
                    Vehicle: v.model,
                    Registration: v.plate,
                    Trips: v.trips,
                    "Distance (km)": v.distance,
                    "Fuel (L)": v.fuelLiters,
                    "Fuel cost (INR)": v.fuelCost,
                    Projects: v.projects.length,
                    "Last entry": v.lastActivity,
                  })),
                  "Vehicle Analysis",
                )
              }
              className="h-10 px-4 rounded-xl border border-border text-sm font-semibold flex items-center gap-2"
            >
              <Download className="size-4" /> Export
            </button>
            <button
              type="button"
              onClick={() => setShowRegister(!showRegister)}
              className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="size-4" /> Register vehicle
            </button>
          </>
        }
      />
      <p className="text-sm text-muted-foreground">
        Analysis of each vehicle across projects. Mileage and fuel entries are recorded only inside
        the project's Logistics page.
      </p>
      {showRegister && (
        <form
          onSubmit={submit}
          className="p-5 rounded-xl border border-border bg-[color:var(--surface)] space-y-4"
        >
          <h2 className="font-semibold">Register vehicle details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              Make and model
              <input
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Mahindra Bolero"
                className={selectClass}
              />
            </label>
            <label className="space-y-2 text-sm">
              Registration number
              <input
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="e.g. TG15FM0050"
                className={selectClass}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            This adds the vehicle to the fleet. Record mileage and fuel inside a project.
          </p>
          <button
            type="submit"
            disabled={register.isPending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {register.isPending ? "Saving..." : "Save vehicle"}
          </button>
        </form>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm font-medium">
          Vehicle
          <select
            className={selectClass}
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
          >
            <option value="">All vehicles</option>
            {allVehicles.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Project
          <select
            className={selectClass}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="">All projects</option>
            {recordedProjects.map((id) => (
              <option key={id} value={id}>
                {projectName(id)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Month
          <select className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Logged distance", number(totals.distance) + " km"],
          ["Mileage entries", number(totals.trips)],
          ["Fuel filled", number(totals.fuelLiters) + " L"],
          ["Fuel cost", money(totals.fuelCost)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-[color:var(--surface)] p-5"
          >
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold">
              {fleet.isPending ? "Loading..." : fleet.isError ? "Unavailable" : value}
            </p>
          </div>
        ))}
      </div>
      {fleet.isPending ? (
        <p className="text-sm text-muted-foreground">Loading vehicle analysis...</p>
      ) : fleet.isError ? (
        <p role="alert" className="text-destructive">
          Unable to load vehicle analysis. Use Refresh to try again.
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-[color:var(--surface)] p-5 space-y-4">
            <h2 className="font-semibold">Analysis by vehicle</h2>
            {!vehicles.length ? (
              <p className="text-sm text-muted-foreground">
                No vehicles recorded yet. Register a vehicle, then record its mileage and fuel
                inside a project.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Vehicle",
                        "Registration",
                        "Mileage entries",
                        "Distance (km)",
                        "Fuel (L)",
                        "Fuel cost",
                        "Projects",
                        "Last entry",
                        "",
                      ].map((label) => (
                        <th key={label} className="py-3 pr-4 whitespace-nowrap">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => (
                      <tr key={v.key} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          {v.model}
                          {!v.registered && (
                            <p className="text-xs text-muted-foreground">Unlinked vehicle entry</p>
                          )}
                        </td>
                        <td className="py-3 pr-4">{v.plate || "Not recorded"}</td>
                        <td className="py-3 pr-4">{v.trips}</td>
                        <td className="py-3 pr-4">{number(v.distance)}</td>
                        <td className="py-3 pr-4">{number(v.fuelLiters)}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">{money(v.fuelCost)}</td>
                        <td className="py-3 pr-4">{v.projects.length}</td>
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {v.lastActivity || "No project entries"}
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedVehicle(v.key)}
                            className="text-primary font-semibold whitespace-nowrap"
                          >
                            View analysis
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {selected && (
            <section className="rounded-xl border border-border bg-[color:var(--surface)] p-5 space-y-5">
              <h2 className="font-semibold">{selected.label} - project breakdown</h2>
              {!selected.projects.length ? (
                <p className="text-sm text-muted-foreground">
                  No mileage or fuel entries for this vehicle in the selected period. Record entries
                  inside the project's Logistics page.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Project",
                            "Mileage entries",
                            "Distance (km)",
                            "Fuel (L)",
                            "Fuel cost",
                            "",
                          ].map((label) => (
                            <th key={label} className="py-3 pr-4">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.projects.map((p) => (
                          <tr key={p.projectId} className="border-b border-border last:border-0">
                            <td className="py-3 pr-4">{projectName(p.projectId)}</td>
                            <td>{p.trips}</td>
                            <td>{number(p.distance)}</td>
                            <td>{number(p.fuelLiters)}</td>
                            <td>{money(p.fuelCost)}</td>
                            <td>
                              <a
                                href={"/projects/" + encodeURIComponent(p.projectId) + "/logistics"}
                                className="font-semibold text-primary whitespace-nowrap"
                              >
                                Open project log
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <h3 className="font-semibold">Project entries</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Date",
                            "Project",
                            "Entry",
                            "Driver",
                            "Distance (km)",
                            "Fuel (L)",
                            "Fuel cost",
                          ].map((label) => (
                            <th key={label} className="py-3 pr-4 whitespace-nowrap">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selected.logs.map((log, index) => (
                          <tr
                            key={String(log.tripId ?? index)}
                            className="border-b border-border last:border-0"
                          >
                            <td className="py-3 pr-4 whitespace-nowrap">
                              {String(log.date ?? "")}
                            </td>
                            <td className="py-3 pr-4">{projectName(String(log.projectId))}</td>
                            <td className="py-3 pr-4">
                              {log.tripType === "vehicle" ? "Mileage" : "Fuel"}
                            </td>
                            <td className="py-3 pr-4">{String(log.driver ?? "-")}</td>
                            <td className="py-3 pr-4">
                              {log.tripType === "vehicle"
                                ? number(
                                    Math.max(0, Number(log.endKm ?? 0) - Number(log.startKm ?? 0)),
                                  )
                                : "-"}
                            </td>
                            <td className="py-3 pr-4">
                              {log.tripType === "fuel" ? number(log.liters) : "-"}
                            </td>
                            <td className="py-3 pr-4">
                              {log.tripType === "fuel"
                                ? money(
                                    Number(
                                      log.total ?? Number(log.liters ?? 0) * Number(log.rate ?? 0),
                                    ),
                                  )
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

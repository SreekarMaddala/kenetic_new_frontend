import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../contexts/AuthContext";
import { api, projectApi, type DomainRecord } from "../../../lib/api";
import { toast } from "sonner";
import { logisticsPeriod } from "../../../lib/logisticsPeriod";
import {
  Truck,
  Compass,
  Fuel,
  Receipt,
  Plus,
  Calendar,
  Gauge,
  User,
  CheckCircle2,
  FileText,
} from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/logistics")({
  component: LogisticsPage,
});

function LogisticsPage() {
  const { projectId } = Route.useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "operations_admin" || user?.role === "super_admin";
  const qc = useQueryClient();
  const period = logisticsPeriod();
  const [monthFilter, setMonthFilter] = useState("all");
  const visibleMonth = isAdmin ? monthFilter : period.month;

  const [activeTab, setActiveTab] = useState<"owned" | "fuel" | "rental">("owned");

  // Form states - Register Vehicle
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  // Form states - Daily Mileage Log
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [driverName, setDriverName] = useState("");
  const [logDate, setLogDate] = useState(period.today);
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");

  // Form states - Fuel Fill Log
  const [fuelVehicle, setFuelVehicle] = useState("");
  const [fuelDate, setFuelDate] = useState(period.today);
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelRate, setFuelRate] = useState("95");
  const [fuelNotes, setFuelNotes] = useState("");

  // Form states - Rental Auto Trip Log
  const [rentalVendor, setRentalVendor] = useState("");
  const [rentalMaterial, setRentalMaterial] = useState("");
  const [rentalDate, setRentalDate] = useState(period.today);
  const [rentalRate, setRentalRate] = useState("");
  const [rentalHelper, setRentalHelper] = useState("0");

  const endpoint = `/supervisor/logistics/trips?projectId=${encodeURIComponent(projectId)}`;

  // Query project details
  const project = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId),
  });

  // Query logistics trips
  const logisticsQuery = useQuery({
    queryKey: ["logistics-trips", projectId, user?.sub, user?.role, period.month],
    refetchInterval: 60000,
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });

  const rawLogs = useMemo(
    () =>
      (logisticsQuery.data ?? []).filter(
        (record) =>
          record.tripType === "vehicle_registration" ||
          visibleMonth === "all" ||
          String(record.date ?? "").startsWith(visibleMonth),
      ),
    [logisticsQuery.data, visibleMonth],
  );

  // Registered Vehicles
  const registeredVehicles = useMemo(() => {
    return rawLogs
      .filter((r) => r.tripType === "vehicle_registration")
      .map((r) => {
        const name = String(r.vehicle ?? r.model ?? "Vehicle");
        const plate = String(r.plateNo ?? r.registrationNo ?? "");
        return plate ? `${name} (${plate})` : name;
      });
  }, [rawLogs]);

  // Mileage Logs
  const mileageLogs = useMemo(() => {
    return rawLogs
      .filter((r) => r.tripType === "vehicle")
      .map((r) => {
        const start = Number(r.startKm ?? 0);
        const end = Number(r.endKm ?? 0);
        const dist = Math.max(0, end - start);
        return {
          id: String(r.tripId ?? r.id ?? Math.random()),
          date: String(r.date ?? new Date().toISOString().slice(0, 10)),
          vehicle: String(r.vehicle ?? "Mahindra Bolero"),
          driver: String(r.driver ?? "Site Driver"),
          startKm: start,
          endKm: end,
          distance: dist,
        };
      });
  }, [rawLogs]);

  // Fuel Logs
  const fuelLogs = useMemo(() => {
    return rawLogs
      .filter((r) => r.tripType === "fuel")
      .map((r) => {
        const liters = Number(r.liters ?? 0);
        const rate = Number(r.rate ?? 0);
        const total = Number(r.total ?? liters * rate);
        return {
          id: String(r.tripId ?? r.id ?? Math.random()),
          date: String(r.date ?? new Date().toISOString().slice(0, 10)),
          vehicle: String(r.vehicle ?? "Fleet Vehicle"),
          liters,
          rate,
          total,
          notes: String(r.notes ?? r.receipt ?? ""),
        };
      });
  }, [rawLogs]);

  // Rental Logs
  const rentalLogs = useMemo(() => {
    return rawLogs
      .filter((r) => r.tripType === "rental")
      .map((r) => {
        const rate = Number(r.rate ?? 0);
        const helper = Number(r.helper ?? 0);
        const total = Number(r.total ?? rate + helper);
        return {
          id: String(r.tripId ?? r.id ?? Math.random()),
          date: String(r.date ?? new Date().toISOString().slice(0, 10)),
          vendor: String(r.vendor ?? r.operator ?? "Rental Operator"),
          material: String(r.material ?? "Site Goods"),
          rate,
          helper,
          total,
        };
      });
  }, [rawLogs]);

  // Derived Metrics
  const totalFleetDistance = useMemo(() => {
    return mileageLogs.reduce((acc, curr) => acc + curr.distance, 0);
  }, [mileageLogs]);

  const totalFuelExpenditure = useMemo(() => {
    return fuelLogs.reduce((acc, curr) => acc + curr.total, 0);
  }, [fuelLogs]);

  const totalRentalBilling = useMemo(() => {
    return rentalLogs.reduce((acc, curr) => acc + curr.total, 0);
  }, [rentalLogs]);

  // Mutations
  const createLogisticsMutation = useMutation({
    mutationFn: (body: DomainRecord) => {
      if (
        !isAdmin &&
        body.tripType !== "vehicle_registration" &&
        !String(body.date ?? "").startsWith(logisticsPeriod().month)
      ) {
        throw new Error("You can only add logistics entries for the current month.");
      }
      return api.post("/supervisor/logistics/trips", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logistics-trips", projectId] });
      toast.success("Logistics record saved successfully.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Handle Form 1: Register Vehicle
  function handleRegisterVehicle(e: FormEvent) {
    e.preventDefault();
    if (createLogisticsMutation.isPending) return;
    if (!vehicleModel.trim()) {
      toast.error("Please enter vehicle model.");
      return;
    }
    const vehicleLabel = licensePlate.trim()
      ? `${vehicleModel.trim()} (${licensePlate.trim()})`
      : vehicleModel.trim();

    createLogisticsMutation.mutate({
      projectId,
      tripType: "vehicle_registration",
      vehicle: vehicleLabel,
      model: vehicleModel.trim(),
      plateNo: licensePlate.trim(),
    });
    setVehicleModel("");
    setLicensePlate("");
  }

  // Handle Form 2: Log Mileage
  function handleLogMileage(e: FormEvent) {
    e.preventDefault();
    if (createLogisticsMutation.isPending) return;
    if (!selectedVehicle || !driverName.trim() || !startKm || !endKm) {
      toast.error("Please fill in all mileage fields.");
      return;
    }
    if (Number(endKm) < Number(startKm)) {
      toast.error("End odometer reading must be greater than start odometer reading.");
      return;
    }
    createLogisticsMutation.mutate({
      projectId,
      tripType: "vehicle",
      vehicle: selectedVehicle,
      driver: driverName.trim(),
      date: logDate,
      startKm: Number(startKm),
      endKm: Number(endKm),
    });
    setStartKm("");
    setEndKm("");
  }

  // Handle Form 3: Fuel Fill Log
  function handleLogFuel(e: FormEvent) {
    e.preventDefault();
    if (createLogisticsMutation.isPending) return;
    if (!fuelVehicle || !fuelLiters || !fuelRate) {
      toast.error("Please fill in vehicle, liters and rate.");
      return;
    }
    const liters = Number(fuelLiters);
    const rate = Number(fuelRate);
    createLogisticsMutation.mutate({
      projectId,
      tripType: "fuel",
      vehicle: fuelVehicle,
      date: fuelDate,
      liters,
      rate,
      total: liters * rate,
      notes: fuelNotes,
    });
    setFuelLiters("");
    setFuelNotes("");
  }

  // Handle Form 4: Rental Trip Log
  function handleLogRental(e: FormEvent) {
    e.preventDefault();
    if (createLogisticsMutation.isPending) return;
    if (!rentalVendor.trim() || !rentalMaterial.trim() || !rentalRate) {
      toast.error("Please fill in operator, material and hire charge.");
      return;
    }
    const rate = Number(rentalRate);
    const helper = Number(rentalHelper) || 0;
    createLogisticsMutation.mutate({
      projectId,
      tripType: "rental",
      vendor: rentalVendor.trim(),
      material: rentalMaterial.trim(),
      date: rentalDate,
      rate,
      helper,
      total: rate + helper,
    });
    setRentalVendor("");
    setRentalMaterial("");
    setRentalRate("");
    setRentalHelper("0");
  }

  const roleTitle =
    user?.role === "operations_admin" || user?.role === "super_admin"
      ? "Owner Overview (Company Admin)"
      : "Site Operations Supervisor";

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      {/* Breadcrumb */}
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <span>Portfolio</span>
        <span>›</span>
        <span>{project.data?.name || "Project Site"}</span>
        <span>›</span>
        <span className="text-foreground font-semibold">Logistics (Load & KM)</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-orange-600 font-bold mb-1">
            — LOGISTICS
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              Transit & Fleet Ledger
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="size-2 rounded-full bg-emerald-500" />
              {roleTitle}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        {isAdmin ? (
          <>
            <label className="text-sm font-semibold" htmlFor="logistics-period">
              Reporting period
            </label>
            <select
              id="logistics-period"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={monthFilter === "all" ? "all" : "month"}
              onChange={(event) =>
                setMonthFilter(event.target.value === "all" ? "all" : period.month)
              }
            >
              <option value="all">All dates</option>
              <option value="month">Select month</option>
            </select>
            {monthFilter !== "all" && (
              <input
                aria-label="Logistics month"
                type="month"
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value || period.month)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            )}
          </>
        ) : (
          <p className="text-sm font-medium">
            Current month: {period.month} · You can view and record entries for this month only.
          </p>
        )}
      </div>

      {/* Top 3 Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Owned Fleet Distance */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              OWNED FLEET DISTANCE
            </div>
            <div className="text-3xl font-black text-foreground">
              {totalFleetDistance.toLocaleString()} KM
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {visibleMonth === "all"
                ? "Total recorded runs across all dates"
                : `Total recorded runs in ${visibleMonth}`}
            </div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <Compass className="size-5" />
          </div>
        </div>

        {/* Fuel Expenditures */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              FUEL EXPENDITURES
            </div>
            <div className="text-3xl font-black text-foreground">
              ₹{totalFuelExpenditure.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Accumulated owned fleet fills</div>
          </div>
          <div className="size-10 rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center">
            <Fuel className="size-5" />
          </div>
        </div>

        {/* Rental Transit Billing */}
        <div className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              RENTAL TRANSIT BILLING
            </div>
            <div className="text-3xl font-black text-foreground">
              ₹{totalRentalBilling.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Daily rental auto and helper sums
            </div>
          </div>
          <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center">
            <Truck className="size-5" />
          </div>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex items-center gap-6 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("owned")}
          className={`text-xs font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "owned"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="size-4" /> Owned Vehicles
        </button>
        <button
          onClick={() => setActiveTab("fuel")}
          className={`text-xs font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "fuel"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Fuel className="size-4" /> Fuel Filling Bills
        </button>
        <button
          onClick={() => setActiveTab("rental")}
          className={`text-xs font-bold pb-2 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === "rental"
              ? "border-orange-600 text-orange-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Receipt className="size-4" /> Rental Auto Section
        </button>
      </div>

      {/* Tab 1: Owned Vehicles View */}
      {activeTab === "owned" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Owned Vehicle Daily Log Table (8 cols) */}
          <div className="lg:col-span-8 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                OWNED VEHICLE DAILY LOG
              </div>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                LIVE REGISTER
              </span>
            </div>

            {mileageLogs.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="size-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shadow-sm">
                  <Gauge className="size-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">
                    No Daily Mileage Runs Recorded
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Register a vehicle and log daily odometer runs using the form on the right.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider bg-secondary/30">
                      <th className="py-3 px-3">DATE</th>
                      <th className="py-3 px-3">VEHICLE</th>
                      <th className="py-3 px-3">DRIVER</th>
                      <th className="py-3 px-3">ODOMETER READINGS</th>
                      <th className="py-3 px-3 text-right">DISTANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {mileageLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">{log.date}</td>
                        <td className="py-3.5 px-3 font-bold text-foreground">{log.vehicle}</td>
                        <td className="py-3.5 px-3 text-foreground">{log.driver}</td>
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">
                          {log.startKm.toLocaleString()} km → {log.endKm.toLocaleString()} km
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-emerald-600 whitespace-nowrap">
                          +{log.distance.toLocaleString()} km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Register Vehicle & Log Mileage Forms (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Form 1: Register New Vehicle */}
            {isAdmin && (
              <form
                onSubmit={handleRegisterVehicle}
                className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm space-y-3"
              >
                <div>
                  <h4 className="font-bold text-sm text-foreground">Register New Vehicle</h4>
                  <p className="text-xs text-muted-foreground">
                    Register a new vehicle into the company fleet.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Vehicle Make & Model
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahindra Bolero, Tata Ace, Tata 407"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    License Plate / Registration No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KA-03-MJ-2401"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createLogisticsMutation.isPending}
                  className="w-full h-9 bg-orange-600 text-white font-bold text-xs rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="size-3.5" /> Register Vehicle
                </button>
              </form>
            )}

            {/* Form 2: Log Daily Mileage Run */}
            <form
              onSubmit={handleLogMileage}
              className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm space-y-3"
            >
              <div>
                <h4 className="font-bold text-sm text-foreground">Log Daily Mileage Run</h4>
                <p className="text-xs text-muted-foreground">
                  Record daily odometer start/end readings for fleet runs.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Select Vehicle
                </label>
                <select
                  required
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground font-medium"
                >
                  <option value="">Choose Vehicle...</option>
                  {registeredVehicles.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Driver Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Naik"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Date</label>
                <input
                  type="date"
                  min={isAdmin ? undefined : period.start}
                  max={isAdmin ? undefined : period.end}
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Start KM</label>
                  <input
                    type="number"
                    required
                    placeholder="12450"
                    value={startKm}
                    onChange={(e) => setStartKm(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">End KM</label>
                  <input
                    type="number"
                    required
                    placeholder="12585"
                    value={endKm}
                    onChange={(e) => setEndKm(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createLogisticsMutation.isPending}
                className="w-full h-9 bg-foreground text-background font-bold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5"
              >
                <Plus className="size-3.5" /> Log Mileage Run
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Fuel Filling Bills View */}
      {activeTab === "fuel" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Fuel Log Table (8 cols) */}
          <div className="lg:col-span-8 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                FUEL EXPENDITURE HISTORY
              </div>
              <span className="text-[10px] font-bold text-orange-600 tracking-wider uppercase bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                FUEL LOG
              </span>
            </div>

            {fuelLogs.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="size-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 shadow-sm">
                  <Fuel className="size-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">No Fuel Records Logged</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Record fuel fills and expenditures using the log form on the right.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider bg-secondary/30">
                      <th className="py-3 px-3">DATE</th>
                      <th className="py-3 px-3">VEHICLE</th>
                      <th className="py-3 px-3">LITERS</th>
                      <th className="py-3 px-3">RATE / LITER</th>
                      <th className="py-3 px-3 text-right">TOTAL AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {fuelLogs.map((f) => (
                      <tr key={f.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">{f.date}</td>
                        <td className="py-3.5 px-3 font-bold text-foreground">{f.vehicle}</td>
                        <td className="py-3.5 px-3 font-semibold text-foreground">
                          {f.liters} Liters
                        </td>
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">
                          ₹{f.rate} / L
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-orange-600 whitespace-nowrap">
                          ₹{f.total.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Log Fuel Filling Form (4 cols) */}
          <div className="lg:col-span-4">
            <form
              onSubmit={handleLogFuel}
              className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm space-y-3"
            >
              <div>
                <h4 className="font-bold text-sm text-foreground">Log Fuel Filling Bill</h4>
                <p className="text-xs text-muted-foreground">
                  Record fuel fill expense for owned fleet vehicles.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Select Vehicle
                </label>
                <select
                  required
                  value={fuelVehicle}
                  onChange={(e) => setFuelVehicle(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground font-medium"
                >
                  <option value="">Choose Vehicle...</option>
                  {registeredVehicles.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Fill Date</label>
                <input
                  type="date"
                  min={isAdmin ? undefined : period.start}
                  max={isAdmin ? undefined : period.end}
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Liters Filled
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 45"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Rate / L (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="95"
                    value={fuelRate}
                    onChange={(e) => setFuelRate(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Receipt / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shell Petrol Pump Receipt #3920"
                  value={fuelNotes}
                  onChange={(e) => setFuelNotes(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={createLogisticsMutation.isPending}
                className="w-full h-9 bg-orange-600 text-white font-bold text-xs rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="size-3.5" /> Log Fuel Fill
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: Rental Auto Section View */}
      {activeTab === "rental" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Rental Logs Table (8 cols) */}
          <div className="lg:col-span-8 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                RENTAL AUTO & TEMPO LOGS
              </div>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                TRANSIT LOG
              </span>
            </div>

            {rentalLogs.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <div className="size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-sm">
                  <Receipt className="size-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">No Rental Trips Recorded</h4>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Log daily rental auto and helper transportation trips using the form on the
                    right.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider bg-secondary/30">
                      <th className="py-3 px-3">DATE</th>
                      <th className="py-3 px-3">OPERATOR / VENDOR</th>
                      <th className="py-3 px-3">MATERIAL CARRIED</th>
                      <th className="py-3 px-3">HIRE CHARGE</th>
                      <th className="py-3 px-3 text-right">TOTAL COST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {rentalLogs.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">{r.date}</td>
                        <td className="py-3.5 px-3 font-bold text-foreground">{r.vendor}</td>
                        <td className="py-3.5 px-3 text-foreground">{r.material}</td>
                        <td className="py-3.5 px-3 font-mono text-muted-foreground">
                          ₹{r.rate.toLocaleString("en-IN")}{" "}
                          {r.helper > 0 && `(+₹${r.helper} helper)`}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-emerald-600 whitespace-nowrap">
                          ₹{r.total.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Log Rental Trip Form (4 cols) */}
          <div className="lg:col-span-4">
            <form
              onSubmit={handleLogRental}
              className="p-5 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm space-y-3"
            >
              <div>
                <h4 className="font-bold text-sm text-foreground">Log Rental Auto Trip</h4>
                <p className="text-xs text-muted-foreground">
                  Log rental auto, tempo, or helper transportation charges.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Operator Name / Vendor
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swamy Auto, City Goods Carrier"
                  value={rentalVendor}
                  onChange={(e) => setRentalVendor(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Material Transported
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scaffolding Pipes, Sand bags"
                  value={rentalMaterial}
                  onChange={(e) => setRentalMaterial(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Trip Date</label>
                <input
                  type="date"
                  min={isAdmin ? undefined : period.start}
                  max={isAdmin ? undefined : period.end}
                  required
                  value={rentalDate}
                  onChange={(e) => setRentalDate(e.target.value)}
                  className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Hire Charge (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1200"
                    value={rentalRate}
                    onChange={(e) => setRentalRate(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Helper Charge (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={rentalHelper}
                    onChange={(e) => setRentalHelper(e.target.value)}
                    className="w-full h-9 px-3 text-xs border border-border rounded-lg bg-background font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createLogisticsMutation.isPending}
                className="w-full h-9 bg-foreground text-background font-bold text-xs rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="size-3.5" /> Log Rental Trip
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

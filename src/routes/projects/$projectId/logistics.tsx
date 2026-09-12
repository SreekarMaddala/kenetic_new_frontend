/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from "../../../contexts/AuthContext";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "../../../components/AppShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { toast } from "sonner";
import { Car, Fuel, Truck, Plus, Calendar, DollarSign, Users, Compass } from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fieldOperationsApi } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/logistics")({
  head: () => ({
    meta: [
      { title: "Logistics & Transport — Kinetic" },
      {
        name: "description",
        content:
          "Track owned vehicle runs, fuel invoices, and rental auto logs for construction material transit.",
      },
    ],
  }),
  component: LogisticsPage,
});

function LogisticsPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const activeRole = useAuth().user?.role;
  const [activeTab, setActiveTab] = React.useState<"vehicles" | "fuel" | "rental">("vehicles");

  const { data: rawLogistics = [] } = useQuery({
    queryKey: ["logistics", projectId],
    queryFn: () => fieldOperationsApi.listLogistics(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const [vehicles, setVehicles] = React.useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = React.useState<any[]>([]);
  const [rentalLogs, setRentalLogs] = React.useState<any[]>([]);
  const [registeredVehicles, setRegisteredVehicles] = React.useState([
    "Mahindra Bolero (KA-03-MJ-2401)",
    "Tata Ace (KA-53-E-8812)",
  ]);

  React.useEffect(() => {
    if (rawLogistics && rawLogistics.length > 0) {
      const parsedVehicles = rawLogistics
        .filter((item: any) => item.tripType === "vehicle" || item.startKm)
        .map((item: any, idx: number) => ({
          id: item.tripId || `V${idx + 1}`,
          date: item.date || new Date().toISOString().split("T")[0],
          name: item.vehicle || item.name || "Mahindra Bolero",
          driver: item.driver || "Driver",
          startKm: item.startKm || 10000,
          endKm: item.endKm || 10100,
          distance: (item.endKm || 10100) - (item.startKm || 10000),
        }));
      const parsedFuel = rawLogistics
        .filter((item: any) => item.tripType === "fuel" || item.liters)
        .map((item: any, idx: number) => ({
          id: item.tripId || `F${idx + 1}`,
          date: item.date || new Date().toISOString().split("T")[0],
          vehicle: item.vehicle || "Mahindra Bolero",
          liters: item.liters || 40,
          rate: item.rate || 98.4,
          total: item.total || 3936,
        }));
      const parsedRental = rawLogistics
        .filter((item: any) => item.tripType === "rental" || item.vendor)
        .map((item: any, idx: number) => ({
          id: item.tripId || `R${idx + 1}`,
          date: item.date || new Date().toISOString().split("T")[0],
          vendor: item.vendor || "Transport Vendor",
          project: item.project || "Site Operations",
          material: item.material || "Materials",
          rate: item.rate || 4500,
          helper: item.helper || 500,
          total: item.total || 5000,
        }));
      setVehicles(parsedVehicles);
      setFuelLogs(parsedFuel);
      setRentalLogs(parsedRental);
    } else {
      setVehicles([]);
      setFuelLogs([]);
      setRentalLogs([]);
    }
  }, [rawLogistics]);

  const createLogisticsMutation = useMutation({
    mutationFn: (body: any) => fieldOperationsApi.createLogistics({ projectId, ...body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics", projectId] });
    },
  });

  // Form states - Vehicles
  const [vehName, setVehName] = React.useState("Mahindra Bolero (KA-03-MJ-2401)");
  const [vehDriver, setVehDriver] = React.useState("");
  const [vehStart, setVehStart] = React.useState("");
  const [vehEnd, setVehEnd] = React.useState("");

  // Form states - Fuel
  const [fuelVeh, setFuelVeh] = React.useState("Mahindra Bolero (KA-03-MJ-2401)");
  const [fuelLiters, setFuelLiters] = React.useState("");
  const [fuelRate, setFuelRate] = React.useState("98.40");

  // Form states - Rental Auto
  const [rentVendor, setRentVendor] = React.useState("");
  const [rentProj, setRentProj] = React.useState("DLF Camellias");
  const [rentMaterial, setRentMaterial] = React.useState("");
  const [rentRate, setRentRate] = React.useState("");
  const [rentHelper, setRentHelper] = React.useState("0");

  // Form states - Register Vehicle (Admin only)
  const [newVehModel, setNewVehModel] = React.useState("");
  const [newVehPlate, setNewVehPlate] = React.useState("");

  // Set default vehicle select option when list changes
  React.useEffect(() => {
    if (registeredVehicles.length > 0) {
      if (!registeredVehicles.includes(vehName)) {
        setVehName(registeredVehicles[0]);
      }
      if (!registeredVehicles.includes(fuelVeh)) {
        setFuelVeh(registeredVehicles[0]);
      }
    }
  }, [registeredVehicles, vehName, fuelVeh]);

  const isSupervisor = activeRole === "supervisor";

  const filteredVehicles = vehicles.filter((v) => {
    if (isSupervisor) {
      return v.driver === "Ramesh Naik";
    }
    return true;
  });

  const filteredFuelLogs = fuelLogs.filter((f) => {
    if (isSupervisor) {
      return f.vehicle.includes("Mahindra Bolero");
    }
    return true;
  });

  const filteredRentalLogs = rentalLogs.filter((r) => {
    if (isSupervisor) {
      return r.project === "DLF Camellias";
    }
    return true;
  });

  // Global calculations
  const totalKmRun = filteredVehicles.reduce((sum, item) => sum + item.distance, 0);
  const totalFuelCost = filteredFuelLogs.reduce((sum, item) => sum + item.total, 0);
  const totalRentalCost = filteredRentalLogs.reduce((sum, item) => sum + item.total, 0);

  const handleRegisterVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehModel || !newVehPlate) {
      toast.error("Please fill in both Vehicle Model and License Plate.");
      return;
    }
    const fullVehName = `${newVehModel} (${newVehPlate.toUpperCase()})`;
    if (registeredVehicles.includes(fullVehName)) {
      toast.error("This vehicle is already registered.");
      return;
    }
    setRegisteredVehicles((prev) => [...prev, fullVehName]);
    setNewVehModel("");
    setNewVehPlate("");
    toast.success(`Vehicle registered: ${fullVehName}`);
  };

  const handleAddVehicleLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehDriver || !vehStart || !vehEnd) {
      toast.error("Please fill in all vehicle reading fields.");
      return;
    }
    const start = parseInt(vehStart);
    const end = parseInt(vehEnd);
    if (end < start) {
      toast.error("Ending Odometer reading cannot be less than starting reading.");
      return;
    }

    const newLog = {
      id: "V" + (vehicles.length + 1),
      date: new Date().toISOString().split("T")[0],
      name: vehName,
      driver: vehDriver,
      startKm: start,
      endKm: end,
      distance: end - start,
    };

    setVehicles([newLog, ...vehicles]);
    setVehDriver("");
    setVehStart("");
    setVehEnd("");
    toast.success("Odometer reading saved successfully!");
  };

  const handleAddFuelLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelLiters || !fuelRate) {
      toast.error("Please enter liters and rate.");
      return;
    }
    const liters = parseFloat(fuelLiters);
    const rate = parseFloat(fuelRate);

    const newLog = {
      id: "F" + (fuelLogs.length + 1),
      date: new Date().toISOString().split("T")[0],
      vehicle: fuelVeh,
      liters,
      rate,
      total: Math.round(liters * rate),
    };

    setFuelLogs([newLog, ...fuelLogs]);
    setFuelLiters("");
    toast.success("Fuel fill receipt logged!");
  };

  const handleAddRentalLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rentVendor || !rentMaterial || !rentRate) {
      toast.error("Please fill in Rental Auto details.");
      return;
    }
    const rateVal = parseInt(rentRate);
    const helperVal = parseInt(rentHelper) || 0;

    const newLog = {
      id: "R" + (rentalLogs.length + 1),
      date: new Date().toISOString().split("T")[0],
      vendor: rentVendor,
      project: rentProj,
      material: rentMaterial,
      rate: rateVal,
      helper: helperVal,
      total: rateVal + helperVal,
    };

    setRentalLogs([newLog, ...rentalLogs]);
    setRentVendor("");
    setRentMaterial("");
    setRentRate("");
    setRentHelper("0");
    toast.success("Rental auto billing logged!");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <PageHeader
          eyebrow={isSupervisor ? "Site Logistics" : "Logistics"}
          title={isSupervisor ? "Site Transit Logs" : "Transit & Fleet Ledger"}
          actions={
            <div className="flex gap-2">
              {isSupervisor ? (
                <div className="text-xs bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 font-mono text-primary font-semibold">
                  Site: DLF Camellias (Amit Mishra)
                </div>
              ) : (
                <div className="text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 font-mono text-emerald-600 font-semibold">
                  🛡️ Owner Overview (Company Admin)
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* ── Summary statistics cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              Owned Fleet Distance
            </CardTitle>
            <Compass className="size-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">{totalKmRun} KM</div>
            <p className="text-[11px] text-muted-foreground mt-1">Total recorded runs this month</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              Fuel Expenditures
            </CardTitle>
            <Fuel className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">
              ₹{totalFuelCost.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Accumulated owned fleet fills</p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-[color:var(--surface)] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
              Rental Transit Billing
            </CardTitle>
            <Truck className="size-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-semibold">
              ₹{totalRentalCost.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Daily rental auto and helper sums
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("vehicles")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "vehicles"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Car className="size-4" /> Owned Vehicles
        </button>
        <button
          onClick={() => setActiveTab("fuel")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "fuel"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Fuel className="size-4" /> Fuel Filling Bills
        </button>
        <button
          onClick={() => setActiveTab("rental")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "rental"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Truck className="size-4" /> Rental Auto Section
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Tab contents list */}
        <div
          className={`${
            isSupervisor || (activeTab === "vehicles" && !isSupervisor)
              ? "lg:col-span-8"
              : "lg:col-span-12"
          } bg-[color:var(--surface)] border border-border rounded-xl shadow-sm overflow-hidden flex flex-col`}
        >
          <div className="px-6 py-4 border-b border-border bg-secondary/10 flex justify-between items-center">
            <h3 className="font-display font-semibold uppercase text-xs tracking-wider font-mono text-muted-foreground">
              {activeTab === "vehicles"
                ? "Owned Vehicle Daily Log"
                : activeTab === "fuel"
                  ? "Refueling Purchases Register"
                  : "Rental Transit Daily Billing"}
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">LIVE REGISTER</span>
          </div>

          <div className="overflow-x-auto flex-1">
            {activeTab === "vehicles" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/40 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Vehicle</th>
                    <th className="px-6 py-3 font-medium">Driver</th>
                    <th className="px-6 py-3 font-medium">Odometer Readings</th>
                    <th className="px-6 py-3 font-medium text-right">Distance</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-border">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-muted-foreground">{v.date}</td>
                      <td className="px-6 py-4 font-medium">{v.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{v.driver}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">
                        {v.startKm} km → {v.endKm} km
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-accent">
                        +{v.distance} km
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "fuel" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/40 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Vehicle</th>
                    <th className="px-6 py-3 font-medium">Volume</th>
                    <th className="px-6 py-3 font-medium">Rate</th>
                    <th className="px-6 py-3 font-medium text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-border">
                  {filteredFuelLogs.map((f) => (
                    <tr key={f.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-muted-foreground">{f.date}</td>
                      <td className="px-6 py-4 font-medium">{f.vehicle}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{f.liters} L</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">₹{f.rate}/L</td>
                      <td className="px-6 py-4 text-right font-mono font-semibold">
                        ₹{f.total.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "rental" && (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-secondary/40 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Rental Operator</th>
                    <th className="px-6 py-3 font-medium">Site Details</th>
                    <th className="px-6 py-3 font-medium">Material</th>
                    <th className="px-6 py-3 font-medium">Base + Helper</th>
                    <th className="px-6 py-3 font-medium text-right">Total Billing</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-border">
                  {filteredRentalLogs.map((r) => (
                    <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-muted-foreground">{r.date}</td>
                      <td className="px-6 py-4 font-medium">{r.vendor}</td>
                      <td className="px-6 py-4 text-muted-foreground">{r.project}</td>
                      <td className="px-6 py-4 font-medium">{r.material}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">
                        ₹{r.rate} + ₹{r.helper}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold">
                        ₹{r.total.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tab Forms panel (4 cols) */}
        {(isSupervisor || (activeTab === "vehicles" && !isSupervisor)) && (
          <div className="lg:col-span-4 bg-[color:var(--surface)] border border-border rounded-xl shadow-sm p-6 flex flex-col gap-4 animate-fade-in">
            <div>
              <h3 className="font-display font-semibold text-sm">
                {activeTab === "vehicles" &&
                  (isSupervisor ? "Log Daily Mileage" : "Register New Vehicle")}
                {activeTab === "fuel" && "Log Refueling Bill"}
                {activeTab === "rental" && "Log Rental Auto Expense"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab === "vehicles" && !isSupervisor
                  ? "Register a new vehicle into the company fleet."
                  : "Add new operational records directly to the platform."}
              </p>
            </div>

            {activeTab === "vehicles" &&
              (isSupervisor ? (
                <form onSubmit={handleAddVehicleLog} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">Owned Vehicle</label>
                    <select
                      value={vehName}
                      onChange={(e) => setVehName(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-md animate-fade-in"
                    >
                      {registeredVehicles.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">Driver Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Naik"
                      value={vehDriver}
                      onChange={(e) => setVehDriver(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="font-medium text-muted-foreground">Start Odo (KM)</label>
                      <input
                        type="number"
                        placeholder="e.g. 12450"
                        value={vehStart}
                        onChange={(e) => setVehStart(e.target.value)}
                        className="w-full p-2 bg-background border border-border rounded-md font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-medium text-muted-foreground">End Odo (KM)</label>
                      <input
                        type="number"
                        placeholder="e.g. 12585"
                        value={vehEnd}
                        onChange={(e) => setVehEnd(e.target.value)}
                        className="w-full p-2 bg-background border border-border rounded-md font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-foreground text-background font-semibold rounded hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Plus className="size-4" /> Save Reading
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterVehicle} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">
                      Vehicle Make & Model
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mahindra Bolero, Tata Ace, Tata 407"
                      value={newVehModel}
                      onChange={(e) => setNewVehModel(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-md"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">
                      License Plate / Registration No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KA-03-MJ-2401"
                      value={newVehPlate}
                      onChange={(e) => setNewVehPlate(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-md font-mono uppercase"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 mt-2"
                  >
                    <Plus className="size-4" /> Register Vehicle
                  </button>
                </form>
              ))}

            {activeTab === "fuel" && (
              <form onSubmit={handleAddFuelLog} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Vehicle Filled</label>
                  <select
                    value={fuelVeh}
                    onChange={(e) => setFuelVeh(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md"
                  >
                    {registeredVehicles.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Fuel Volume (Liters)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 45"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Fuel Rate (₹/Liter)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 98.40"
                    value={fuelRate}
                    onChange={(e) => setFuelRate(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-foreground text-background font-semibold rounded hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 mt-2"
                >
                  <Plus className="size-4" /> Log Fuel Bill
                </button>
              </form>
            )}

            {activeTab === "rental" && (
              <form onSubmit={handleAddRentalLog} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Rental Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Laxmi Transports"
                    value={rentVendor}
                    onChange={(e) => setRentVendor(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">
                    Delivery Site (Project)
                  </label>
                  <select
                    value={rentProj}
                    onChange={(e) => setRentProj(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md"
                  >
                    <option value="DLF Camellias">DLF Camellias</option>
                    <option value="Prestige Lakeside">Prestige Lakeside</option>
                    <option value="Lodha World Towers">Lodha World Towers</option>
                    <option value="Brigade Cornerstone">Brigade Cornerstone</option>
                    <option value="Godrej Reflections">Godrej Reflections</option>
                    <option value="Sobha City Phase IV">Sobha City Phase IV</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-muted-foreground">Material Carried</label>
                  <input
                    type="text"
                    placeholder="e.g. 10 Tons Aggregate"
                    value={rentMaterial}
                    onChange={(e) => setRentMaterial(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">Hire Rate (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 4500"
                      value={rentRate}
                      onChange={(e) => setRentRate(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-md font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">Helper Charges (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={rentHelper}
                      onChange={(e) => setRentHelper(e.target.value)}
                      className="w-full p-2 bg-background border border-border rounded-md font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-foreground text-background font-semibold rounded hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 mt-2"
                >
                  <Plus className="size-4" /> Save Rental Booking
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../components/AppShell";
import { api, type DomainRecord } from "../lib/api";

export const Route = createFileRoute("/vehicles")({ component: VehiclesPage });

function VehiclesPage() {
  const qc = useQueryClient();
  const [vehicleModel, setVehicleModel] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const fleet = useQuery({
    queryKey: ["logistics-trips", "fleet"],
    queryFn: () => api.get<DomainRecord[]>("/supervisor/logistics/trips"),
  });
  const vehicles = (fleet.data ?? []).filter(
    (record) => record.tripType === "vehicle_registration",
  );
  const registerMutation = useMutation({
    mutationFn: (body: DomainRecord) => api.post("/supervisor/logistics/trips", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logistics-trips"] });
      setVehicleModel("");
      setLicensePlate("");
      toast.success("Vehicle registered successfully.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  function handleRegisterVehicle(event: FormEvent) {
    event.preventDefault();
    if (registerMutation.isPending) return;
    const model = vehicleModel.trim();
    const plateNo = licensePlate.trim();
    if (!model) {
      toast.error("Please enter vehicle model.");
      return;
    }
    registerMutation.mutate({
      tripType: "vehicle_registration",
      vehicle: plateNo ? `${model} (${plateNo})` : model,
      model,
      plateNo,
    });
  }
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader title="Vehicle Registry" eyebrow="Global Workspace" />
      <p className="text-sm text-muted-foreground">
        Register company vehicles here. Select them in each project's logistics section to record
        mileage and fuel.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <section className="lg:col-span-2 rounded-xl border border-border bg-[color:var(--surface)] p-5 space-y-4">
          <h2 className="font-semibold">Registered Vehicles</h2>
          {fleet.isPending ? (
            <p className="text-sm text-muted-foreground">Loading vehicles...</p>
          ) : fleet.isError ? (
            <div role="alert">
              <p>Could not load registered vehicles.</p>
              <button onClick={() => fleet.refetch()} className="mt-2 text-sm text-primary">
                Try again
              </button>
            </div>
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4">Vehicle Make &amp; Model</th>
                    <th className="py-3">Registration No.</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((vehicle, index) => (
                    <tr
                      key={String(vehicle.tripId ?? vehicle.recordId ?? index)}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 pr-4">
                        {String(vehicle.model ?? vehicle.vehicle ?? "Vehicle")}
                      </td>
                      <td className="py-3">
                        {String(vehicle.plateNo ?? vehicle.registrationNo ?? "?") || "?"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
            disabled={registerMutation.isPending}
            className="w-full h-9 bg-orange-600 text-white font-bold text-xs rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Plus className="size-3.5" /> Register Vehicle
          </button>
        </form>
      </div>
    </div>
  );
}

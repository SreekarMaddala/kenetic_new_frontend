import { createFileRoute } from "@tanstack/react-router";
import { WorkflowLedger, type Field } from "../../../components/WorkflowLedger";
import { useQuery } from "@tanstack/react-query";
import { api, type DomainRecord } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
export const Route = createFileRoute("/projects/$projectId/logistics")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const endpoint = `/supervisor/logistics/trips?projectId=${encodeURIComponent(projectId)}`;
  const query = useQuery({
    queryKey: ["ledger", endpoint],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const vehicle: Field = {
    key: "vehicle",
    label: "Vehicle",
    required: true,
    options: (query.data ?? [])
      .filter((r) => r.tripType === "vehicle_registration")
      .map((r) => ({ value: String(r.vehicle), label: String(r.vehicle) })),
  };
  return (
    <>
      <WorkflowLedger
        title="Vehicle Register"
        endpoint={endpoint}
        idKey="tripId"
        defaults={{ projectId, tripType: "vehicle_registration" }}
        fields={
          admin
            ? [{ key: "vehicle", label: "Vehicle name and registration plate", required: true }]
            : undefined
        }
        transform={(rows) => rows.filter((r) => r.tripType === "vehicle_registration")}
        columns={[{ key: "vehicle", label: "Vehicle" }]}
      />
      <WorkflowLedger
        title="Daily Mileage"
        endpoint={endpoint}
        idKey="tripId"
        defaults={{ projectId, tripType: "vehicle" }}
        fields={[
          vehicle,
          { key: "driver", label: "Driver", required: true },
          { key: "date", label: "Date", type: "date", required: true },
          { key: "startKm", label: "Start odometer", type: "number", required: true },
          { key: "endKm", label: "End odometer", type: "number", required: true },
        ]}
        transform={(rows) =>
          rows
            .filter((r) => r.tripType === "vehicle")
            .map((r) => ({ ...r, distance: Number(r.endKm) - Number(r.startKm) }))
        }
        columns={[
          { key: "date", label: "Date" },
          { key: "vehicle", label: "Vehicle" },
          { key: "driver", label: "Driver" },
          { key: "startKm", label: "Start km" },
          { key: "endKm", label: "End km" },
          { key: "distance", label: "Distance" },
        ]}
      />
      <WorkflowLedger
        title="Fuel Log"
        endpoint={endpoint}
        idKey="tripId"
        defaults={{ projectId, tripType: "fuel" }}
        fields={[
          vehicle,
          { key: "date", label: "Date", type: "date", required: true },
          { key: "liters", label: "Liters", type: "number", min: 0.01, required: true },
          { key: "rate", label: "Rate per liter", type: "number", required: true },
        ]}
        transform={(rows) => rows.filter((r) => r.tripType === "fuel")}
        columns={[
          { key: "date", label: "Date" },
          { key: "vehicle", label: "Vehicle" },
          { key: "liters", label: "Liters" },
          { key: "rate", label: "Rate" },
          { key: "total", label: "Total" },
        ]}
      />
      <WorkflowLedger
        title="Rental Transport"
        endpoint={endpoint}
        idKey="tripId"
        defaults={{ projectId, tripType: "rental" }}
        fields={[
          { key: "vendor", label: "Vendor", required: true },
          { key: "material", label: "Material carried", required: true },
          { key: "date", label: "Date", type: "date", required: true },
          { key: "rate", label: "Hire charge", type: "number", required: true },
          { key: "helper", label: "Helper charge", type: "number", required: true },
        ]}
        transform={(rows) => rows.filter((r) => r.tripType === "rental")}
        columns={[
          { key: "date", label: "Date" },
          { key: "vendor", label: "Vendor" },
          { key: "material", label: "Material" },
          { key: "total", label: "Total" },
        ]}
      />
    </>
  );
}

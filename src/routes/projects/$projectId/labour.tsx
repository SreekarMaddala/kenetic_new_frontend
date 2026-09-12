import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkflowLedger } from "../../../components/WorkflowLedger";
import { useAuth } from "../../../contexts/AuthContext";
import { api, type DomainRecord } from "../../../lib/api";
import { toast } from "sonner";
export const Route = createFileRoute("/projects/$projectId/labour")({ component: Page });
function Page() {
  const { projectId } = Route.useParams();
  const admin = useAuth().user?.role !== "supervisor";
  const qc = useQueryClient();
  const [day, setDay] = useState(new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState<Record<string, DomainRecord>>({});
  useEffect(() => setDraft({}), [projectId]);
  const endpoint = `/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}&date=${day}`;
  const query = useQuery({
    queryKey: ["labour", projectId, day],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const workers = query.data ?? [];
  const save = useMutation({
    mutationFn: async () => {
      for (const [id, record] of Object.entries(draft)) {
        await api.post("/supervisor/labour/attendance", {
          projectId,
          date: day,
          operation: "attendance",
          labourAttendanceId: id,
          ...record,
        });
      }
    },
    onSuccess: () => {
      setDraft({});
      qc.invalidateQueries();
      toast.success("Attendance saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <section className="p-6 max-w-7xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Daily Labour Attendance</h1>
        <label className="block">
          Attendance date{" "}
          <input
            type="date"
            value={day}
            disabled={Object.keys(draft).length > 0 || save.isPending}
            onChange={(e) => setDay(e.target.value)}
            className="border rounded p-2 bg-background"
          />
        </label>
        {query.error && (
          <p role="alert" className="text-destructive">
            {query.error.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Each worker has one record per day. Night shifts are paid at one additional daily rate.
          Save or discard changes before changing the date.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {[
                  "Worker",
                  "Daily rate",
                  "Attendance",
                  "Night shift",
                  "Days this month",
                  "Deductions this month",
                ].map((h) => (
                  <th key={h} className="p-3 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const id = String(w.labourAttendanceId);
                const value = draft[id] ?? { status: w.status, nightShift: w.nightShift };
                return (
                  <tr key={id} className="border-t">
                    <td className="p-3">{String(w.name)}</td>
                    <td>{Number(w.rate).toLocaleString("en-IN")}</td>
                    <td>
                      <select
                        aria-label={`Attendance for ${w.name}`}
                        disabled={save.isPending}
                        className="bg-background border rounded p-2"
                        value={String(value.status)}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            [id]: {
                              ...value,
                              status: e.target.value,
                              nightShift: e.target.value === "Absent" ? false : value.nightShift,
                            },
                          }))
                        }
                      >
                        {["Present", "Absent", "Half Day"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`Night shift for ${w.name}`}
                        type="checkbox"
                        checked={!!value.nightShift}
                        disabled={save.isPending || value.status === "Absent"}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            [id]: { ...value, nightShift: e.target.checked },
                          }))
                        }
                      />
                    </td>
                    <td>{Number(w.daysPresent)}</td>
                    <td>{Number(w.advanceDeductions)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!workers.length && (
          <p>{query.isLoading ? "Loading workers..." : "No workers registered."}</p>
        )}
        <button
          className="bg-primary text-primary-foreground p-2 rounded disabled:opacity-50"
          disabled={!Object.keys(draft).length || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Saving..." : "Save attendance"}
        </button>
        <button
          className="border rounded p-2 ml-2"
          disabled={save.isPending}
          onClick={() => setDraft({})}
        >
          Discard changes
        </button>
      </section>
      {admin && (
        <WorkflowLedger
          title="Worker Register"
          endpoint={endpoint}
          idKey="labourAttendanceId"
          fields={[
            { key: "name", label: "Worker name", required: true },
            { key: "type", label: "Trade", required: true },
            { key: "rate", label: "Daily rate", type: "number", min: 0.01, required: true },
            { key: "bankName", label: "Bank name (optional)" },
            { key: "accNo", label: "Account number (optional)" },
          ]}
          onCreate={(body) =>
            api.post("/supervisor/labour/attendance", { ...body, projectId, operation: "register" })
          }
          columns={[
            { key: "name", label: "Worker" },
            { key: "type", label: "Trade" },
            { key: "rate", label: "Daily rate" },
          ]}
        />
      )}
      {admin && (
        <WorkflowLedger
          title="Monthly Deductions"
          endpoint={endpoint}
          idKey="id"
          transform={(rows) =>
            rows.flatMap((w) =>
              ((w.deductions as DomainRecord[]) ?? []).map((d, i) => ({
                ...d,
                id: `${w.labourAttendanceId}-${i}`,
                name: w.name,
              })),
            )
          }
          fields={[
            {
              key: "labourAttendanceId",
              label: "Worker",
              required: true,
              options: workers.map((w) => ({
                value: String(w.labourAttendanceId),
                label: String(w.name),
              })),
            },
            { key: "amount", label: "Deduction amount", type: "number", min: 0.01, required: true },
            { key: "description", label: "Reason", required: true },
          ]}
          onCreate={(body) =>
            api.post("/supervisor/labour/attendance", {
              ...body,
              projectId,
              date: day,
              operation: "debit",
            })
          }
          columns={[
            { key: "date", label: "Date" },
            { key: "name", label: "Worker" },
            { key: "description", label: "Reason" },
            { key: "amount", label: "Amount" },
          ]}
        />
      )}
    </div>
  );
}

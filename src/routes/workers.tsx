import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  IndianRupee,
  LoaderCircle,
  RotateCw,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import { RegistryTable, RecordIdentity } from "../components/RegistryTable";
import { api, type DomainRecord } from "../lib/api";
import { WorkerProfile } from "../components/WorkerProfile";
import { workerId } from "../lib/workerAttendance";
import "../styles/workers.css";

export const Route = createFileRoute("/workers")({ component: WorkersPage });
const endpoint = "/supervisor/labour/attendance";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

function WorkersPage() {
  const qc = useQueryClient();
  const [profile, setProfile] = useState<DomainRecord | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("800");
  const workers = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const register = useMutation({
    mutationFn: () =>
      api.post(endpoint, {
        operation: "register",
        name: name.trim(),
        rate: Number(rate),
      }),
    onSuccess: async () => {
      setName("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["workers"] }),
        qc.invalidateQueries({ queryKey: ["labour"] }),
      ]);
      toast.success("Worker registered. Allocate them from a project's attendance page.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const records = workers.data ?? [];
  const wages = records
    .map((worker) => Number(worker.rate))
    .filter((wage) => Number.isFinite(wage) && wage > 0);
  const averageWage = wages.length
    ? wages.reduce((total, wage) => total + wage, 0) / wages.length
    : null;
  const summaryReady = workers.isSuccess;
  const validRegistration = !!name.trim() && Number.isFinite(Number(rate)) && Number(rate) > 0;
  return (
    <div className="workers-page">
      <header className="workers-header">
        <div>
          <span className="workers-eyebrow">PEOPLE & OPERATIONS</span>
          <h1>
            Workers <span>Organization workforce</span>
          </h1>
          <p>
            Your people, ready for the next build. Register workers and manage their daily wages.
          </p>
        </div>
        <button
          type="button"
          className="workers-refresh"
          onClick={() => workers.refetch()}
          disabled={workers.isFetching}
        >
          <RotateCw size={15} className={workers.isFetching ? "workers-spin" : ""} />
          {workers.isFetching ? "Refreshing" : "Refresh"}
        </button>
      </header>
      <section className="workers-metrics" aria-label="Workforce summary">
        <article>
          <span className="workers-metric-icon">
            <UsersRound size={20} />
          </span>
          <div>
            <p>Registered workers</p>
            <strong>{summaryReady ? records.length : "—"}</strong>
            <small>Across your organization</small>
          </div>
        </article>
        <article>
          <span className="workers-metric-icon">
            <IndianRupee size={20} />
          </span>
          <div>
            <p>Average daily wage</p>
            <strong>{summaryReady && averageWage !== null ? money(averageWage) : "—"}</strong>
            <small>Per registered worker</small>
          </div>
        </article>
        <article>
          <span className="workers-metric-icon">
            <Wallet size={20} />
          </span>
          <div>
            <p>Daily wage range</p>
            <strong className="workers-range">
              {summaryReady && wages.length
                ? `${money(Math.min(...wages))} – ${money(Math.max(...wages))}`
                : "—"}
            </strong>
            <small>Lowest to highest registered wage</small>
          </div>
        </article>
      </section>
      <form
        className="workers-register"
        onSubmit={(event) => {
          event.preventDefault();
          if (validRegistration && !register.isPending) register.mutate();
        }}
      >
        <div className="workers-register-intro">
          <span className="workers-register-icon">
            <UserPlus size={20} />
          </span>
          <h2>Add to your workforce</h2>
          <p>Register once. Allocate to projects through Daily Site Attendance.</p>
        </div>
        <div className="workers-register-fields">
          <label>
            Worker name
            <input
              required
              maxLength={128}
              placeholder="e.g. Ravi Kumar"
              autoComplete="off"
              className="workers-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Daily wage (₹)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className="workers-input"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </label>
          <button className="workers-submit" disabled={register.isPending || !validRegistration}>
            {register.isPending ? (
              <LoaderCircle size={16} className="workers-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            {register.isPending ? "Registering..." : "Register worker"}
          </button>
          <p className="workers-form-note">
            Daily wages are used when recording attendance and calculating worker pay.
          </p>
        </div>
      </form>
      {profile && (
        <WorkerProfile
          id={workerId(profile)}
          name={String(profile.name)}
          onClose={() => setProfile(null)}
        />
      )}
      <RegistryTable
        title="Registered workers"
        description="Your workforce directory. Select a worker to view their profile."
        rows={records}
        columns={[
          {
            key: "name",
            label: "Worker",
            value: (worker) => String(worker.name),
            render: (worker) => (
              <button className="workers-profile-link" onClick={() => setProfile(worker)}>
                <RecordIdentity name={String(worker.name)} />
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            ),
          },
          {
            key: "rate",
            label: "Daily wage",
            numeric: true,
            value: (worker) => Number(worker.rate),
            render: (worker) => money(Number(worker.rate)),
          },
        ]}
        rowKey={(worker) => String(worker.labourAttendanceId)}
        searchText={(worker) => String(worker.name)}
        status={() => "Registered"}
        statuses={["Registered"]}
        loading={workers.isLoading}
        error={workers.error?.message}
        onRetry={() => workers.refetch()}
      />
    </div>
  );
}

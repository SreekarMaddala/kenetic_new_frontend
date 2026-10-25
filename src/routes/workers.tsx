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
import { WorkerAdvanceDialog } from "../components/WorkerAdvanceDialog";
import { useAuth } from "../contexts/AuthContext";
import { workerId } from "../lib/workerAttendance";
import "../styles/workers.css";

export const Route = createFileRoute("/workers")({ component: WorkersPage });
const endpoint = "/supervisor/labour/attendance";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

function WorkersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const admin = user?.role === "operations_admin" || user?.role === "super_admin";
  const [advance, setAdvance] = useState<DomainRecord | null>(null);
  const [profile, setProfile] = useState<DomainRecord | null>(null);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("800");
  const [gangName, setGangName] = useState("");
  const [gangId, setGangId] = useState("");
  const [view, setView] = useState<"workers" | "gangs">("workers");
  const gangs = useQuery({
    queryKey: ["worker-gangs"],
    queryFn: async () => {
      const groups = await api.get<DomainRecord[]>(`${endpoint}?gangs=true`);
      if (groups.some((group) => !group.gangId || group.entityType !== "worker-gang")) {
        throw new Error(
          "The API is running an older backend. Deploy the backend gang update to manage gangs.",
        );
      }
      return groups;
    },
  });
  const createGang = useMutation({
    mutationFn: () =>
      api.post<DomainRecord>(endpoint, { operation: "gang_create", name: gangName.trim() }),
    onSuccess: async (gang) => {
      await qc.invalidateQueries({ queryKey: ["worker-gangs"] });
      setGangId(String(gang.gangId));
      setView("gangs");
      setGangName("");
      setName("");
      toast.success(`Gang ${gang.name} is ready. Add its workers below.`);
    },
    onError: (error: Error) =>
      toast.error(
        /invalid.*operation/i.test(error.message)
          ? "The API does not support gang creation yet. Deploy the backend gang update, then retry."
          : error.message,
      ),
  });
  const workers = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const register = useMutation({
    mutationFn: () => {
      return api.post(endpoint, {
        operation: "register",
        name: name.trim(),
        rate: Number(rate),
        ...(view === "gangs" && gangId ? { gangId } : {}),
      });
    },
    onSuccess: async () => {
      setName("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["workers"] }),
        qc.invalidateQueries({ queryKey: ["labour"] }),
      ]);
      toast.success(
        gangId
          ? "Worker added to this gang."
          : "Worker registered. Allocate them from a project's attendance page.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const records = workers.data ?? [];
  const selectedGang = gangs.data?.find((gang) => gang.gangId === gangId);
  const individualWorkers = records.filter((worker) => !worker.gangId);
  const visibleWorkers =
    view === "gangs" ? records.filter((worker) => worker.gangId === gangId) : individualWorkers;
  const wages = individualWorkers
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
          <p>Create gangs, onboard their labourers, and manage daily wages.</p>
        </div>
        <button
          type="button"
          className="workers-refresh"
          onClick={() => {
            workers.refetch();
            gangs.refetch();
          }}
          disabled={workers.isFetching || gangs.isFetching}
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
            <strong>{summaryReady ? individualWorkers.length : "—"}</strong>
            <small>Individual workers, separate from gang members</small>
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
      <nav className="flex gap-3" aria-label="Workforce views">
        <button
          type="button"
          className="workers-refresh"
          aria-pressed={view === "workers"}
          onClick={() => {
            setView("workers");
            setGangId("");
            setName("");
          }}
        >
          Individual workers
        </button>
        <button
          type="button"
          className="workers-refresh"
          aria-pressed={view === "gangs"}
          onClick={() => {
            setView("gangs");
            setGangId("");
            setName("");
          }}
        >
          Gangs
        </button>
      </nav>
      {view === "gangs" && (
        <section className="workers-gangs" aria-label="Worker gangs">
          <div className="workers-gangs-heading">
            <div>
              <h2>Gangs</h2>
              <p>Create a gang first. Open its card below to onboard labourers inside it.</p>
            </div>
            {admin && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (gangName.trim() && !createGang.isPending) createGang.mutate();
                }}
                className="workers-gang-create"
              >
                <input
                  className="workers-input"
                  aria-label="Gang name"
                  placeholder="e.g. Masonry gang"
                  required
                  maxLength={128}
                  value={gangName}
                  onChange={(event) => setGangName(event.target.value)}
                />
                <button
                  className="workers-submit"
                  disabled={!gangName.trim() || createGang.isPending}
                >
                  <UsersRound size={16} /> {createGang.isPending ? "Creating..." : "Create gang"}
                </button>
              </form>
            )}
          </div>
          {gangs.isPending ? (
            <p>Loading gangs...</p>
          ) : gangs.isError ? (
            <p role="alert">
              {gangs.error?.message || "Unable to load gangs."}{" "}
              <button className="workers-profile-link" onClick={() => gangs.refetch()}>
                Try again
              </button>
            </p>
          ) : (
            <div className="workers-gang-list">
              {(gangs.data ?? []).map((gang) => (
                <button
                  type="button"
                  key={String(gang.gangId)}
                  aria-pressed={gang.gangId === gangId}
                  className="workers-gang-card"
                  onClick={() => {
                    setGangId(String(gang.gangId));
                    setName("");
                  }}
                >
                  <strong>{String(gang.name)}</strong>
                  <span>
                    {workers.isSuccess
                      ? `${records.filter((worker) => worker.gangId === gang.gangId).length} members`
                      : "Loading members..."}
                  </span>
                  <small>Open gang</small>
                </button>
              ))}
            </div>
          )}
          {gangs.isSuccess && !gangs.data?.length && (
            <p>No gangs yet. Create your first gang above.</p>
          )}
        </section>
      )}
      {view === "gangs" && !selectedGang && !gangId && admin && (
        <p className="workers-form-note">Create or open a gang above to onboard its labourers.</p>
      )}
      {(view === "workers" || selectedGang) && (
        <form
          className="workers-register"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              admin &&
              validRegistration &&
              !register.isPending &&
              (view === "workers" || (gangId && selectedGang))
            )
              register.mutate();
          }}
        >
          <div className="workers-register-intro">
            <span className="workers-register-icon">
              <UserPlus size={20} />
            </span>
            <h2>
              {selectedGang
                ? `Onboard labourer in ${selectedGang.name}`
                : "Register individual worker"}
            </h2>
            <p>
              {selectedGang
                ? "Each labourer you onboard here becomes a member of this gang."
                : "Register a worker independently of gangs."}
            </p>
          </div>
          <div className="workers-register-fields">
            <label>
              Labourer name
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
            <button
              className="workers-submit"
              disabled={
                !admin || register.isPending || !validRegistration || (!!gangId && !selectedGang)
              }
            >
              {register.isPending ? (
                <LoaderCircle size={16} className="workers-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {register.isPending
                ? "Registering..."
                : selectedGang
                  ? "Onboard labourer"
                  : "Register worker"}
            </button>
            <p className="workers-form-note">
              Daily wages are used when recording attendance and calculating worker pay.
            </p>
          </div>
        </form>
      )}
      {profile && (
        <WorkerProfile
          id={workerId(profile)}
          name={String(profile.name)}
          onClose={() => setProfile(null)}
        />
      )}
      {advance && (
        <WorkerAdvanceDialog
          id={workerId(advance)}
          name={String(advance.name)}
          onClose={() => setAdvance(null)}
        />
      )}
      {(view === "workers" || selectedGang) && (
        <RegistryTable
          title={selectedGang ? `${selectedGang.name} — Members` : "Individual workers"}
          description={
            selectedGang
              ? "Workers created inside this gang. Select a member to view their profile."
              : "Your workforce directory. Select a worker to view their profile."
          }
          rows={visibleWorkers}
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
              key: "gangName",
              label: "Gang",
              value: (worker) => String(worker.gangName ?? "Ungrouped"),
              render: (worker) => String(worker.gangName ?? "Ungrouped"),
            },
            {
              key: "rate",
              label: "Daily wage",
              numeric: true,
              value: (worker) => Number(worker.rate),
              render: (worker) => money(Number(worker.rate)),
            },
            ...(admin
              ? [
                  {
                    key: "advance",
                    label: "Advance payment",
                    value: () => "",
                    render: (worker: DomainRecord) => (
                      <button className="worker-advance-trigger" onClick={() => setAdvance(worker)}>
                        <Wallet size={15} />
                        Record advance
                      </button>
                    ),
                  },
                ]
              : []),
          ]}
          rowKey={(worker) => String(worker.labourAttendanceId)}
          searchText={(worker) => `${worker.name} ${worker.gangName ?? ""}`}
          status={() => "Registered"}
          statuses={["Registered"]}
          loading={workers.isLoading}
          error={workers.error?.message}
          onRetry={() => workers.refetch()}
        />
      )}
    </div>
  );
}

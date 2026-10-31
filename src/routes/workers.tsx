import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowUpRight,
  IndianRupee,
  LoaderCircle,
  Plus,
  RotateCw,
  UserPlus,
  UsersRound,
  Wallet,
} from "lucide-react";
import { RegistryTable, RecordIdentity } from "../components/RegistryTable";
import { api, type DomainRecord } from "../lib/api";
import { WorkerProfile } from "../components/WorkerProfile";
import { WorkerAdvanceDialog } from "../components/WorkerAdvanceDialog";
import { GangManagement, gangMoney as money } from "../components/GangHeadcount";
import type { Gang } from "../lib/gangHeadcount";
import { useAuth } from "../contexts/AuthContext";
import { workerId } from "../lib/workerAttendance";
import { createGangOnboardingRequest } from "../lib/gangOnboarding";
import { localDate } from "../lib/projectForm";
import "../styles/workers.css";

export const Route = createFileRoute("/workers")({ component: WorkersPage });
const endpoint = "/supervisor/labour/attendance";

function WorkersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const admin = user?.role === "operations_admin" || user?.role === "super_admin";
  const [view, setView] = useState<"workers" | "gangs">("gangs");
  const [gangId, setGangId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [gangName, setGangName] = useState("");
  const [gangSize, setGangSize] = useState("");
  const [gangRate, setGangRate] = useState("800");
  const [gangStart, setGangStart] = useState(localDate);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("800");
  const [advance, setAdvance] = useState<DomainRecord | null>(null);
  const [profile, setProfile] = useState<DomainRecord | null>(null);
  const onboardingRequest = useRef(createGangOnboardingRequest());
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<DomainRecord[]>("/projects"),
  });
  const gangs = useQuery({
    queryKey: ["worker-gangs"],
    queryFn: async () => {
      const groups = await api.get<Gang[]>(`${endpoint}?gangs=true`);
      if (
        groups.some(
          (group) =>
            typeof group.gangId !== "string" ||
            !group.gangId.trim() ||
            typeof group.name !== "string" ||
            !group.name.trim() ||
            "workerId" in group ||
            "labourAttendanceId" in group,
        )
      )
        throw new Error(
          "Unable to load gangs. The server returned an unexpected response. Refresh and try again.",
        );
      return groups;
    },
  });
  const workers = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.get<DomainRecord[]>(endpoint),
  });
  const createGang = useMutation({
    mutationFn: () =>
      api.post<Gang>(endpoint, {
        operation: "gang_create",
        name: gangName.trim(),
        attendanceMode: "headcount",
        size: Number(gangSize),
        rate: Number(gangRate),
        headcountFrom: gangStart,
      }),
    onSuccess: async (gang) => {
      setGangId(gang.gangId);
      setGangName("");
      setGangSize("");
      setCreateOpen(false);
      await qc.invalidateQueries({ queryKey: ["worker-gangs"] });
      toast.success(`${gang.name} is ready. Assign it to a project below.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const register = useMutation({
    mutationFn: () => api.post(endpoint, onboardingRequest.current({ name, rate: Number(rate) })),
    onSuccess: async () => {
      onboardingRequest.current = createGangOnboardingRequest();
      setName("");
      await qc.invalidateQueries();
      toast.success("Worker registered. Assign them from the project attendance page.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const records = workers.data ?? [];
  const individualWorkers = records.filter((worker) => !worker.gangId);
  const selectedGang = gangs.data?.find((gang) => gang.gangId === gangId);
  const configuredGangs = (gangs.data ?? []).filter((gang) => gang.attendanceMode === "headcount");
  const gangPeople = configuredGangs.reduce((sum, gang) => sum + (gang.size ?? 0), 0);
  const wages = (
    view === "gangs"
      ? configuredGangs.map((gang) => gang.rate!)
      : individualWorkers.map((worker) => Number(worker.rate))
  ).filter((wage) => Number.isFinite(wage) && wage > 0);
  const averageWage = wages.length
    ? wages.reduce((sum, wage) => sum + wage, 0) / wages.length
    : null;
  const validGang =
    !!gangName.trim() &&
    /^\d+$/.test(gangSize) &&
    Number(gangSize) > 0 &&
    Number(gangSize) <= 10000 &&
    /^\d+(\.\d{1,2})?$/.test(gangRate) &&
    Number(gangRate) > 0 &&
    !!gangStart;
  const validWorker = !!name.trim() && Number.isFinite(Number(rate)) && Number(rate) > 0;
  const ready = view === "gangs" ? gangs.isSuccess : workers.isSuccess;
  return (
    <div className="workers-page">
      <header className="workers-header">
        <div>
          <div className="workers-header-icon">
            <UsersRound size={25} />
          </div>
          <div className="workers-header-text">
            <span className="workers-eyebrow">PEOPLE & OPERATIONS</span>
            <h1>Workers & gangs</h1>
            <p>Simple attendance. Clear advances. Know what’s left to pay.</p>
          </div>
        </div>
        <button
          type="button"
          className="workers-refresh"
          onClick={() => {
            void qc.invalidateQueries({ queryKey: ["workers"] });
            void qc.invalidateQueries({ queryKey: ["worker-gangs"] });
            void qc.invalidateQueries({ queryKey: ["gang-account"] });
          }}
          disabled={workers.isFetching || gangs.isFetching}
        >
          <RotateCw
            size={15}
            className={workers.isFetching || gangs.isFetching ? "workers-spin" : ""}
          />{" "}
          Refresh
        </button>
      </header>
      <nav aria-label="Workforce views">
        <button
          type="button"
          className="workers-refresh"
          aria-pressed={view === "gangs"}
          onClick={() => setView("gangs")}
        >
          Gangs
        </button>
        <button
          type="button"
          className="workers-refresh"
          aria-pressed={view === "workers"}
          onClick={() => setView("workers")}
        >
          Individual workers
        </button>
      </nav>
      <section className="workers-metrics" aria-label="Workforce summary">
        <article>
          <span className="workers-metric-icon">
            <UsersRound size={20} />
          </span>
          <div>
            <p>{view === "gangs" ? "Your gangs" : "Individual workers"}</p>
            <strong>
              {ready ? (view === "gangs" ? gangs.data!.length : individualWorkers.length) : "—"}
            </strong>
            <small>
              {view === "gangs"
                ? `${gangPeople} people in headcount gangs`
                : "Workers managed individually"}
            </small>
          </div>
        </article>
        <article>
          <span className="workers-metric-icon">
            <IndianRupee size={20} />
          </span>
          <div>
            <p>Average daily rate</p>
            <strong>{ready && averageWage !== null ? money(averageWage) : "—"}</strong>
            <small>
              {view === "gangs" ? "Average agreed gang rate per person" : "Per individual worker"}
            </small>
          </div>
        </article>
        <article>
          <span className="workers-metric-icon">
            <Wallet size={20} />
          </span>
          <div>
            <p>{view === "gangs" ? "Attendance & advances" : "Daily rate range"}</p>
            <strong className="workers-range">
              {view === "gangs"
                ? "By gang"
                : ready && wages.length
                  ? `${money(Math.min(...wages))} – ${money(Math.max(...wages))}`
                  : "—"}
            </strong>
            <small>
              {view === "gangs"
                ? "Headcounts for attendance · one gang advance balance"
                : "Lowest to highest daily rate"}
            </small>
          </div>
        </article>
      </section>
      {view === "gangs" ? (
        <>
          <section className="workers-gangs" aria-label="Worker gangs">
            <div className="workers-gangs-heading">
              <div>
                <h2>Your gangs</h2>
                <p>Select a gang to assign work, give an advance, or review its balance.</p>
              </div>
              {admin && (
                <button className="gang-primary" onClick={() => setCreateOpen(!createOpen)}>
                  <Plus size={16} /> {createOpen ? "Close form" : "New gang"}
                </button>
              )}
            </div>
            {createOpen && admin && (
              <form
                className="workers-gang-create gang-create-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (validGang && !createGang.isPending) createGang.mutate();
                }}
              >
                <label>
                  Gang name
                  <input
                    className="workers-input"
                    aria-label="Gang name"
                    required
                    maxLength={128}
                    placeholder="e.g. Masonry gang"
                    value={gangName}
                    onChange={(event) => setGangName(event.target.value)}
                    disabled={createGang.isPending}
                  />
                </label>
                <label>
                  Number of people
                  <input
                    className="workers-input"
                    aria-label="Gang size"
                    type="number"
                    required
                    min="1"
                    max="10000"
                    step="1"
                    placeholder="e.g. 10"
                    value={gangSize}
                    onChange={(event) => setGangSize(event.target.value)}
                    disabled={createGang.isPending}
                  />
                </label>
                <label>
                  Daily rate per person (₹)
                  <input
                    className="workers-input"
                    aria-label="Gang daily rate"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={gangRate}
                    onChange={(event) => setGangRate(event.target.value)}
                    disabled={createGang.isPending}
                  />
                </label>
                <label>
                  Start date
                  <input
                    className="workers-input"
                    type="date"
                    required
                    value={gangStart}
                    onChange={(event) => setGangStart(event.target.value)}
                    disabled={createGang.isPending}
                  />
                </label>
                <button className="gang-primary" disabled={!validGang || createGang.isPending}>
                  {createGang.isPending ? "Creating…" : "Create gang"}
                </button>
                <p className="workers-form-note">
                  One daily rate for everyone. Supervisors enter how many people worked; advances
                  belong to the whole gang.
                </p>
                {createGang.error && (
                  <p role="alert" className="gang-error">
                    {createGang.error.message}
                  </p>
                )}
              </form>
            )}
            {gangs.isPending ? (
              <p role="status">Loading gangs…</p>
            ) : gangs.isError ? (
              <p className="gang-error" role="alert">
                {gangs.error.message} <button onClick={() => gangs.refetch()}>Retry</button>
              </p>
            ) : gangs.data?.length ? (
              <div className="workers-gang-list">
                {gangs.data.map((gang) => (
                  <button
                    type="button"
                    key={gang.gangId}
                    className="workers-gang-card"
                    aria-pressed={gang.gangId === gangId}
                    onClick={() => setGangId(gang.gangId)}
                  >
                    <span className="gang-card-top">
                      <UsersRound size={19} />
                      <small>
                        {gang.attendanceMode === "headcount" ? "Headcount" : "Setup needed"}
                      </small>
                    </span>
                    <strong>{gang.name}</strong>
                    <span>
                      {gang.attendanceMode === "headcount"
                        ? `${gang.size} people · ${money(gang.rate!)} / day each`
                        : "Add team size and a common daily rate"}
                    </span>
                    <small>{gang.gangId === gangId ? "Selected gang" : "Manage gang →"}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="gang-empty">
                <UsersRound size={28} />
                <h3>Bring your first gang on board</h3>
                <p>Add the gang’s name, team size and daily rate. No individual names needed.</p>
              </div>
            )}
          </section>
          {selectedGang && admin && (
            <>
              {projects.isError && (
                <p role="alert" className="workers-form-note">
                  Unable to load projects.{" "}
                  <button onClick={() => projects.refetch()}>Retry projects</button>
                </p>
              )}
              <GangManagement
                key={`${selectedGang.gangId}-${selectedGang.version ?? 0}`}
                gang={selectedGang}
                projects={projects.data ?? []}
              />
              {records.some((worker) => worker.gangId === selectedGang.gangId) && (
                <details className="workers-legacy-records">
                  <summary>Existing named-worker records</summary>
                  <p>
                    Earlier attendance, personal advances and payments remain with each worker. New
                    headcount entries and gang advances are managed above.
                  </p>
                  <div>
                    {records
                      .filter((worker) => worker.gangId === selectedGang.gangId)
                      .map((worker) => (
                        <button
                          className="workers-refresh"
                          key={workerId(worker)}
                          onClick={() => setProfile(worker)}
                        >
                          {String(worker.name)} <ArrowUpRight size={14} />
                        </button>
                      ))}
                  </div>
                </details>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {admin && (
            <form
              className="workers-register"
              onSubmit={(event) => {
                event.preventDefault();
                if (validWorker && !register.isPending) register.mutate();
              }}
            >
              <div className="workers-register-intro">
                <span className="workers-register-icon">
                  <UserPlus size={20} />
                </span>
                <h2>Register individual worker</h2>
                <p>For workers whose attendance and advances are managed individually.</p>
              </div>
              <div className="workers-register-fields">
                <label>
                  Worker name
                  <input
                    className="workers-input"
                    required
                    maxLength={128}
                    placeholder="e.g. Ravi Kumar"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label>
                  Daily wage (₹)
                  <input
                    className="workers-input"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={rate}
                    onChange={(event) => setRate(event.target.value)}
                  />
                </label>
                <button className="workers-submit" disabled={!validWorker || register.isPending}>
                  {register.isPending ? (
                    <LoaderCircle size={16} className="workers-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {register.isPending ? "Registering…" : "Register worker"}
                </button>
                <p className="workers-form-note">
                  Assign workers from the project attendance page.
                </p>
              </div>
            </form>
          )}
          <RegistryTable
            title="Individual workers"
            description="View attendance, advances and payment history for each worker."
            rows={individualWorkers}
            columns={[
              {
                key: "name",
                label: "Worker",
                value: (worker) => String(worker.name),
                render: (worker) => (
                  <button className="workers-profile-link" onClick={() => setProfile(worker)}>
                    <RecordIdentity name={String(worker.name)} />
                    <ArrowUpRight size={14} />
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
              ...(admin
                ? [
                    {
                      key: "advance",
                      label: "Advance",
                      value: () => "",
                      render: (worker: DomainRecord) => (
                        <button
                          className="worker-advance-trigger"
                          onClick={() => setAdvance(worker)}
                        >
                          <Wallet size={15} /> Record advance
                        </button>
                      ),
                    },
                  ]
                : []),
            ]}
            rowKey={workerId}
            searchText={(worker) => String(worker.name)}
            status={() => "Registered"}
            statuses={["Registered"]}
            loading={workers.isLoading}
            error={workers.error?.message}
            onRetry={() => workers.refetch()}
          />
        </>
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
    </div>
  );
}

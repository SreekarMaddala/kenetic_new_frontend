import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersRound, Wallet, ArrowDownLeft, CheckCircle2, ChevronRight } from "lucide-react";
import { api, type DomainRecord } from "../lib/api";
import { type Gang, headcountPreview } from "../lib/gangHeadcount";
import { localDate } from "../lib/projectForm";
import "../styles/gangs.css";

const endpoint = "/supervisor/labour/attendance";
export const gangMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export function GangHeadcountPanel({
  projectId,
  day,
  admin,
  canRecordAttendance,
  blocked,
  setBusy,
  refresh,
}: {
  projectId: string;
  day: string;
  admin: boolean;
  canRecordAttendance: boolean;
  blocked: boolean;
  setBusy: (busy: boolean) => void;
  refresh: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["gang-headcounts", projectId, day, admin],
    queryFn: () =>
      api.get<Gang[]>(
        `${endpoint}?gangRoster=true&projectId=${encodeURIComponent(projectId)}&date=${day}${admin ? "&roster=true" : ""}`,
      ),
  });
  const groups = (query.data ?? []).filter(
    (gang) => gang.attendanceMode === "headcount" && gang.headcountFrom! <= day,
  );
  const assigned = groups.filter((gang) => gang.allocation?.projectId === projectId);
  const saved = assigned.filter((gang) => gang.attendance);
  return (
    <section className="gang-workspace" aria-label="Gang headcount attendance">
      <header className="gang-section-heading">
        <div>
          <span className="gang-eyebrow">GANG ATTENDANCE</span>
          <h2>How many people worked today?</h2>
          <p>Enter the number present. Wages use the gang’s agreed rate per person.</p>
        </div>
        {admin && (
          <Link to="/workers" className="gang-secondary">
            Manage gangs <ChevronRight size={15} />
          </Link>
        )}
      </header>
      {query.isPending ? (
        <p role="status">Loading gangs…</p>
      ) : query.isError ? (
        <div role="alert" className="gang-error">
          {query.error.message} <button onClick={() => query.refetch()}>Retry</button>
        </div>
      ) : (
        <>
          {!!assigned.length && (
            <div className="gang-day-totals">
              <span>
                <strong>
                  {saved.reduce(
                    (sum, gang) => sum + gang.attendance!.present + gang.attendance!.halfDay,
                    0,
                  )}
                </strong>{" "}
                people attended
              </span>
              <span>
                <strong>
                  {saved.length} / {assigned.length}
                </strong>{" "}
                gangs recorded
              </span>
              <span>
                <strong>
                  {gangMoney(saved.reduce((sum, gang) => sum + gang.attendance!.wage, 0))}
                </strong>{" "}
                wages earned today
              </span>
            </div>
          )}
          {!groups.length && (
            <div className="gang-empty">
              <UsersRound size={28} />
              <h3>No headcount gangs assigned yet</h3>
              <p>
                {admin
                  ? "Create a gang with its team size and daily rate, then assign it to this project."
                  : "Your admin can assign a gang to this project for the selected date."}
              </p>
              {admin && (
                <Link to="/workers" className="gang-primary">
                  Set up gangs
                </Link>
              )}
            </div>
          )}
          <div className="gang-attendance-grid">
            {groups.map((gang) => (
              <GangHeadcountCard
                key={`${gang.gangId}-${day}-${gang.attendance?.version ?? 0}-${gang.allocation?.version ?? 0}`}
                gang={gang}
                projectId={projectId}
                day={day}
                admin={admin}
                canRecordAttendance={canRecordAttendance}
                blocked={blocked || query.isFetching}
                setBusy={setBusy}
                refresh={async () => {
                  await qc.invalidateQueries({ queryKey: ["gang-headcounts"] });
                  await refresh();
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function GangHeadcountCard({
  gang,
  projectId,
  day,
  admin,
  canRecordAttendance,
  blocked,
  setBusy,
  refresh,
}: {
  gang: Gang;
  projectId: string;
  day: string;
  admin: boolean;
  canRecordAttendance: boolean;
  blocked: boolean;
  setBusy: (busy: boolean) => void;
  refresh: () => Promise<void>;
}) {
  const allocated = gang.allocation?.projectId === projectId;
  const size = allocated ? gang.allocation!.size : gang.size!;
  const rate = allocated ? gang.allocation!.rate : gang.rate!;
  const saved = gang.attendance;
  const [present, setPresent] = useState(saved ? String(saved.present) : "");
  const [half, setHalf] = useState(String(saved?.halfDay ?? 0));
  const [night, setNight] = useState(String(saved?.nightCount ?? 0));
  const [reason, setReason] = useState("");
  const preview = headcountPreview(size, rate, present, half, night);
  const changed =
    !saved ||
    (preview &&
      [
        preview.present !== saved.present,
        preview.halfDay !== saved.halfDay,
        preview.nightCount !== saved.nightCount,
      ].some(Boolean));
  const mutation = useMutation({
    mutationFn: () =>
      api.post(
        endpoint,
        admin
          ? {
              operation: "gang_allocate",
              gangId: gang.gangId,
              projectId,
              date: day,
              expectedVersion: gang.allocation?.version ?? 0,
            }
          : {
              operation: "gang_attendance",
              gangId: gang.gangId,
              projectId,
              date: day,
              present: preview!.present,
              halfDay: preview!.halfDay,
              nightCount: preview!.nightCount,
              expectedVersion: saved?.version ?? 0,
              ...(saved ? { correctionReason: reason.trim() } : {}),
            },
      ),
    onMutate: () => setBusy(true),
    onSuccess: refresh,
    onSettled: () => setBusy(false),
  });
  const disabled = blocked || mutation.isPending;
  return (
    <article
      className={`gang-attendance-card ${saved ? "is-saved" : ""}`}
      aria-label={`Headcount for ${gang.name}`}
    >
      <header>
        <div className="gang-title">
          <span className="gang-avatar">
            <UsersRound size={21} />
          </span>
          <div>
            <h3>{gang.name}</h3>
            <p>
              {size} people <span>·</span> {gangMoney(rate)} / person / day
            </p>
          </div>
        </div>
        <span className={`gang-status ${saved ? "is-saved" : ""}`}>
          {saved ? (
            <>
              <CheckCircle2 size={13} /> Saved
            </>
          ) : allocated ? (
            "To record"
          ) : (
            "Unassigned"
          )}
        </span>
      </header>
      {allocated ? (
        <>
          {canRecordAttendance ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  !disabled &&
                  preview &&
                  changed &&
                  (!saved || reason.trim()) &&
                  !gang.payrollLocked
                )
                  mutation.mutate();
              }}
            >
              <fieldset disabled={disabled || gang.payrollLocked} className="gang-count-fields">
                <label className="gang-present-label">
                  People present{" "}
                  <div className="gang-present-input">
                    <input
                      aria-label={`People present in ${gang.name}`}
                      type="number"
                      min="0"
                      max={size}
                      step="1"
                      required
                      placeholder="0"
                      value={present}
                      onChange={(event) => setPresent(event.target.value)}
                    />
                    <span>out of {size}</span>
                  </div>
                </label>
                <details
                  className="gang-optional-counts"
                  open={!!saved && !!(saved.halfDay || saved.nightCount)}
                >
                  <summary>Half days or night shifts (optional)</summary>
                  <div className="gang-extras">
                    <label>
                      Half-day workers
                      <input
                        aria-label={`Half-day workers in ${gang.name}`}
                        type="number"
                        min="0"
                        max={size}
                        step="1"
                        value={half}
                        onChange={(event) => setHalf(event.target.value)}
                      />
                    </label>
                    <label>
                      Also worked a night shift
                      <input
                        aria-label={`Night shifts in ${gang.name}`}
                        type="number"
                        min="0"
                        max={size}
                        step="1"
                        value={night}
                        onChange={(event) => setNight(event.target.value)}
                      />
                    </label>
                  </div>
                  <small>
                    Count full-day and half-day workers separately. Each night shift adds one daily
                    wage.
                  </small>
                </details>
                {saved && changed && (
                  <label>
                    Reason for correction
                    <input
                      required
                      maxLength={500}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="What changed?"
                    />
                  </label>
                )}
              </fieldset>
              {present !== "" && !preview && (
                <p className="gang-error" role="alert">
                  Use whole numbers. Full days + half days cannot exceed {size}; night shifts cannot
                  exceed full days.
                </p>
              )}
              <div className="gang-wage-preview">
                <span>
                  {preview ? `${preview.absent} absent · Wages earned today` : "Wages earned today"}
                </span>
                <strong>{preview ? gangMoney(preview.wage) : "—"}</strong>
              </div>
              {gang.payrollLocked ? (
                <p className="gang-note">
                  This month’s payroll is prepared. Ask the admin to reopen the unpaid cycle to
                  correct attendance.
                </p>
              ) : (
                <button
                  className="gang-primary"
                  disabled={disabled || !preview || !changed || (!!saved && !reason.trim())}
                >
                  {mutation.isPending
                    ? "Saving…"
                    : saved && !changed
                      ? "Attendance saved"
                      : saved
                        ? "Save correction"
                        : "Save attendance"}
                </button>
              )}
            </form>
          ) : (
            <div className="gang-readonly">
              <div>
                <strong>
                  {saved ? saved.present + saved.halfDay : "—"}
                  <small> / {size}</small>
                </strong>
                <span>people attended</span>
              </div>
              <div>
                <strong>{saved ? gangMoney(saved.wage) : "—"}</strong>
                <span>wages earned today</span>
              </div>
              <p>
                {saved
                  ? `${saved.present} full days · ${saved.halfDay} half days · ${saved.nightCount} night shifts · ${saved.absent} absent`
                  : "Waiting for the supervisor to record attendance."}
              </p>
            </div>
          )}
        </>
      ) : admin ? (
        <div className="gang-assignment-action">
          <p>
            {gang.allocation
              ? "Assigned to another project for this date."
              : "Assign this gang so the supervisor can enter today’s headcount."}
          </p>
          <button
            className="gang-secondary"
            disabled={disabled || gang.allocation?.attendanceStarted}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Assigning…" : "Assign gang here"}
          </button>
        </div>
      ) : null}
      {mutation.error && (
        <p role="alert" className="gang-error">
          {mutation.error.message} <button onClick={() => void refresh()}>Refresh gang</button>
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="gang-note">
          {admin ? "Gang assigned." : "Attendance saved."}
        </p>
      )}
      {admin && allocated && (
        <Link to="/projects/$projectId/payroll" params={{ projectId }} className="gang-text-link">
          Review gang payment <ChevronRight size={14} />
        </Link>
      )}
    </article>
  );
}

export function GangManagement({ gang, projects }: { gang: Gang; projects: DomainRecord[] }) {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [day, setDay] = useState(localDate);
  const [size, setSize] = useState(String(gang.size ?? ""));
  const [rate, setRate] = useState(String(gang.rate ?? ""));
  const [start, setStart] = useState(gang.headcountFrom ?? localDate());
  const [editing, setEditing] = useState(gang.attendanceMode !== "headcount");
  const details = useQuery({
    queryKey: ["gang-account", gang.gangId],
    queryFn: async () =>
      (
        await api.get<Gang[]>(
          `${endpoint}?gangRoster=true&gangId=${encodeURIComponent(gang.gangId)}`,
        )
      )[0],
  });
  const allocated = useQuery({
    queryKey: ["gang-headcounts", projectId, day, gang.gangId],
    enabled: !!projectId && !!day,
    queryFn: async () =>
      (
        await api.get<Gang[]>(
          `${endpoint}?gangRoster=true&gangId=${encodeURIComponent(gang.gangId)}&projectId=${encodeURIComponent(projectId)}&date=${day}&roster=true`,
        )
      )[0],
  });
  const save = useMutation({
    mutationFn: () =>
      api.post(endpoint, {
        operation: "gang_configure",
        gangId: gang.gangId,
        size: Number(size),
        rate: Number(rate),
        headcountFrom: start,
        expectedVersion: gang.version ?? 0,
      }),
    onSuccess: async () => {
      setEditing(false);
      await qc.invalidateQueries();
    },
  });
  const configured = gang.attendanceMode === "headcount";
  const valid =
    /^\d+$/.test(size) &&
    Number(size) > 0 &&
    Number(size) <= 10000 &&
    Number(rate) > 0 &&
    /^\d+(\.\d{1,2})?$/.test(rate) &&
    !!start;
  return (
    <section className="gang-management" aria-label={`${gang.name} management`}>
      <header className="gang-section-heading">
        <div>
          <span className="gang-eyebrow">SELECTED GANG</span>
          <h2>{gang.name}</h2>
          <p>
            {configured
              ? `${gang.size} people · ${gangMoney(gang.rate!)} per person per day`
              : "Set a team size and common daily rate to start using headcounts."}
          </p>
        </div>
        {configured && (
          <button className="gang-secondary" onClick={() => setEditing(!editing)}>
            {editing ? "Close settings" : "Edit team & rate"}
          </button>
        )}
      </header>
      {editing && (
        <form
          className="gang-setup"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !save.isPending) save.mutate();
          }}
        >
          <label>
            People in this gang
            <input
              type="number"
              required
              min="1"
              max="10000"
              step="1"
              value={size}
              onChange={(event) => setSize(event.target.value)}
            />
          </label>
          <label>
            Daily rate per person (₹)
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </label>
          {!configured && (
            <label>
              Use headcounts from
              <input
                type="date"
                required
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
          )}
          <button className="gang-primary" disabled={save.isPending || !valid}>
            {save.isPending
              ? "Saving…"
              : configured
                ? "Save gang settings"
                : "Start headcount attendance"}
          </button>
          <p className="gang-note">
            {configured
              ? "New assignments use this team size and rate. Existing assignments and saved wages keep their agreed rate."
              : "Existing named-worker attendance and personal advances stay in their original records. From this date, record attendance and new advances for the whole gang."}
          </p>
          {save.error && (
            <p className="gang-error" role="alert">
              {save.error.message}
            </p>
          )}
        </form>
      )}
      {configured && (
        <>
          <div className="gang-project-picker">
            <div>
              <h3>Assign to a project</h3>
              <p>Choose where the gang works on this date.</p>
            </div>
            <label>
              Project
              <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">Choose project</option>
                {projects
                  .filter((project) => project.status !== "Archived")
                  .map((project) => (
                    <option key={String(project.projectId)} value={String(project.projectId)}>
                      {String(project.name)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Work date
              <input
                type="date"
                min={gang.headcountFrom}
                value={day}
                onChange={(event) => setDay(event.target.value)}
              />
            </label>
          </div>
          {projectId && day && (
            <div>
              {allocated.isPending ? (
                <p>Loading assignment…</p>
              ) : allocated.isError ? (
                <p role="alert" className="gang-error">
                  {allocated.error.message}{" "}
                  <button onClick={() => allocated.refetch()}>Retry</button>
                </p>
              ) : (
                allocated.data && (
                  <GangHeadcountCard
                    key={`${projectId}-${day}-${allocated.data.allocation?.version ?? 0}-${allocated.data.attendance?.version ?? 0}`}
                    gang={allocated.data}
                    projectId={projectId}
                    day={day}
                    admin
                    canRecordAttendance={false}
                    blocked={allocated.isFetching}
                    setBusy={() => {}}
                    refresh={async () => {
                      await qc.invalidateQueries({ queryKey: ["gang-headcounts"] });
                    }}
                  />
                )
              )}
            </div>
          )}
          {details.isPending ? (
            <p role="status">Loading gang balance…</p>
          ) : details.isError ? (
            <p role="alert" className="gang-error">
              {details.error.message}{" "}
              <button onClick={() => details.refetch()}>Retry balance</button>
            </p>
          ) : (
            details.data?.account && (
              <GangAccountPanel gang={details.data} projectId={projectId} projects={projects} />
            )
          )}
        </>
      )}
    </section>
  );
}

export function GangAccountPanel({
  gang,
  projectId,
  projects,
}: {
  gang: Gang;
  projectId: string;
  projects: DomainRecord[];
}) {
  const account = gang.account!;
  const qc = useQueryClient();
  const [mode, setMode] = useState<"gang_advance" | "gang_advance_return" | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localDate);
  const [description, setDescription] = useState("");
  const [cashProject, setCashProject] = useState(projectId);
  const requests = useRef(new Map<string, string>());
  const cash = useMutation({
    mutationFn: () => {
      const body = {
        operation: mode,
        gangId: gang.gangId,
        projectId: cashProject,
        date,
        amount: Number(amount),
        description: description.trim(),
      };
      const key = JSON.stringify(body);
      if (!requests.current.has(key)) requests.current.set(key, crypto.randomUUID());
      return api.post(endpoint, { ...body, requestId: requests.current.get(key) });
    },
    onSuccess: async () => {
      setMode(null);
      setAmount("");
      setDescription("");
      requests.current.clear();
      await qc.invalidateQueries();
    },
  });
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount) && Number(amount) > 0;
  const returnLimit = Math.max(0, account.advanceBalance - account.reservedAdvances);
  const valid =
    validAmount &&
    cashProject &&
    date &&
    date >= gang.headcountFrom! &&
    description.trim() &&
    (mode !== "gang_advance_return" || Number(amount) <= returnLimit);
  function open(next: "gang_advance" | "gang_advance_return") {
    cash.reset();
    setMode(next);
    setCashProject(projectId);
    setAmount("");
    setDescription("");
  }
  return (
    <div className="gang-account" aria-label="Gang advances and payments">
      <header className="gang-section-heading">
        <div>
          <span className="gang-eyebrow">GANG MONEY · ALL PROJECTS</span>
          <h2>One gang. One clear balance.</h2>
          <p>Money is recorded against {gang.name}, without splitting it between workers.</p>
        </div>
        <Wallet size={24} />
      </header>
      <div className="gang-money-cards">
        <div>
          <span>Wages earned</span>
          <strong>{gangMoney(account.earned)}</strong>
          <small>From headcount attendance</small>
        </div>
        <div>
          <span>Advances given</span>
          <strong>{gangMoney(account.advancesGiven - account.advancesReturned)}</strong>
          <small>After money returned by the gang</small>
        </div>
        <div>
          <span>Wages paid</span>
          <strong>{gangMoney(account.paid)}</strong>
          <small>Final payments recorded</small>
        </div>
        <div className="is-balance">
          <span>Balance to pay</span>
          <strong>{gangMoney(account.balanceToPay)}</strong>
          <small>
            {account.carryForward
              ? `${gangMoney(account.carryForward)} advance carries forward`
              : "After advances and wage payments"}
          </small>
        </div>
      </div>
      <p className="gang-equation">Wages earned − advances given − wages paid = balance to pay</p>
      <p className="gang-note">
        Prepared payroll keeps its saved calculation. To include a new advance in an unpaid payment,
        reopen that payroll and prepare it again.
      </p>
      <div className="gang-advance-summary">
        <div>
          <span>Advance still to recover</span>
          <strong>{gangMoney(account.advanceBalance)}</strong>
          <p>
            {account.reservedAdvances
              ? `${gangMoney(account.reservedAdvances)} will be deducted in prepared payroll.`
              : "Deducted automatically when you prepare payroll. Extra advance carries forward."}
          </p>
        </div>
        <div className="gang-actions">
          <button
            className="gang-primary"
            disabled={cash.isPending}
            onClick={() => open("gang_advance")}
          >
            <Wallet size={16} /> Give advance
          </button>
          <button
            className="gang-secondary"
            disabled={cash.isPending || !returnLimit}
            onClick={() => open("gang_advance_return")}
          >
            <ArrowDownLeft size={16} /> Record money returned
          </button>
        </div>
      </div>
      {mode && (
        <form
          className="gang-cash-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !cash.isPending) cash.mutate();
          }}
        >
          <h3>
            {mode === "gang_advance"
              ? `Give an advance to ${gang.name}`
              : "Record money the gang gave back"}
          </h3>
          <p>
            {mode === "gang_advance"
              ? "Record money already handed to the gang leader. It will reduce the gang’s final payment."
              : `Record cash actually returned by the gang, up to ${gangMoney(returnLimit)}.`}
          </p>
          <fieldset disabled={cash.isPending}>
            <label>
              Project
              <select
                required
                value={cashProject}
                onChange={(event) => setCashProject(event.target.value)}
              >
                <option value="">Choose project</option>
                {projects
                  .filter((item) => item.status !== "Archived")
                  .map((item) => (
                    <option key={String(item.projectId)} value={String(item.projectId)}>
                      {String(item.name)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Amount (₹)
              <input
                autoFocus
                type="number"
                required
                min="0.01"
                step="0.01"
                max={mode === "gang_advance_return" ? returnLimit : undefined}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label>
              Date
              <input
                type="date"
                min={gang.headcountFrom}
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label className="gang-cash-reason">
              Reason / payment reference
              <input
                required
                maxLength={500}
                placeholder="e.g. Cash given to gang leader for weekly expenses"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </fieldset>
          {cash.error && (
            <p role="alert" className="gang-error">
              {cash.error.message}
            </p>
          )}
          <div className="gang-actions">
            <button className="gang-primary" disabled={!valid || cash.isPending}>
              {cash.isPending
                ? "Saving…"
                : mode === "gang_advance"
                  ? "Save advance"
                  : "Save money returned"}
            </button>
            <button
              type="button"
              className="gang-secondary"
              disabled={cash.isPending}
              onClick={() => setMode(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {cash.isSuccess && !mode && (
        <p role="status" className="gang-note">
          Gang money entry saved.
        </p>
      )}
      {projectId && (
        <Link to="/projects/$projectId/payroll" params={{ projectId }} className="gang-text-link">
          Prepare and record this project’s gang payment <ChevronRight size={15} />
        </Link>
      )}
      <details className="gang-money-history">
        <summary>
          Advance & payment history <span>{gang.history?.length ?? 0} entries</span>
        </summary>
        {gang.history?.length ? (
          <div className="gang-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entry</th>
                  <th>Project</th>
                  <th>Reason / reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {gang.history.map((entry) => (
                  <tr key={entry.createdAt + (entry.cashId ?? entry.projectId)}>
                    <td>{entry.date}</td>
                    <td>
                      {entry.cashType}
                      {!!entry.advanceRecovery && (
                        <small>{gangMoney(entry.advanceRecovery)} advance deducted</small>
                      )}
                    </td>
                    <td>
                      {String(
                        projects.find((project) => project.projectId === entry.projectId)?.name ??
                          "Project",
                      )}
                    </td>
                    <td>{entry.description}</td>
                    <td>{gangMoney(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No advances or payments recorded yet.</p>
        )}
      </details>
    </div>
  );
}

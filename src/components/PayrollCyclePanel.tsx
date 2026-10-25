import {
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  Wallet,
} from "lucide-react";
import "../styles/payroll.css";

type Props = {
  month: string;
  onMonthChange: (month: string) => void;
  status?: string;
  entries: number;
  loading: boolean;
  error?: string;
  busy?: "generate" | "settle" | "reopen";
  unavailable: boolean;
  onGenerate: () => void;
  onExport: () => void;
  onReopen: () => void;
  onRetry: () => void;
};

export function PayrollCyclePanel({
  month,
  onMonthChange,
  status,
  entries,
  loading,
  error,
  busy,
  unavailable,
  onGenerate,
  onExport,
  onReopen,
  onRetry,
}: Props) {
  const validMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const monthLabel = validMonth
    ? new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "Selected month";
  const ready = !loading && !error;
  const badge = loading
    ? "Loading cycle"
    : error
      ? "Unable to load"
      : status === "Paid"
        ? "Paid"
        : status === "Pending"
          ? "Awaiting payment"
          : (status ?? "Not generated");
  return (
    <section className="payroll-cycle-section" aria-label="Monthly payroll cycle">
      <header className="payroll-heading">
        <div>
          <span className="payroll-eyebrow">FINANCE & PEOPLE</span>
          <h1>Project payroll</h1>
          <p>Prepare monthly wages, review the register and record your settlement.</p>
        </div>
        <span
          className={`payroll-status ${ready && status === "Paid" ? "is-paid" : ready && status ? "is-pending" : ""}`}
          role="status"
        >
          {loading ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : ready && status === "Paid" ? (
            <CheckCircle2 size={14} />
          ) : (
            <span className="payroll-status-dot" />
          )}
          {badge}
        </span>
      </header>
      <div className="payroll-cycle-card">
        <div className="payroll-cycle-toolbar">
          <label className="payroll-month-field">
            <span>
              <CalendarDays size={14} />
              Payroll month
            </span>
            <input
              aria-label="Payroll month"
              type="month"
              value={month}
              disabled={!!busy}
              onChange={(event) => onMonthChange(event.target.value)}
            />
          </label>
          <div className="payroll-cycle-actions">
            {status === "Pending" && (
              <button
                className="payroll-action payroll-reopen"
                disabled={unavailable}
                onClick={onReopen}
              >
                {busy === "reopen" ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <RotateCcw size={15} />
                )}
                {busy === "reopen" ? "Reopening…" : "Reopen unpaid cycle"}
              </button>
            )}
            <button
              className="payroll-action"
              disabled={unavailable || !status || !entries}
              onClick={onExport}
            >
              <Download size={15} />
              Export register
            </button>
            {!status && (
              <button
                className="payroll-action payroll-primary"
                disabled={unavailable || !validMonth}
                onClick={onGenerate}
              >
                {busy === "generate" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={16} />
                )}
                {busy === "generate" ? "Generating…" : "Generate payroll"}
              </button>
            )}
          </div>
        </div>
        <ol className="payroll-steps" aria-label="Payroll process">
          {[
            {
              title: "Prepare",
              detail: "Save attendance & salaries",
              done: ready && !!status,
              active: ready && !status,
            },
            {
              title: "Generate",
              detail: "Review the saved register",
              done: ready && !!status,
              active: false,
            },
            {
              title: "Settle",
              detail: "Record external payment",
              done: ready && status === "Paid",
              active: ready && (status === "Pending" || status === "Partially Paid"),
            },
          ].map((step, index) => (
            <li
              key={step.title}
              className={`${step.done ? "is-done" : ""} ${step.active ? "is-active" : ""}`}
            >
              <span className="payroll-step-number">
                {step.done ? <Check size={14} /> : `0${index + 1}`}
              </span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </div>
            </li>
          ))}
        </ol>
        {loading ? (
          <div className="payroll-cycle-state" role="status">
            <LoaderCircle size={20} className="animate-spin" />
            <div>
              <h2>Loading {monthLabel.toLowerCase()}</h2>
              <p>Checking the saved payroll cycle.</p>
            </div>
          </div>
        ) : error ? (
          <div className="payroll-cycle-state is-error" role="alert">
            <Info size={22} />
            <div>
              <h2>Payroll could not be loaded</h2>
              <p>{error}</p>
            </div>
            <button className="payroll-action" onClick={onRetry}>
              Retry
            </button>
          </div>
        ) : !status ? (
          <div className="payroll-cycle-state">
            <span className="payroll-state-icon">
              <FileSpreadsheet size={24} />
            </span>
            <div>
              <h2>{validMonth ? `${monthLabel} is ready to prepare` : "Choose a payroll month"}</h2>
              <p>
                {validMonth
                  ? "No cycle generated yet. Save worker attendance and configure staff salaries below, then generate your register."
                  : "Select a month to load or generate its payroll cycle."}
              </p>
            </div>
          </div>
        ) : (
          <div className="payroll-cycle-state">
            <span className="payroll-state-icon">
              {status === "Paid" ? <CheckCircle2 size={24} /> : <Wallet size={24} />}
            </span>
            <div>
              <h2>
                {status === "Paid"
                  ? `${monthLabel} payroll is settled`
                  : `${monthLabel} register is ready`}
              </h2>
              <p>
                {entries} {entries === 1 ? "person" : "people"} in the saved register.{" "}
                {status === "Paid"
                  ? "The external payment has been recorded."
                  : "Review the amounts below before recording an external payment."}
              </p>
            </div>
          </div>
        )}
        <div className="payroll-cycle-note">
          <LockKeyhole size={14} />
          <p>
            Generating payroll locks attendance, advances and deductions for this month. Final wages
            subtract remaining advances and daily wages already paid. Reopen an unpaid cycle to
            correct entries.
          </p>
        </div>
      </div>
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { Calendar, CheckCircle2, Clock, AlertTriangle, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/progress")({
  component: ProgressPage,
});

const MILESTONES = [
  {
    id: "M1",
    title: "Site Mobilization & Fencing",
    date: "01 Jan 2026",
    status: "Completed",
    progress: 100,
    owner: "Rajesh Kumar",
  },
  {
    id: "M2",
    title: "Excavation & Earthworks",
    date: "15 Feb 2026",
    status: "Completed",
    progress: 100,
    owner: "Amit Mishra",
  },
  {
    id: "M3",
    title: "Foundation & Footing",
    date: "10 Apr 2026",
    status: "Completed",
    progress: 100,
    owner: "L&T Structurals",
  },
  {
    id: "M4",
    title: "Basement Slab Casting",
    date: "05 Jun 2026",
    status: "In Progress",
    progress: 65,
    owner: "Amit Mishra",
  },
  {
    id: "M5",
    title: "Ground Floor Superstructure",
    date: "30 Jul 2026",
    status: "Delayed",
    progress: 15,
    owner: "Priya Sharma",
  },
  {
    id: "M6",
    title: "MEP Rough-ins (L1-L5)",
    date: "15 Sep 2026",
    status: "Pending",
    progress: 0,
    owner: "Metro MEP Services",
  },
  {
    id: "M7",
    title: "Facade & Glazing",
    date: "20 Nov 2026",
    status: "Pending",
    progress: 0,
    owner: "Glassco Inc.",
  },
];

function ProgressPage() {
  const { projectId } = Route.useParams();

  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-up">
      <PageHeader title="Project Schedule & Milestones" eyebrow="Planning & Engineering" />

      {/* Overview Card */}
      <div className="bg-[color:var(--surface)] p-6 rounded-xl border border-border flex items-center justify-between shadow-sm">
        <div>
          <h3 className="font-bold text-lg text-foreground">Overall Completion</h3>
          <p className="text-sm text-muted-foreground mt-1">Based on weighted milestone progress</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-display font-bold text-primary">42%</div>
            <div className="text-xs text-muted-foreground font-mono mt-1">ON TRACK</div>
          </div>
          {/* Circular Progress Ring */}
          <div className="relative size-16">
            <svg className="size-full rotate-[-90deg]" viewBox="0 0 36 36">
              <path
                className="text-secondary"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary transition-all duration-1000 ease-out"
                strokeDasharray="42, 100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[color:var(--surface)] rounded-xl border border-border p-8 shadow-sm">
        <h4 className="font-semibold text-foreground mb-8">Execution Timeline</h4>

        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {MILESTONES.map((m, i) => {
            const isCompleted = m.status === "Completed";
            const isInProgress = m.status === "In Progress";
            const isDelayed = m.status === "Delayed";
            const isPending = m.status === "Pending";

            return (
              <div
                key={m.id}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Icon */}
                <div
                  className={`flex items-center justify-center size-10 rounded-full border-4 border-[color:var(--surface)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isInProgress
                        ? "bg-blue-500 text-white animate-pulse"
                        : isDelayed
                          ? "bg-orange-500 text-white"
                          : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-5" />
                  ) : isInProgress ? (
                    <PlayCircle className="size-5" />
                  ) : isDelayed ? (
                    <AlertTriangle className="size-4" />
                  ) : (
                    <Clock className="size-4" />
                  )}
                </div>

                {/* Card */}
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border bg-[color:var(--surface)] shadow-sm hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      {m.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-600"
                          : isInProgress
                            ? "bg-blue-500/10 text-blue-600"
                            : isDelayed
                              ? "bg-orange-500/10 text-orange-600"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mb-1">{m.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <Calendar className="size-3" /> {m.date}
                  </div>

                  {/* Progress Bar inside card */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-muted-foreground">Progress</span>
                      <span className={isCompleted ? "text-emerald-600" : "text-primary"}>
                        {m.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? "bg-emerald-500" : isDelayed ? "bg-orange-500" : "bg-primary"}`}
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-semibold text-foreground">{m.owner}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

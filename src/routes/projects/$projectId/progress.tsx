import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { Calendar, CheckCircle2, Clock, AlertTriangle, PlayCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { projectCommercialApi, type DomainRecord } from "../../../lib/api";

export const Route = createFileRoute("/projects/$projectId/progress")({
  head: () => ({
    meta: [
      { title: "Project Schedule & Milestones — Kinetic" },
      {
        name: "description",
        content: "Project execution timeline, milestone tracking, and overall completion.",
      },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { projectId } = Route.useParams();

  const { data: rawMilestones = [], isLoading } = useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () => projectCommercialApi.listMilestones(projectId),
    enabled: !!projectId,
    retry: 1,
  });

  const milestones = rawMilestones.map((item: DomainRecord, idx: number) => ({
    id: (item.milestoneId as string) ?? `M${idx + 1}`,
    title: (item.title as string) ?? (item.name as string) ?? "Milestone",
    date: (item.targetDate as string) ?? (item.endDate as string) ?? "—",
    status: (item.status as string) ?? "Pending",
    progress: typeof item.progress === "number" ? (item.progress as number) : 0,
    owner: (item.owner as string) ?? (item.assignedTo as string) ?? "—",
  }));

  const overallProgress =
    milestones.length > 0
      ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length)
      : 0;

  const hasDelays = milestones.some((m) => m.status === "Delayed");
  const trackLabel = hasDelays ? "DELAYED" : "ON TRACK";

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
            <div className="text-3xl font-display font-bold text-primary">{overallProgress}%</div>
            <div
              className={`text-xs font-mono mt-1 ${hasDelays ? "text-orange-500" : "text-muted-foreground"}`}
            >
              {trackLabel}
            </div>
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
                strokeDasharray={`${overallProgress}, 100`}
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

        {isLoading && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            Loading milestones…
          </div>
        )}

        {!isLoading && milestones.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No milestones recorded for this project yet.
          </div>
        )}

        {!isLoading && milestones.length > 0 && (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {milestones.map((m) => {
              const isCompleted = m.status === "Completed";
              const isInProgress = m.status === "In Progress";
              const isDelayed = m.status === "Delayed";

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
        )}
      </div>
    </div>
  );
}

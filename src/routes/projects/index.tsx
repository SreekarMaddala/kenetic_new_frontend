import { createFileRoute, useNavigate } from "@tanstack/react-router";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAuth } from "../../contexts/AuthContext";
import { PageHeader } from "../../components/AppShell";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi, type Project } from "../../lib/api";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Kinetic" },
      { name: "description", content: "Detailed view of active construction projects." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: rawProjects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectApi.list(),
    retry: 1,
  });

  // Map API models to components expectation
  const projects = rawProjects.map((p) => ({
    id: p.projectId,
    name: p.name,
    location: p.location,
    phase: (p as any).phase || "Construction",
    progress:
      (p as any).progress ||
      (p.budget && p.spent ? Math.min(Math.round((p.spent / p.budget) * 100), 100) : 0),
    status: p.status || "On Track",
    budget:
      typeof p.budget === "number"
        ? `₹${(p.budget / 10_000_000).toFixed(2)} Cr`
        : p.budget || "₹0.00 Cr",
    spent:
      typeof p.spent === "number"
        ? `₹${(p.spent / 10_000_000).toFixed(2)} Cr`
        : p.spent || "₹0.00 Cr",
    deadline: p.endDate || "Dec 2026",
    image:
      (p as any).image ||
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80",
    supervisor: (p as any).supervisor || "",
    todaysLabour: (p as any).todaysLabour || 0,
    openIssues: (p as any).openIssues || 0,
  }));

  // Add Project Modal State
  const [isAddProjectOpen, setIsAddProjectOpen] = React.useState(false);
  const [newProjName, setNewProjName] = React.useState("");
  const [newProjLoc, setNewProjLoc] = React.useState("");
  const [newProjPhase, setNewProjPhase] = React.useState("");
  const [newProjProgress, setNewProjProgress] = React.useState("0");
  const [newProjStatus, setNewProjStatus] = React.useState("On Track");
  const [newProjBudget, setNewProjBudget] = React.useState("");
  const [newProjSpent, setNewProjSpent] = React.useState("");
  const [newProjDeadline, setNewProjDeadline] = React.useState("");
  const [customImageUrl, setCustomImageUrl] = React.useState("");
  const [newProjSupervisor, setNewProjSupervisor] = React.useState("");

  const presetImages = [
    {
      label: "🏢 High-Rise Apartment",
      url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
    },
    {
      label: "🏗️ Commercial Structure",
      url: "https://images.unsplash.com/photo-1503387762-592dec58ef4e?auto=format&fit=crop&w=800&q=80",
    },
    {
      label: "🚧 Excavation Site",
      url: "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80",
    },
    {
      label: "🏡 Luxury Residential",
      url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
    },
    {
      label: "🛠️ Interior Fit-out",
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    },
  ];
  const [newProjImage, setNewProjImage] = React.useState(presetImages[0].url);

  const createMutation = useMutation({
    mutationFn: (body: any) => projectApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("New project added to portfolio successfully!");
      setIsAddProjectOpen(false);
      // Reset form fields
      setNewProjName("");
      setNewProjLoc("");
      setNewProjPhase("");
      setNewProjProgress("0");
      setNewProjStatus("On Track");
      setNewProjBudget("");
      setNewProjSpent("");
      setNewProjDeadline("");
      setCustomImageUrl("");
    },
    onError: (err: Error) => {
      toast.error(`Failed to create project: ${err.message}`);
    },
  });

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjLoc || !newProjBudget || !newProjDeadline) {
      toast.error("Please fill in project name, location, budget, and deadline.");
      return;
    }

    const budgetVal = parseFloat(newProjBudget) * 10_000_000; // convert Cr to absolute
    createMutation.mutate({
      name: newProjName,
      location: newProjLoc,
      budget: budgetVal,
      startDate: new Date().toISOString().split("T")[0],
      endDate: newProjDeadline,
      // Pass other fields in request body if schema supports, else they fall back
      phase: newProjPhase || "Planning",
      progress: parseInt(newProjProgress) || 0,
      status: newProjStatus,
      image: customImageUrl || newProjImage,
      supervisor: newProjSupervisor,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-72 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
      {isAddProjectOpen ? (
        <div className="space-y-6 animate-fade-up">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddProjectOpen(false)}
              className="size-8 rounded-full border border-border bg-background grid place-items-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="text-xs text-muted-foreground font-mono uppercase">
              Back to Portfolio
            </span>
          </div>

          <div className="border-b border-border pb-4">
            <h1 className="text-3xl font-display font-semibold tracking-tight">
              Create New Project
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Initialize a new construction site, set targets, allocate budgets, and assign preset
              gallery feeds.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Section */}
            <form
              onSubmit={handleAddProject}
              className="lg:col-span-8 bg-[color:var(--surface)] border border-border rounded-xl shadow-sm p-6 space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-muted-foreground">Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Sobha City Phase IV, Prestige Lakeside"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-muted-foreground">
                    Location (City, State) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore, KA"
                    value={newProjLoc}
                    onChange={(e) => setNewProjLoc(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Project Phase</label>
                  <input
                    type="text"
                    placeholder="e.g. Structure, Foundation, Excavation"
                    value={newProjPhase}
                    onChange={(e) => setNewProjPhase(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Status</label>
                  <select
                    value={newProjStatus}
                    onChange={(e) => setNewProjStatus(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    <option value="On Track">On Track</option>
                    <option value="Delayed">Delayed</option>
                    <option value="At Risk">At Risk</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">
                    Total Budget (₹ Cr) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 82.40"
                    value={newProjBudget}
                    onChange={(e) => setNewProjBudget(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm font-mono text-foreground"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Spent Budget (₹ Cr)</label>
                  <input
                    type="text"
                    placeholder="e.g. 51.10"
                    value={newProjSpent}
                    onChange={(e) => setNewProjSpent(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm font-mono text-foreground"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-muted-foreground">
                    Project Site Type / Preset Photo
                  </label>
                  <select
                    value={newProjImage}
                    onChange={(e) => setNewProjImage(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    {presetImages.map((img) => (
                      <option key={img.url} value={img.url}>
                        {img.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-muted-foreground">
                    Or Paste Custom Photo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="e.g. https://images.unsplash.com/photo-..."
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm text-foreground font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">
                    Progress Percentage (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newProjProgress}
                    onChange={(e) => setNewProjProgress(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm font-mono text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Deadline Date *</label>
                  <input
                    type="text"
                    placeholder="e.g. Nov 2025, Aug 2026"
                    value={newProjDeadline}
                    onChange={(e) => setNewProjDeadline(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm font-mono text-foreground"
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-muted-foreground">
                    Default Site Supervisor
                  </label>
                  <select
                    value={newProjSupervisor}
                    onChange={(e) => setNewProjSupervisor(e.target.value)}
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm text-foreground"
                  >
                    <option value="">None (Unassigned)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddProjectOpen(false)}
                  className="px-6 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Create Project
                </button>
              </div>
            </form>

            {/* Live Preview Card Section */}
            <div className="lg:col-span-4 space-y-4 shrink-0">
              <h3 className="text-xs font-mono uppercase text-muted-foreground tracking-wider font-semibold">
                Live Card Preview
              </h3>
              <article className="bg-[color:var(--surface)] rounded-xl border border-border overflow-hidden flex flex-col shadow-sm">
                <div className="relative h-44 w-full bg-secondary overflow-hidden">
                  <img
                    src={
                      customImageUrl ||
                      newProjImage ||
                      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={newProjName || "New Project Preview"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <StatusChip status={newProjStatus} />
                  </div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <h3 className="font-display font-semibold text-lg leading-tight truncate max-w-[240px] drop-shadow-md">
                      {newProjName || "Untitled Project"}
                    </h3>
                    <p className="text-[10px] text-zinc-300 font-mono uppercase tracking-wider mt-0.5 drop-shadow-sm">
                      {newProjLoc || "Bangalore, KA"}
                    </p>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs text-muted-foreground">
                        {newProjPhase || "Structure"}
                      </span>
                      <span className="text-xs font-mono font-semibold">{newProjProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={
                          "h-full " +
                          (newProjStatus === "Delayed"
                            ? "bg-primary"
                            : newProjStatus === "At Risk"
                              ? "bg-yellow-500"
                              : "bg-accent")
                        }
                        style={{ width: `${newProjProgress}%` }}
                      />
                    </div>
                  </div>

                  {newProjSupervisor && newProjSupervisor !== "None" && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/20 rounded-lg p-2.5 my-1.5 border border-border/40 shrink-0 animate-fade-in">
                      <User className="size-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium">
                        Supervisor: <strong className="text-foreground">{newProjSupervisor}</strong>
                      </span>
                    </div>
                  )}

                  <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
                    <div>
                      <dt className="text-muted-foreground mb-1">Today's Labour</dt>
                      <dd className="font-mono font-medium">0 workers</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-1">Open Issues</dt>
                      <dd className="font-mono font-medium text-destructive">0 pending</dd>
                    </div>
                  </dl>
                  <dl className="grid grid-cols-3 gap-3 pt-3 border-t border-border text-xs">
                    <div>
                      <dt className="text-muted-foreground">Budget</dt>
                      <dd className="font-mono font-medium mt-0.5">
                        ₹{newProjBudget || "0.00"} Cr
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Spent</dt>
                      <dd className="font-mono font-medium mt-0.5">₹{newProjSpent || "0.00"} Cr</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Deadline</dt>
                      <dd className="font-mono font-medium mt-0.5">
                        {newProjDeadline || "Dec 2026"}
                      </dd>
                    </div>
                  </dl>
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                    <button className="py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors">
                      View
                    </button>
                    <button className="py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors">
                      Edit
                    </button>
                    <button className="py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors">
                      Analytics
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-up">
          <PageHeader
            eyebrow="Portfolio"
            title="Projects"
            actions={
              <button
                onClick={() => setIsAddProjectOpen(true)}
                className="h-10 px-6 bg-foreground text-background rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                + New Project
              </button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map((p, i) => (
              <article
                key={p.name}
                onClick={() => {
                  navigate({ to: `/projects/${p.id}` });
                }}
                className="cursor-pointer bg-[color:var(--surface)] hover:shadow-md transition-shadow rounded-xl border border-border overflow-hidden flex flex-col group"
              >
                {/* Project Image Header */}
                <div className="relative h-44 w-full bg-secondary overflow-hidden shrink-0">
                  <img
                    src={
                      p.image ||
                      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <StatusChip status={p.status} />
                  </div>
                  <div className="absolute bottom-3 left-3 text-white">
                    <h3 className="font-display font-semibold text-lg leading-tight truncate drop-shadow-md">
                      {p.name}
                    </h3>
                    <p className="text-[10px] text-zinc-250 font-mono uppercase tracking-wider mt-0.5 drop-shadow-sm">
                      {p.location}
                    </p>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs text-muted-foreground">{p.phase}</span>
                      <span className="text-xs font-mono font-semibold">{p.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={
                          "h-full " +
                          (p.status === "Delayed"
                            ? "bg-primary"
                            : p.status === "At Risk"
                              ? "bg-yellow-500"
                              : "bg-accent")
                        }
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  {p.supervisor && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/20 rounded-lg p-2.5 my-1.5 border border-border/40 shrink-0">
                      <User className="size-3.5 text-primary shrink-0" />
                      <span className="truncate font-medium">
                        Supervisor: <strong className="text-foreground">{p.supervisor}</strong>
                      </span>
                    </div>
                  )}

                  <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-xs">
                    <div>
                      <dt className="text-muted-foreground mb-1">Today's Labour</dt>
                      <dd className="font-mono font-medium">{p.todaysLabour || 0} workers</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground mb-1">Open Issues</dt>
                      <dd
                        className={`font-mono font-medium ${(p.openIssues || 0) > 0 ? "text-destructive" : ""}`}
                      >
                        {p.openIssues || 0} pending
                      </dd>
                    </div>
                  </dl>
                  <dl className="grid grid-cols-3 gap-3 pt-3 border-t border-border text-xs">
                    <div>
                      <dt className="text-muted-foreground">Budget</dt>
                      <dd className="font-mono font-medium mt-0.5">{p.budget}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Spent</dt>
                      <dd className="font-mono font-medium mt-0.5">{p.spent}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Deadline</dt>
                      <dd className="font-mono font-medium mt-0.5">{p.deadline}</dd>
                    </div>
                  </dl>
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: `/projects/${p.id}` });
                      }}
                      className="py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: `/projects/${p.id}/reports` });
                      }}
                      className="py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                    >
                      Analytics
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "Delayed"
      ? "bg-primary/10 text-primary"
      : status === "At Risk"
        ? "bg-yellow-500/10 text-yellow-700"
        : "bg-accent/10 text-accent";
  return (
    <span
      className={
        "shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded " + tone
      }
    >
      {status}
    </span>
  );
}

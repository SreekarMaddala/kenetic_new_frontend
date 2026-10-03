import { Link, useRouterState, useRouter, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useProject } from "../lib/ProjectContext";
import { ChevronDown, ChevronRight, LogOut, Menu, X, ArrowLeft } from "lucide-react";
import { ROLE_LABELS, homeForRole } from "../lib/permissions";
import { useAuth } from "../contexts/AuthContext";

// ── Icons ────────────────────────────────────────────────────────

const dashIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <rect x="1" y="1" width="6" height="6" rx="1.5" opacity="0.9" />
    <rect x="9" y="1" width="6" height="6" rx="1.5" opacity="0.45" />
    <rect x="1" y="9" width="6" height="6" rx="1.5" opacity="0.45" />
    <rect x="9" y="9" width="6" height="6" rx="1.5" opacity="0.9" />
  </svg>
);
const folderIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <path d="M1.5 13 L1.5 7 L5 5 L8.5 7 L8.5 13 Z" opacity="0.9" />
    <path d="M8.5 13 L8.5 5 L14 3 L14 13 Z" opacity="0.45" />
    <rect x="1" y="13" width="14" height="1.2" rx="0.6" opacity="0.5" />
  </svg>
);
const usersIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <circle cx="8" cy="5" r="3" opacity="0.9" />
    <path d="M3 13 Q4 9 8 9 Q12 9 13 13 Z" opacity="0.6" />
  </svg>
);
const cartIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <rect x="2" y="5" width="12" height="9" rx="1" opacity="0.2" />
    <rect
      x="2"
      y="5"
      width="12"
      height="9"
      rx="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.6"
    />
    <path
      d="M4 5 L4 3 C4 1.5 6 1 8 1 C10 1 12 1.5 12 3 L12 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.7"
    />
  </svg>
);
const inventoryIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <rect x="3" y="8" width="4" height="6" rx="0.5" opacity="0.8" />
    <rect x="9" y="4" width="4" height="10" rx="0.5" opacity="0.5" />
    <rect x="3" y="2" width="10" height="2" rx="0.5" opacity="0.2" />
  </svg>
);
const reportIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <rect x="3" y="1" width="10" height="14" rx="1" opacity="0.15" />
    <rect
      x="3"
      y="1"
      width="10"
      height="14"
      rx="1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.6"
    />
    <rect x="5" y="4" width="6" height="1" rx="0.5" opacity="0.8" />
    <rect x="5" y="7" width="4" height="1" rx="0.5" opacity="0.8" />
  </svg>
);
const gearIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <circle cx="8" cy="8" r="3" opacity="0.8" />
    <path
      d="M8 2 L8 4 M8 12 L8 14 M2 8 L4 8 M12 8 L14 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />
  </svg>
);

const fileIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <path
      d="M3 2 C3 1.4 3.4 1 4 1 L9 1 L13 5 L13 14 C13 14.6 12.6 15 12 15 L4 15 C3.4 15 3 14.6 3 14 Z"
      opacity="0.15"
    />
    <path
      d="M3 2 C3 1.4 3.4 1 4 1 L9 1 L13 5 L13 14 C13 14.6 12.6 15 12 15 L4 15 C3.4 15 3 14.6 3 14 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.6"
    />
    <path d="M9 1 L9 5 L13 5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
  </svg>
);
const chartIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <rect x="2" y="8" width="3" height="6" rx="0.5" opacity="0.8" />
    <rect x="6.5" y="4" width="3" height="10" rx="0.5" opacity="0.5" />
    <rect x="11" y="2" width="3" height="12" rx="0.5" opacity="0.9" />
  </svg>
);
const shieldIcon = (
  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="currentColor">
    <path d="M8 1 L14 4 L14 9 C14 12 8 15 8 15 C8 15 2 12 2 9 L2 4 Z" opacity="0.15" />
    <path
      d="M8 1 L14 4 L14 9 C14 12 8 15 8 15 C8 15 2 12 2 9 L2 4 Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.7"
    />
    <path
      d="M6 8 L7.5 9.5 L10 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);

// ── Nav Definitions ────────────────────────────────────────────────────────

const GLOBAL_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: dashIcon },
  { to: "/projects", label: "Projects", icon: folderIcon },
  { to: "/employees", label: "Employees", icon: usersIcon },
  { to: "/vendors", label: "Vendors", icon: usersIcon },
  { to: "/subcontractors", label: "Subcontractors", icon: usersIcon },
  { to: "/vehicles", label: "Vehicles", icon: cartIcon },
  { to: "/reports", label: "Reports", icon: reportIcon },
  { to: "/analytics", label: "Employee Analytics", icon: chartIcon },
  { to: "/settings", label: "Settings", icon: gearIcon },
];

const getProjectNav = (projectId: string, role?: string) => {
  if (role === "supervisor") {
    return [
      {
        subLabel: "Workforce",
        items: [
          {
            to: `/projects/${projectId}/supervisors`,
            label: "Supervisor Check-In",
            icon: usersIcon,
          },
          {
            to: `/projects/${projectId}/labour`,
            label: "Daily Labour Attendance",
            icon: usersIcon,
          },
        ],
      },
      {
        subLabel: "Inventory & Logistics",
        items: [
          {
            to: `/projects/${projectId}/logistics`,
            label: "Logistics (Load & KM)",
            icon: inventoryIcon,
          },
        ],
      },
    ];
  }

  return [
    {
      subLabel: "Overview",
      items: [{ to: `/projects/${projectId}`, label: "Project Overview", icon: dashIcon }],
    },
    {
      subLabel: "Project Management",
      items: [
        { to: `/projects/${projectId}/subcontractors`, label: "Sub-Contractors", icon: usersIcon },
      ],
    },
    {
      subLabel: "Finance & Billing",
      items: [
        { to: `/projects/${projectId}/bills`, label: "Bills", icon: fileIcon },
        { to: `/projects/${projectId}/payments`, label: "Vendor Payments", icon: cartIcon },
        { to: `/projects/${projectId}/expenses`, label: "Weekly Expenses", icon: reportIcon },
      ],
    },
    {
      subLabel: "Site Operations",
      items: [
        { to: `/projects/${projectId}/supervisors`, label: "Supervisor Attendance", icon: usersIcon },
        { to: `/projects/${projectId}/labour`, label: "Daily Labour Attendance", icon: usersIcon },
        {
          to: `/projects/${projectId}/logistics`,
          label: "Logistics (Load & KM)",
          icon: inventoryIcon,
        },
      ],
    },
    {
      subLabel: "Reports",
      items: [
        { to: `/projects/${projectId}/reports`, label: "Reports", icon: chartIcon },
        { to: `/projects/${projectId}/analytics`, label: "Employee Analytics", icon: chartIcon },
      ],
    },
  ];
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["/organizations", "/employees"],
  operations_admin: [
    "/dashboard",
    "/projects",
    "/employees",
    "/vendors",
    "/subcontractors",
    "/vehicles",
    "/settings",
    "/reports",
    "/analytics",
    "Overview",
    "Project Management",
    "Finance & Billing",
    "Site Operations",
    "Reports",
  ],
  supervisor: ["/projects", "Workforce", "Inventory & Logistics"],
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { projectId, project } = useProject();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate({ to: "/", replace: true });
  };

  const activeRole = user?.role ?? "supervisor";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const hasPermissionForRole = (role: string, item: string) => {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return perms.includes("*") || perms.some((p) => item.startsWith(p) || item === p);
  };

  const hasPermission = (item: string) => hasPermissionForRole(activeRole, item);

  const activeAccount = {
    color: "var(--primary)",
    initials: "",
    name: user?.name ?? "",
    title: ROLE_LABELS[activeRole],
  };

  const projectNav = projectId
    ? getProjectNav(projectId, activeRole).filter((g) => hasPermission(g.subLabel))
    : [];
  const workspaceHome = projectId
    ? (projectNav[0]?.items[0]?.to ?? "/projects")
    : homeForRole(activeRole);

  // Determine current active item for breadcrumbs
  let currentNavLabel = "";
  if (projectId) {
    for (const group of projectNav) {
      for (const item of group.items) {
        if (
          pathname === item.to ||
          (item.to !== `/projects/${projectId}` && pathname.startsWith(item.to))
        ) {
          currentNavLabel = item.label;
        }
      }
    }
  } else {
    for (const item of GLOBAL_NAV) {
      if (pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to))) {
        currentNavLabel = item.label;
      }
    }
  }

  return (
    <div className="app-shell flex min-h-screen bg-background text-foreground">
      <a className="skip-link" href="#workspace-content">
        Skip to content
      </a>
      {mobileNavOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        aria-label={projectId ? "Project navigation" : "Workspace navigation"}
        className={`workspace-sidebar ${mobileNavOpen ? "is-open" : ""}`}
      >
        {/* ─────── Logo ─────── */}
        <button
          className="mobile-nav-close"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        >
          <X size={18} />
        </button>
        <div className="px-4 pt-5 pb-4">
          <Link to={workspaceHome} className="flex items-center gap-3 group">
            <img
              src="/logo.png"
              alt="Kenetic Logo"
              className="size-9 rounded-xl object-cover shrink-0 shadow-sm transition-transform group-hover:scale-105 border border-border/40"
            />
            <div className="leading-none">
              <div
                className="font-display font-bold text-[16px] tracking-tight"
                style={{ letterSpacing: "-0.025em" }}
              >
                KENETIC
              </div>
              <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-muted-foreground block mt-0.5">
                Construction ERP
              </span>
            </div>
          </Link>
        </div>

        {/* ─────── Navigation ─────── */}
        <nav
          key={projectId ?? "global"}
          className="flex-1 min-h-0 overflow-y-auto px-3 pb-2 scrollbar-thin"
        >
          {/* Admin Navigation (Software Provider) */}
          {!projectId && activeRole === "super_admin" && (
            <div className="mb-4 mt-2">
              <div className="px-2 py-1.5 mb-1">
                <span className="text-[11px] font-sans font-semibold text-primary">
                  Software Provider
                </span>
              </div>
              <div className="px-2 py-1 mb-1 mt-3">
                <span className="text-[10px] font-sans font-semibold text-muted-foreground">
                  Platform
                </span>
              </div>
              <div className="space-y-0.5">
                <Link
                  to="/organizations"
                  className={
                    "flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 " +
                    (pathname.startsWith("/organizations")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/70")
                  }
                >
                  <span
                    className={
                      pathname.startsWith("/organizations")
                        ? "text-primary"
                        : "text-muted-foreground/80"
                    }
                  >
                    {folderIcon}
                  </span>
                  Organizations
                </Link>
                <Link
                  to="/employees"
                  className={
                    "flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 " +
                    (pathname.startsWith("/employees")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/70")
                  }
                >
                  <span
                    className={
                      pathname.startsWith("/employees")
                        ? "text-primary"
                        : "text-muted-foreground/80"
                    }
                  >
                    {usersIcon}
                  </span>
                  User Accounts
                </Link>
              </div>
            </div>
          )}

          {/* Global Navigation */}
          {!projectId && activeRole === "operations_admin" && (
            <div className="mb-4">
              <div className="px-2 py-1.5 mb-1">
                <span className="text-[10px] font-sans font-semibold text-muted-foreground">
                  Global
                </span>
              </div>
              <div className="space-y-0.5">
                {GLOBAL_NAV.filter((item) => hasPermission(item.to)).map((item) => {
                  const active =
                    pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={
                        "flex items-center gap-2.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150 " +
                        (active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/70")
                      }
                    >
                      <span className={active ? "text-primary" : "text-muted-foreground/80"}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Supervisor Header */}
          {!projectId && activeRole === "supervisor" && (
            <div className="px-2 py-1.5 mb-2 mt-4">
              <Link to="/projects" className="text-[11px] font-sans font-semibold text-primary">
                My Projects
              </Link>
            </div>
          )}

          {/* Project Navigation */}
          {projectId && (
            <div className="mb-4 animate-fade-in">
              {/* Project Sub-modules */}
              <div className="space-y-3 pl-1">
                {projectNav.map((group) => (
                  <div key={group.subLabel}>
                    <button
                      onClick={() => toggleGroup(group.subLabel)}
                      aria-expanded={!collapsedGroups[group.subLabel]}
                      className="w-full flex items-center justify-between px-2 py-1 mb-0.5 group/subheader rounded-md hover:bg-secondary/40 transition-colors"
                    >
                      <span className="text-[10px] font-sans font-semibold text-muted-foreground">
                        {group.subLabel}
                      </span>
                      {group.subLabel !== "Overview" && group.subLabel !== "Reports" && (
                        <ChevronDown
                          className={`size-3 text-muted-foreground/50 transition-transform ${collapsedGroups[group.subLabel] ? "-rotate-90" : ""}`}
                        />
                      )}
                    </button>
                    {!collapsedGroups[group.subLabel] && (
                      <div className="space-y-0.5 pl-1.5">
                        {group.items.map((item) => {
                          const active =
                            pathname === item.to ||
                            (item.to !== `/projects/${projectId}` && pathname.startsWith(item.to));
                          return (
                            <Link
                              key={item.to}
                              to={item.to}
                              className={
                                "flex items-center gap-2.5 px-2 py-1.5 text-[12.5px] font-medium rounded-lg transition-all duration-150 " +
                                (active
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/70")
                              }
                            >
                              <span
                                className={active ? "text-primary" : "text-muted-foreground/60"}
                              >
                                {item.icon}
                              </span>
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!projectId && activeRole !== "super_admin" && (
            <div className="px-3 py-6 mt-6 border-t border-border border-dashed text-center">
              <p className="text-xs text-muted-foreground">
                Select a project from Portfolio to view project-specific modules.
              </p>
              <Link
                to="/projects"
                className="mt-3 inline-flex items-center justify-center bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Go to Portfolio
              </Link>
            </div>
          )}
        </nav>

        {/* ─────── Account card ─────── */}
        <div className="px-3 pb-4 relative space-y-1 shrink-0 min-w-0">
          {projectId && (
            <Link
              to="/projects"
              onClick={() => setMobileNavOpen(false)}
              className="w-full mb-3 px-3 py-2.5 text-sm font-semibold text-primary border border-border rounded-lg flex items-center gap-2 hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="size-4" />
              Exit project
            </Link>
          )}
          <div className="w-full min-w-0 p-3 bg-secondary/30 rounded-xl border border-border text-left">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="size-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: activeAccount.color }}
              >
                {user
                  ? user.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  : activeAccount.initials}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  title={user?.name ?? activeAccount.name}
                  className="text-xs font-semibold leading-tight truncate text-foreground"
                >
                  {user?.name ?? activeAccount.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {ROLE_LABELS[activeRole]}
                </p>
                {user?.email && (
                  <p title={user.email} className="text-[10px] text-muted-foreground truncate">
                    {user.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg flex items-center gap-2 transition-colors"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main
        id="workspace-content"
        tabIndex={-1}
        className="workspace-main flex-1 min-w-0 flex flex-col h-screen overflow-y-auto"
      >
        {/* Workspace navigation */}
        <div className="workspace-topbar flex-wrap">
          <button
            className="mobile-nav-toggle"
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
            aria-controls="workspace-navigation"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            to={workspaceHome}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {projectId ? "Project workspace" : "Workspace"}
          </Link>
          {projectId && project && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <span title={project.name} className="font-semibold text-primary truncate max-w-[200px]">
                {project.name}
              </span>
            </>
          )}
          {currentNavLabel &&
            currentNavLabel !== "Portfolio" &&
            currentNavLabel !== "Project Overview" && (
              <>
                <ChevronRight className="size-3.5 text-muted-foreground/50" />
                <span className="text-foreground">{currentNavLabel}</span>
              </>
            )}
          {currentNavLabel === "Project Overview" && (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/50" />
              <span className="text-foreground">Overview</span>
            </>
          )}
        </div>

        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">{eyebrow}</p>
          </div>
        )}
        <h1
          className="text-2xl font-display font-semibold tracking-tight"
          style={{ letterSpacing: "-0.025em" }}
        >
          {title}
        </h1>
      </div>
      {actions ? <div className="page-actions flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

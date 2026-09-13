export type AppRole = "super_admin" | "operations_admin" | "supervisor";
export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  operations_admin: "Operations Admin",
  supervisor: "Supervisor",
};
export function parseIdentity(payload: Record<string, unknown>): {
  sub: string;
  orgId: string;
  role: AppRole;
} {
  const groups = payload["cognito:groups"];
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const orgId = typeof payload["custom:org_id"] === "string" && payload["custom:org_id"]
    ? payload["custom:org_id"]
    : "default-org";

  let role: AppRole = "operations_admin";
  if (Array.isArray(groups) && groups.length > 0 && Object.hasOwn(ROLE_LABELS, String(groups[0]))) {
    role = groups[0] as AppRole;
  }

  return { sub, orgId, role };
}
export function homeForRole(role: AppRole): "/organizations" | "/dashboard" | "/projects" {
  return role === "super_admin"
    ? "/organizations"
    : role === "supervisor"
      ? "/projects"
      : "/dashboard";
}
export function canAccessRoute(role: AppRole, pathname: string): boolean {
  if (role === "super_admin") return ["/organizations", "/employees"].includes(pathname);
  if (role === "operations_admin") return pathname !== "/organizations";
  return (
    pathname === "/projects" ||
    /^\/projects\/[^/]+\/(supervisors|labour|payroll|logistics|materials|issues|inspections|equipment)$/.test(
      pathname,
    )
  );
}

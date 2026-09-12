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
  if (
    !Array.isArray(groups) ||
    groups.length !== 1 ||
    !Object.hasOwn(ROLE_LABELS, String(groups[0])) ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    typeof payload["custom:org_id"] !== "string" ||
    !payload["custom:org_id"]
  ) {
    throw new Error(
      "Your account needs an organization and one assigned application role. Contact your administrator.",
    );
  }
  return { sub: payload.sub, orgId: payload["custom:org_id"], role: groups[0] as AppRole };
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
    /^\/projects\/[^/]+\/(supervisors|labour|logistics|materials|issues|inspections|equipment)$/.test(
      pathname,
    )
  );
}

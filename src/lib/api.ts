/**
 * src/lib/api.ts
 * Central API client for the Kinetic backend.
 * Automatically attaches the Cognito ID token to every request.
 * Throws on non-2xx responses. Redirects to /login on 401.
 */

import { refreshSession } from "./auth";

const BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string) ?? "").replace(/\/+$/, "");

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await refreshSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (!token) {
    window.location.href = "/login";
    throw new Error("Your session expired. Sign in again.");
  }
  headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(20_000),
  });

  if (res.status === 401) {
    // Token expired and refresh failed — boot to login
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();

  if (!res.ok) {
    const msg = json?.error?.message ?? `API error ${res.status}`;
    throw new Error(msg);
  }

  // Backend wraps in { success: true, data: ... }
  return (json.data ?? json) as T;
}

// ── HTTP verbs ────────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ── Typed endpoint helpers ────────────────────────────────────────────────────

// Super Admin
export const orgApi = {
  list: () => api.get<Organization[]>("/super-admin/organizations"),
  get: (orgId: string) => api.get<Organization>(`/super-admin/organizations/${orgId}`),
  create: (body: CreateOrgBody) => api.post<Organization>("/super-admin/organizations", body),
  update: (orgId: string, body: Partial<Organization>) =>
    api.put<Organization>(`/super-admin/organizations/${orgId}`, body),
  updateStatus: (orgId: string, status: string) =>
    api.patch<Organization>(`/super-admin/organizations/${orgId}/status`, { status }),
};

export const employeeApi = {
  list: () => api.get<Employee[]>("/employees"),
  get: (id: string) => api.get<Employee>(`/employees/${encodeURIComponent(id)}`),
  create: (body: CreateEmployeeBody) => api.post<Employee>("/employees", body),
  update: (id: string, body: Partial<Employee>, orgId?: string) =>
    api.put<Employee>(
      `/employees/${encodeURIComponent(id)}${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""}`,
      body,
    ),
  invite: (id: string, orgId?: string) =>
    api.post<Employee>(
      `/employees/${encodeURIComponent(id)}/invitation${orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""}`,
      {},
    ),
};

export const metricsApi = {
  get: () => api.get<Metrics>("/super-admin/metrics"),
};

// Dashboard
export const dashboardApi = {
  analytics: () => api.get<DashboardAnalytics>("/dashboard/analytics"),
};

// Projects
export const projectApi = {
  list: () => api.get<Project[]>("/projects"),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (body: CreateProjectBody) => api.post<Project>("/projects", body),
  update: (id: string, body: Partial<Project>) => api.put<Project>(`/projects/${id}`, body),
  delete: (id: string) => api.delete<{ deleted: boolean }>(`/projects/${id}`),
};

// Vendors
export const vendorApi = {
  list: () => api.get<Vendor[]>("/vendors"),
  get: (id: string) => api.get<Vendor>(`/vendors/${id}`),
  create: (body: CreateVendorBody) => api.post<Vendor>("/vendors", body),
  update: (id: string, body: Partial<Vendor>) => api.put<Vendor>(`/vendors/${id}`, body),
};

// Inventory
export const inventoryApi = {
  list: () => api.get<InventoryItem[]>("/inventory"),
  create: (body: CreateInventoryBody) => api.post<InventoryItem>("/inventory", body),
  update: (id: string, body: Partial<InventoryItem>) =>
    api.put<InventoryItem>(`/inventory/${id}`, body),
};

// Payments
export const paymentApi = {
  list: () => api.get<VendorPayment[]>("/payments"),
  create: (body: CreatePaymentBody) => api.post<VendorPayment>("/payments", body),
  updateStatus: (id: string, status: string) =>
    api.patch<VendorPayment>(`/payments/${id}/status`, { status }),
};

// Finance — project-scoped
export const financeApi = {
  listBills: (projectId: string) => api.get<Bill[]>(`/projects/${projectId}/bills`),
  createBill: (projectId: string, body: CreateBillBody) =>
    api.post<Bill>(`/projects/${projectId}/bills`, body),
  listExpenses: (projectId: string) => api.get<Expense[]>(`/projects/${projectId}/expenses`),
  createExpense: (projectId: string, body: CreateExpenseBody) =>
    api.post<Expense>(`/projects/${projectId}/expenses`, body),
  approveExpense: (projectId: string, expenseId: string, status: string) =>
    api.patch<Expense>(`/projects/${projectId}/expenses/${expenseId}/status`, { status }),
};

// Reports
export const reportsApi = {
  executive: () => api.get<ExecutiveReport>("/reports/executive"),
};

// Settings
export const settingsApi = {
  get: () => api.get<Settings>("/settings"),
  update: (body: Partial<Settings>) => api.put<Settings>("/settings", body),
};

// Domain APIs — one frontend client per consolidated backend Lambda.
// Records remain flexible while each screen's form model is finalized.
export type DomainRecord = Record<string, unknown>;

export const projectCommercialApi = {
  listBoq: (projectId: string) => api.get<DomainRecord[]>(`/projects/${projectId}/boq`),
  createBoq: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/boq`, body),
  updateBoq: (projectId: string, id: string, body: DomainRecord) =>
    api.put<DomainRecord>(`/projects/${projectId}/boq/${id}`, body),
  deleteBoq: (projectId: string, id: string) => api.delete(`/projects/${projectId}/boq/${id}`),
  listSubcontractors: (projectId: string) =>
    api.get<DomainRecord[]>(`/projects/${projectId}/subcontractors`),
  createSubcontractor: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/subcontractors`, body),
  updateSubcontractor: (projectId: string, id: string, body: DomainRecord) =>
    api.put<DomainRecord>(`/projects/${projectId}/subcontractors/${id}`, body),
  listMilestones: (projectId: string) =>
    api.get<DomainRecord[]>(`/projects/${projectId}/milestones`),
  createMilestone: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/milestones`, body),
  updateMilestone: (projectId: string, id: string, body: DomainRecord) =>
    api.put<DomainRecord>(`/projects/${projectId}/milestones/${id}`, body),
  deleteMilestone: (projectId: string, id: string) =>
    api.delete(`/projects/${projectId}/milestones/${id}`),
};

export const workforceApi = {
  checkIn: (body: DomainRecord) => api.post<DomainRecord>("/supervisor/attendance/check-in", body),
  checkOut: (body: DomainRecord) =>
    api.post<DomainRecord>("/supervisor/attendance/check-out", body),
  attendanceHistory: (projectId: string) =>
    api.get<DomainRecord[]>(
      `/supervisor/attendance/history?projectId=${encodeURIComponent(projectId)}`,
    ),
  listLabour: (projectId: string) =>
    api.get<DomainRecord[]>(
      `/supervisor/labour/attendance?projectId=${encodeURIComponent(projectId)}`,
    ),
  recordLabour: (body: DomainRecord) =>
    api.post<DomainRecord>("/supervisor/labour/attendance", body),
};

export const fieldOperationsApi = {
  listDpr: (projectId: string) =>
    api.get<DomainRecord[]>(`/supervisor/dpr?projectId=${encodeURIComponent(projectId)}`),
  getDpr: (projectId: string, id: string) =>
    api.get<DomainRecord>(
      `/supervisor/dpr/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`,
    ),
  createDpr: (body: DomainRecord) => api.post<DomainRecord>("/supervisor/dpr", body),
  listMaterials: (projectId: string) =>
    api.get<DomainRecord[]>(
      `/supervisor/materials/stock?projectId=${encodeURIComponent(projectId)}`,
    ),
  createGrn: (body: DomainRecord) => api.post<DomainRecord>("/supervisor/materials/grn", body),
  createIndent: (body: DomainRecord) =>
    api.post<DomainRecord>("/supervisor/materials/indents", body),
  listLogistics: (projectId: string) =>
    api.get<DomainRecord[]>(
      `/supervisor/logistics/trips?projectId=${encodeURIComponent(projectId)}`,
    ),
  createLogistics: (body: DomainRecord) =>
    api.post<DomainRecord>("/supervisor/logistics/trips", body),
};

export const siteControlApi = {
  listIssues: (projectId: string) => api.get<DomainRecord[]>(`/projects/${projectId}/issues`),
  createIssue: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/issues`, body),
  updateIssue: (projectId: string, id: string, body: DomainRecord) =>
    api.patch<DomainRecord>(`/projects/${projectId}/issues/${id}`, body),
  listInspections: (projectId: string) =>
    api.get<DomainRecord[]>(`/projects/${projectId}/inspections`),
  createInspection: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/inspections`, body),
  updateInspection: (projectId: string, id: string, body: DomainRecord) =>
    api.patch<DomainRecord>(`/projects/${projectId}/inspections/${id}`, body),
  listEquipment: (projectId: string) => api.get<DomainRecord[]>(`/projects/${projectId}/equipment`),
  createEquipment: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/equipment`, body),
  updateEquipment: (projectId: string, id: string, body: DomainRecord) =>
    api.put<DomainRecord>(`/projects/${projectId}/equipment/${id}`, body),
};

export const documentControlApi = {
  listDrawings: (projectId: string) => api.get<DomainRecord[]>(`/projects/${projectId}/drawings`),
  createDrawing: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/drawings`, body),
  deleteDrawing: (projectId: string, id: string) =>
    api.delete(`/projects/${projectId}/drawings/${id}`),
  listDocuments: (projectId: string) => api.get<DomainRecord[]>(`/projects/${projectId}/documents`),
  createDocument: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/documents`, body),
  deleteDocument: (projectId: string, id: string) =>
    api.delete(`/projects/${projectId}/documents/${id}`),
};

export const warehouseApi = {
  listGrn: () => api.get<DomainRecord[]>("/warehouse/grn"),
  createGrn: (body: DomainRecord) => api.post<DomainRecord>("/warehouse/grn", body),
  listIssueVouchers: () => api.get<DomainRecord[]>("/warehouse/issue-vouchers"),
  createIssueVoucher: (body: DomainRecord) =>
    api.post<DomainRecord>("/warehouse/issue-vouchers", body),
};

export const financeDomainApi = {
  getBill: (projectId: string, id: string) =>
    api.get<DomainRecord>(`/projects/${projectId}/bills/${id}`),
  updateBillStatus: (projectId: string, id: string, status: string) =>
    api.patch<DomainRecord>(`/projects/${projectId}/bills/${id}/status`, { status }),
  listProjectPayments: (projectId: string) =>
    api.get<DomainRecord[]>(`/projects/${projectId}/payments`),
  listPayments: () => api.get<DomainRecord[]>("/payments"),
  createPayment: (body: DomainRecord) => api.post<DomainRecord>("/payments", body),
  updatePayment: (id: string, status: string) =>
    api.patch<DomainRecord>(`/payments/${id}/status`, { status }),
};

export const governanceApi = {
  listPayroll: (projectId: string) => api.get<DomainRecord[]>(`/projects/${projectId}/payroll`),
  disbursePayroll: (projectId: string, body: DomainRecord) =>
    api.post<DomainRecord>(`/projects/${projectId}/payroll/disburse`, body),
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Organization {
  orgId: string;
  name: string;
  type: string;
  status: string;
  plan: string;
  taxId: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  activeProjectsCount: number;
  activeUsersCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface CreateOrgBody {
  name: string;
  type: string;
  plan: string;
  taxId?: string;
  contactEmail?: string;
  contactPhone?: string;
  adminEmail?: string;
  adminName?: string;
}

export interface Employee {
  employeeId: string;
  name: string;
  role: string;
  department: string;
  status: string;
  email: string;
  phone: string;
  location: string;
  orgId?: string;
  invitationStatus?: string;
  createdAt?: string;
}
export interface CreateEmployeeBody {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  orgId?: string;
}

export interface Metrics {
  totalOrganizations: number;
  activeOrganizations: number;
  totalEmployees: number;
  activeEmployees: number;
}

export interface DashboardAnalytics {
  totalProjects: number;
  activeProjects: number;
  totalBudget?: number;
  totalSpent?: number;
  pendingApprovals?: number;
  stockAlerts?: number;
}

export interface Project {
  projectId: string;
  name: string;
  status: string;
  budget: number;
  spent: number;
  location: string;
  startDate: string;
  endDate: string;
  orgId?: string;
  supervisorIds?: string[];
  createdAt?: string;
}
export interface CreateProjectBody {
  name: string;
  budget: number;
  location: string;
  startDate: string;
  endDate: string;
  orgId?: string;
  phase?: string;
  progress?: number;
  image?: string;
  supervisor?: string;
}

export interface Vendor {
  vendorId: string;
  name: string;
  type: string;
  status: string;
  rating?: number;
  email: string;
  phone: string;
  badge?: string;
  activeContracts?: number;
  createdAt?: string;
}
export interface CreateVendorBody {
  name: string;
  type: string;
  email: string;
  phone: string;
}

export interface InventoryItem {
  itemId: string;
  name: string;
  category: string;
  totalStock: string;
  deployedStock?: string;
  estimatedValue?: string;
  status: string;
  unit?: string;
  createdAt?: string;
}
export interface CreateInventoryBody {
  name: string;
  category: string;
  totalStock: string;
  unit?: string;
  status?: string;
}

export interface VendorPayment {
  paymentId: string;
  vendorId?: string;
  vendorName?: string;
  amount: number;
  status: string;
  projectId?: string;
  description?: string;
  createdAt?: string;
}
export interface CreatePaymentBody {
  vendorId: string;
  amount: number;
  projectId?: string;
  description?: string;
}

export interface Bill {
  billId: string;
  projectId: string;
  billNumber: string;
  type: string;
  clientOrContractor: string;
  date: string;
  grossAmount: number;
  netPayable: number;
  status: string;
  createdAt?: string;
}
export interface CreateBillBody {
  billNumber: string;
  clientOrContractor: string;
  grossAmount: number;
  netPayable?: number;
  type?: string;
  date?: string;
  retentionDeduction?: number;
  tdsDeduction?: number;
}

export interface Expense {
  expenseId?: string;
  supervisorId?: string;
  projectId: string;
  category: string;
  description: string;
  amount: number;
  status: string;
  date?: string;
  submittedBy?: string;
  createdAt?: string;
}
export interface CreateExpenseBody {
  category: string;
  description: string;
  amount: number;
  projectId?: string;
  submittedBy?: string;
  date?: string;
}

export interface ExecutiveReport {
  totalRevenue?: number;
  totalExpenses?: number;
  projectSummaries?: Array<{
    projectId: string;
    name: string;
    budget: number;
    spent: number;
    status: string;
  }>;
  vendorSummaries?: Array<{ vendorId: string; name: string; totalPaid: number }>;
  generatedAt?: string;
}

export interface Settings {
  settingKey?: string;
  companyName?: string;
  cin?: string;
  primaryEmail?: string;
  phone?: string;
  address?: string;
  plan?: string;
  [key: string]: unknown;
}

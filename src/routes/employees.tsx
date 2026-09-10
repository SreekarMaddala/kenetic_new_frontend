import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, UserCheck, UserX, Search, Filter, MoreHorizontal, Mail, Phone, Plus } from "lucide-react";
import { employeeApi, type Employee } from "../lib/api";

export const Route = createFileRoute("/employees")({
  component: EmployeesPage,
});

function MetricCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`p-4 rounded-xl border border-border bg-[color:var(--surface)] flex items-center gap-4`}>
      <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-display font-bold text-foreground">{value}</div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeApi.list(),
    retry: 1,
  });

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || emp.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = departmentFilter === "All" || emp.department === departmentFilter;
    return matchSearch && matchDept;
  });

  const departments = ["All", ...Array.from(new Set(employees.map(e => e.department)))];

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full space-y-4 animate-fade-up">
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-fade-up">
      <PageHeader
        title="Employee Directory"
        eyebrow="Global Workspace"
        actions={
          <button className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="size-4" /> Add Employee
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Total Staff" value={employees.length} icon={<Users className="size-5" />} color="bg-blue-500/10 text-blue-600" />
        <MetricCard label="HQ Personnel" value={employees.filter(e => e.location.includes("HQ")).length} icon={<Building2 className="size-5" />} color="bg-purple-500/10 text-purple-600" />
        <MetricCard label="Active on Site" value={employees.filter(e => !e.location.includes("HQ") && e.status === "Active").length} icon={<UserCheck className="size-5" />} color="bg-emerald-500/10 text-emerald-600" />
        <MetricCard label="On Leave" value={employees.filter(e => e.status === "On Leave").length} icon={<UserX className="size-5" />} color="bg-orange-500/10 text-orange-600" />
      </div>

      <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 justify-between items-center bg-secondary/20">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full sm:w-auto h-9 pl-9 pr-8 rounded-md bg-[color:var(--surface)] border border-border text-sm focus:outline-none focus:border-primary/50 appearance-none"
              >
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground bg-secondary/30">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Role & Dept</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Location</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.map((emp) => (
                <tr key={emp.employeeId} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {emp.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{emp.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{emp.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{emp.role}</div>
                    <div className="text-xs text-muted-foreground">{emp.department}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail className="size-3" /> {emp.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="size-3" /> {emp.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-foreground">
                    {emp.location}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      emp.status === "Active" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                      emp.status === "On Leave" ? "bg-orange-500/10 text-orange-600 border border-orange-500/20" :
                      "bg-gray-500/10 text-gray-600 border border-gray-500/20"
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md opacity-0 group-hover:opacity-100 transition-all">
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No employees found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

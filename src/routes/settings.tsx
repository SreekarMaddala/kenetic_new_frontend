import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";
import { Save, Building2, CreditCard, Bell, Shield, Blocks } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type Settings } from "../lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("company");
  const [formData, setFormData] = useState<Partial<Settings>>({});

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
    retry: 1,
  });

  // Sync API data into form
  useEffect(() => {
    if (settings) {
      const {
        orgId,
        settingKey,
        createdAt,
        updatedAt,
        createdBy,
        projectId,
        version,
        ...editable
      } = settings;
      setFormData(editable);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (body: Partial<Settings>) => settingsApi.update(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved successfully.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => saveMutation.mutate(formData);

  const TABS = [
    { id: "company", label: "Company Profile", icon: <Building2 className="size-4" /> },
    { id: "billing", label: "Billing & Plans", icon: <CreditCard className="size-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="size-4" /> },
    { id: "security", label: "Security & Roles", icon: <Shield className="size-4" /> },
    { id: "integrations", label: "Integrations", icon: <Blocks className="size-4" /> },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      <PageHeader
        title="Global Settings"
        eyebrow="Global Workspace"
        actions={
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="size-4" /> {saveMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[color:var(--surface)] rounded-xl border border-border shadow-sm p-8 min-h-[500px]">
          {activeTab === "company" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Company Profile</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage your company's identity and global contact information.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Kinetic Builders Pvt Ltd."
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Registration Number (CIN)
                  </label>
                  <input
                    type="text"
                    defaultValue="U45201MH2005PTC152345"
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Primary Email
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@kineticbuilders.com"
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Headquarters Phone
                  </label>
                  <input
                    type="text"
                    defaultValue="+91 22 1234 5678"
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold text-foreground block">
                    Registered Address
                  </label>
                  <textarea
                    defaultValue="14th Floor, Lodha Excelus, New Cuffe Parade, Mumbai, Maharashtra 400037"
                    className="w-full p-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 h-24 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">Billing & Subscription Plan</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Manage your Kinetic ERP subscription and payment methods.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-foreground">Enterprise Tier</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlimited Projects. 50 Admin Users. Unlimited Supervisors.
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-2xl text-foreground">
                    ₹2,50,000<span className="text-sm font-medium text-muted-foreground">/yr</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Next billing date: 01 Apr 2027
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== "company" && activeTab !== "billing" && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60 min-h-[300px]">
              <div className="size-16 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                <Blocks className="size-6" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Settings Category Coming Soon</h4>
                <p className="text-xs text-muted-foreground max-w-xs mt-1">
                  This configuration panel is currently locked in the demo environment.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

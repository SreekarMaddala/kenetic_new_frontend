import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";
import { toast } from "sonner";
import invoiceScan from "../../../assets/invoice-scan.jpg";

export const Route = createFileRoute("/projects/$projectId/bills")({
  head: () => ({
    meta: [
      { title: "Vendor Bills — Kinetic" },
      {
        name: "description",
        content:
          "AI-powered invoice extraction with GST, vendor, and line-item parsing for construction vendor bills.",
      },
    ],
  }),
  component: BillsPage,
});

const bills = [
  {
    id: "1",
    vendor: "UltraTech Cement Ltd.",
    invoice: "UTC/2845",
    amount: "₹12,42,000",
    amountVal: "₹12,42,000.00",
    gst: "18%",
    gstin: "27AAACU1234J1Z5",
    date: "08 Aug 2025",
    status: "AI Verified",
    conf: "98.2%",
    lineItems: ["Portland Cement 53G (420 Bags)", "Logistics / Unloading Charges"],
  },
  {
    id: "2",
    vendor: "Jindal Steel & Power",
    invoice: "JSP-9821",
    amount: "₹8,40,000",
    amountVal: "₹8,40,000.00",
    gst: "18%",
    gstin: "07BBACT5678K2Z9",
    date: "05 Aug 2025",
    status: "Pending Review",
    conf: "94.1%",
    lineItems: ["TMT Bars 12mm (50 Tons)", "Binding Wire (2 Tons)"],
  },
  {
    id: "3",
    vendor: "Kajaria Ceramics",
    invoice: "KC-4421",
    amount: "₹2,18,400",
    amountVal: "₹2,18,400.00",
    gst: "18%",
    gstin: "09CCBBD9012L3Z4",
    date: "01 Aug 2025",
    status: "AI Verified",
    conf: "99.0%",
    lineItems: ["Vitrified Tiles 600x600 (120 Boxes)", "Tile Adhesive (15 Bags)"],
  },
  {
    id: "4",
    vendor: "Finolex Industries",
    invoice: "FIN-1182",
    amount: "₹64,200",
    amountVal: "₹64,200.00",
    gst: "12%",
    gstin: "24DDCBE3456M5Z8",
    date: "28 Jul 2025",
    status: "Flagged",
    conf: "82.4%",
    lineItems: ["PVC Pipes 4 inch (100 Pcs)", "Fittings (Assorted)"],
  },
];

function BillsPage() {
  const [selectedBillId, setSelectedBillId] = React.useState(bills[0].id);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedBill = bills.find((b) => b.id === selectedBillId) || bills[0];

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`Invoice "${file.name}" uploaded successfully!`, {
        description: "AI processing will begin shortly.",
      });
      e.target.value = "";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <PageHeader
        eyebrow="Finance"
        title="Vendor Bill Processing"
        actions={
          <>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf,image/*"
              onChange={handleFileChange}
            />
            <button
              onClick={handleUploadClick}
              className="h-10 px-6 bg-foreground text-background rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              + Upload Invoice
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Live extraction panel */}
        <div className="lg:col-span-7">
          <div className="bg-[color:var(--surface)] rounded-xl border border-border shadow-2xl overflow-hidden ring-1 ring-black/5 animate-fade-in">
            <div className="bg-secondary px-6 py-3 border-b border-border flex justify-between items-center">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-tight">
                AI Bill Processing
              </span>
              <span className="text-[10px] font-bold text-accent px-2 py-0.5 bg-accent/10 rounded">
                {selectedBill.conf} CONFIDENCE
              </span>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-6">
              <div className="sm:w-1/3">
                <div className="aspect-[3/4] w-full bg-secondary rounded border border-border overflow-hidden">
                  <img
                    src={invoiceScan}
                    alt={`Invoice scan from ${selectedBill.vendor}`}
                    loading="lazy"
                    width={576}
                    height={768}
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <Field label="Extracted Vendor" value={selectedBill.vendor} highlight />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount" value={selectedBill.amountVal} />
                  <Field label="GSTIN" value={selectedBill.gstin} />
                  <Field label="Invoice Date" value={selectedBill.date} />
                  <Field label="Invoice #" value={selectedBill.invoice} />
                </div>
                <Field
                  label="Line Items"
                  value={
                    <div className="mt-1 space-y-1">
                      {selectedBill.lineItems.map((item, idx) => (
                        <p key={idx} className="text-xs font-medium">
                          — {item}
                        </p>
                      ))}
                    </div>
                  }
                />
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => toast.success(`Bill from ${selectedBill.vendor} approved!`)}
                    className="flex-1 py-2 bg-foreground text-background rounded text-xs font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Approve Bill
                  </button>
                  <button
                    onClick={() => toast.error(`Issue flagged for invoice ${selectedBill.invoice}`)}
                    className="px-4 py-2 border border-border rounded text-xs font-medium hover:bg-secondary transition-colors"
                  >
                    Flag Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bill list */}
        <div className="lg:col-span-5 bg-[color:var(--surface)] rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold">Recent Invoices</h3>
          </div>
          <ul className="divide-y divide-border">
            {bills.map((b) => (
              <li
                key={b.invoice}
                onClick={() => setSelectedBillId(b.id)}
                className={`px-5 py-4 flex items-center gap-3 transition-colors cursor-pointer ${
                  selectedBillId === b.id
                    ? "bg-secondary/60 border-l-2 border-l-primary"
                    : "hover:bg-secondary/40 border-l-2 border-l-transparent"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-medium text-sm truncate ${selectedBillId === b.id ? "text-foreground" : "text-foreground/80"}`}
                  >
                    {b.vendor}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {b.invoice} · GST {b.gst}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-mono text-sm font-medium ${selectedBillId === b.id ? "text-foreground" : "text-foreground/80"}`}
                  >
                    {b.amount}
                  </p>
                  <p
                    className={
                      "text-[10px] font-mono mt-0.5 " +
                      (b.status === "Flagged"
                        ? "text-primary"
                        : b.status === "Pending Review"
                          ? "text-yellow-700"
                          : "text-accent")
                    }
                  >
                    {b.status} · {b.conf}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "p-3 rounded-md border " +
        (highlight ? "bg-accent/5 border-accent/20" : "bg-secondary border-border")
      }
    >
      <p
        className={
          "text-[10px] font-mono uppercase " + (highlight ? "text-accent" : "text-muted-foreground")
        }
      >
        {label}
      </p>
      {typeof value === "string" ? <p className="text-sm font-semibold">{value}</p> : value}
    </div>
  );
}

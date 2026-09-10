import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "./projects/$projectId/payments";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Global Vendor Payments — Kinetic" },
      { name: "description", content: "Global vendor payments and expenses across all projects." },
    ],
  }),
  component: PaymentsPage,
});

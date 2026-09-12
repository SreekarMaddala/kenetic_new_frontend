const fs = require("fs");
const path = require("path");

const globalRoutes = [
  "employees.tsx",
  "vendors.tsx",
  "inventory.tsx",
  "reports.tsx",
  "settings.tsx",
];
const projectRoutes = [
  "drawings.tsx",
  "documents.tsx",
  "progress.tsx",
  "equipment.tsx",
  "inspections.tsx",
  "issues.tsx",
  "reports.tsx",
];

const globalTemplate = (name) => `import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../components/AppShell";

export const Route = createFileRoute("/${name.replace(".tsx", "")}")({
  component: Page,
});

function Page() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      <PageHeader
        title="${name.replace(".tsx", "").charAt(0).toUpperCase() + name.replace(".tsx", "").slice(1)}"
        eyebrow="Global Workspace"
      />
      <div className="p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground">
        Module coming soon.
      </div>
    </div>
  );
}
`;

const projectTemplate = (name) => `import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "../../../components/AppShell";

export const Route = createFileRoute("/projects/$projectId/${name.replace(".tsx", "")}")({
  component: Page,
});

function Page() {
  const { projectId } = Route.useParams();
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
      <PageHeader
        title="${name.replace(".tsx", "").charAt(0).toUpperCase() + name.replace(".tsx", "").slice(1)}"
        eyebrow="Project Module"
      />
      <div className="p-12 text-center border border-dashed border-border rounded-xl text-muted-foreground">
        Module data for {projectId} coming soon.
      </div>
    </div>
  );
}
`;

globalRoutes.forEach((route) => {
  fs.writeFileSync(path.join(__dirname, "src", "routes", route), globalTemplate(route));
});

projectRoutes.forEach((route) => {
  fs.writeFileSync(
    path.join(__dirname, "src", "routes", "projects", "$projectId", route),
    projectTemplate(route),
  );
});

console.log("Scaffolding complete.");

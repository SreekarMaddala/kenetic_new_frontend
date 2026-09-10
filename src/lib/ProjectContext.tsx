import React, { createContext, useContext, ReactNode } from "react";
import { useRouterState, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { projectApi, type Project } from "./api";

interface ProjectContextType {
  projectId: string | undefined;
  project: Project | undefined;
  switchProject: (newProjectId: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const params = useParams({ strict: false });
  const projectId = (params as any).projectId as string | undefined;
  
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectApi.list(),
    retry: 1,
  });

  const project = projectId ? projects.find((p) => p.projectId === projectId) : undefined;

  const switchProject = (newProjectId: string) => {
    if (!projectId) {
      // If we are not currently in a project route, we can just navigate to the overview
      navigate({ to: `/projects/${newProjectId}` });
      return;
    }
    
    // Attempt to maintain the current module path
    // Example: /projects/P1/boq -> /projects/P2/boq
    const currentModulePath = pathname.split(`/projects/${projectId}`)[1] || "";
    navigate({ to: `/projects/${newProjectId}${currentModulePath}` });
  };

  return (
    <ProjectContext.Provider value={{ projectId, project, switchProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

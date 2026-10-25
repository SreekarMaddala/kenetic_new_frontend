import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type DomainRecord } from "../lib/api";
import { createGangOnboardingRequest } from "../lib/gangOnboarding";
import { gangAttendancePlan } from "../lib/gangAttendance";
import { saveWorkerBatch } from "../lib/workerAttendance";

const endpoint = "/supervisor/labour/attendance";
const input = "rounded-lg border border-border bg-background px-3 py-2 text-sm";
const button = "rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-40";

export function GangProjectAllocation({ gangId, projectId, day, blocked }: {
  gangId: string; projectId: string; day: string; blocked: boolean;
}) {
  // Scope the component to the selection so results for an earlier gang/date
  // are never presented as confirmation of the newly selected allocation.
  return <GangAllocation key={`${gangId}-${projectId}-${day}`} gangId={gangId} projectId={projectId} day={day} blocked={blocked} />;
}

function GangAllocation({ gangId, projectId, day, blocked }: {
  gangId: string; projectId: string; day: string; blocked: boolean;
}) {
  const qc = useQueryClient();
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const roster = useQuery({
    queryKey: ["gang-project-allocation", gangId, projectId, day],
    staleTime: 0,
    queryFn: () => api.get<DomainRecord[]>(`${endpoint}?projectId=${encodeURIComponent(projectId)}&date=${day}&roster=true`),
  });
  const members = (roster.data ?? []).filter((worker) => worker.gangId === gangId);
  const confirmed = members.filter((worker) => worker.allocatedProjectId === projectId && worker.allocationConfirmed).length;
  const assign = useMutation({
    mutationFn: async () => {
      const plan = gangAttendancePlan(members, { projectId, day, action: "allocate" });
      return saveWorkerBatch(plan, ({ payload }) => api.post(endpoint, payload), 1);
    },
    onMutate: () => { setErrors([]); setMessage(""); },
    onSuccess: async (result) => {
      setMessage(`${result.succeeded.length} members allocated for ${day}.`);
      setErrors(result.failed.map(({ item, message }) => `${item.worker.name}: ${message}`));
      await qc.invalidateQueries();
    },
    onError: (error: Error) => setErrors([error.message]),
  });
  return <div className="space-y-2">
    <p className="text-sm">{roster.isPending ? "Loading gang allocations..." : `${confirmed} of ${members.length} gang members allocated here for ${day}.`}</p>
    <button className={button} disabled={blocked || roster.isFetching || roster.isError || assign.isPending || !members.length || confirmed === members.length}
      onClick={() => assign.mutate()}>{assign.isPending ? "Allocating gang..." : "Allocate existing gang members to project"}</button>
    <button className={`${input} ml-2`} disabled={blocked || assign.isPending || roster.isFetching} onClick={() => roster.refetch()}>Refresh allocation</button>
    {roster.isError && <p role="alert">Unable to load allocations: {roster.error.message}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    {!!errors.length && <ul role="alert" className="text-sm text-red-600 list-disc pl-5">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul>}
  </div>;
}

export function ProjectGangOnboarding({ projectId, day, blocked, refresh }: {
  projectId: string; day: string; blocked: boolean; refresh: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const [gangId, setGangId] = useState("");
  const [gangName, setGangName] = useState("");
  const gangs = useQuery({ queryKey: ["worker-gangs"], queryFn: () => api.get<DomainRecord[]>(`${endpoint}?gangs=true`) });
  const create = useMutation({
    mutationFn: () => api.post<DomainRecord>(endpoint, { operation: "gang_create", name: gangName.trim() }),
    onSuccess: async (gang) => {
      setGangId(String(gang.gangId));
      setGangName("");
      await qc.invalidateQueries({ queryKey: ["worker-gangs"] });
      toast.success("Gang created. Onboard its labourers below.");
    },
  });
  const gang = gangs.data?.find((entry) => entry.gangId === gangId);
  return <section className="rounded-xl border border-border p-4 space-y-4" aria-label="Onboard gang labourers to project">
    <h3 className="font-semibold">Onboard labourers to this project</h3>
    <p className="text-sm text-muted-foreground">Choose a gang or create one here. Each new labourer joins that gang and is allocated to this project for {day}.</p>
    <label className="grid gap-1 text-sm max-w-md">Gang
      <select className={input} aria-label="Gang for project onboarding" value={gangId}
        disabled={blocked || create.isPending || gangs.isFetching || gangs.isError} onChange={(event) => setGangId(event.target.value)}>
        <option value="">Choose a gang</option>
        {(gangs.data ?? []).map((entry) => <option key={String(entry.gangId)} value={String(entry.gangId)}>{String(entry.name)}</option>)}
      </select>
    </label>
    {gangs.isError && <p role="alert">Unable to load gangs. <button className={input} onClick={() => gangs.refetch()}>Retry gangs</button></p>}
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (!blocked && !create.isPending && gangName.trim()) create.mutate(); }}>
      <label className="grid gap-1 text-sm">New gang name<input className={input} value={gangName} required maxLength={128}
        disabled={blocked || create.isPending} onChange={(event) => setGangName(event.target.value)} /></label>
      <button className={button} disabled={blocked || create.isPending || !gangName.trim()}>{create.isPending ? "Creating..." : "Create gang here"}</button>
    </form>
    {create.error && <p role="alert" className="text-red-600 text-sm">{create.error.message}</p>}
    {gang && <ProjectGangWorkerForm key={`${projectId}-${day}-${gangId}`} projectId={projectId} day={day}
      gangId={gangId} gangName={String(gang.name)} blocked={blocked || create.isPending} refresh={refresh} />}
  </section>;
}

export function ProjectGangWorkerForm({ projectId, day, gangId, gangName, blocked, refresh }: {
  projectId: string; day: string; gangId: string; gangName: string; blocked: boolean; refresh: () => Promise<void>;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [rate, setRate] = useState("800");
  const request = useRef(createGangOnboardingRequest());
  const save = useMutation({
    mutationFn: () => api.post(endpoint, request.current({ name, rate: Number(rate), projectId, date: day, gangId })),
    onSuccess: async () => {
      request.current = createGangOnboardingRequest();
      setName("");
      toast.success(`Labourer onboarded in ${gangName} and allocated for ${day}.`);
      await qc.invalidateQueries();
      await refresh();
    },
  });
  const valid = !!name.trim() && Number.isFinite(Number(rate)) && Number(rate) > 0;
  return <form className="rounded-xl bg-secondary/30 p-4 space-y-3" aria-label="Project labourer onboarding"
    onSubmit={(event) => { event.preventDefault(); if (!blocked && !save.isPending && valid) save.mutate(); }}>
    <p className="text-sm font-medium">New labourer in {gangName}</p>
    <fieldset disabled={blocked || save.isPending} className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm">Labourer name<input className={input} value={name} required maxLength={128}
        onChange={(event) => setName(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">Daily wage (₹)<input className={input} type="number" value={rate} min="0.01" step="0.01" required
        onChange={(event) => setRate(event.target.value)} /></label>
      <button className={button} disabled={!valid}>{save.isPending ? "Onboarding..." : "Onboard & allocate to project"}</button>
    </fieldset>
    {save.error && <p role="alert" className="text-red-600 text-sm">{save.error.message}</p>}
  </form>;
}

export function createGangOnboardingRequest() {
  const requests = new Map<string, string>();
  return (details: { name: string; rate: number; gangId?: string; projectId?: string; date?: string }) => {
    const body = {
      operation: details.projectId ? "register_allocate" : "register",
      name: details.name.trim(), rate: details.rate,
      ...(details.gangId ? { gangId: details.gangId } : {}),
      ...(details.projectId ? { projectId: details.projectId, date: details.date } : {}),
    };
    if (!body.name || !Number.isFinite(body.rate) || body.rate <= 0)
      throw new Error("Enter the labourer's name and a positive daily wage.");
    if (details.projectId && (!details.gangId || !/^\d{4}-\d{2}-\d{2}$/.test(details.date ?? "")))
      throw new Error("Choose a gang, project and allocation date.");
    const key = JSON.stringify(body);
    if (!requests.has(key)) requests.set(key, crypto.randomUUID());
    return { ...body, requestId: requests.get(key)! };
  };
}

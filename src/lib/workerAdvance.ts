export type AdvanceDetails = {
  workerId: string;
  projectId: string;
  date: string;
  amount: number;
  description: string;
};

// Keep the same request ID when retrying an uncertain network response.
export function createAdvanceRequest() {
  const requests = new Map<string, string>();
  return (details: AdvanceDetails) => {
    const normalized = { ...details, description: details.description.trim() };
    if (
      !normalized.workerId ||
      !normalized.projectId ||
      !normalized.description ||
      !/^\d{4}-\d{2}-\d{2}$/.test(normalized.date) ||
      !Number.isFinite(normalized.amount) ||
      normalized.amount <= 0 ||
      normalized.amount > 1e12 ||
      normalized.description.length > 4000
    ) {
      throw new Error("Choose a project and date, and enter a positive amount and reason.");
    }
    const key = JSON.stringify(normalized);
    const requestId = requests.get(key) ?? crypto.randomUUID();
    requests.set(key, requestId);
    return { ...normalized, operation: "advance", requestId };
  };
}

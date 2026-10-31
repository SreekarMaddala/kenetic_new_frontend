export type GangAllocation = {
  projectId: string;
  date: string;
  version: number;
  size: number;
  rate: number;
  attendanceStarted?: boolean;
};
export type GangDay = {
  version: number;
  present: number;
  halfDay: number;
  nightCount: number;
  absent: number;
  wage: number;
  rate: number;
  size: number;
};
export type GangAccount = {
  earned: number;
  advancesGiven: number;
  advancesReturned: number;
  advancesRecovered: number;
  advanceBalance: number;
  reservedAdvances: number;
  paid: number;
  balanceToPay: number;
  carryForward: number;
};
export type Gang = {
  gangId: string;
  name: string;
  attendanceMode?: "headcount";
  headcountFrom?: string;
  size?: number;
  rate?: number;
  version?: number;
  allocation?: GangAllocation | null;
  attendance?: GangDay | null;
  monthSummary?: { grossWages?: number; personDays?: number };
  payrollLocked?: boolean;
  account?: GangAccount;
  history?: {
    cashId?: string;
    cashType: string;
    projectId: string;
    date: string;
    amount: number;
    description: string;
    advanceRecovery?: number;
    createdAt: string;
  }[];
};

export function headcountPreview(
  size: number,
  rate: number,
  present: string,
  halfDay = "0",
  nightCount = "0",
) {
  const values = [present, halfDay, nightCount];
  if (values.some((value) => !/^\d+$/.test(value))) return null;
  const [full, half, night] = values.map(Number);
  if (full + half > size || night > full) return null;
  return {
    present: full,
    halfDay: half,
    nightCount: night,
    absent: size - full - half,
    wage: Math.round((Math.round(rate * 100) * (full * 2 + half + night * 2)) / 2) / 100,
  };
}

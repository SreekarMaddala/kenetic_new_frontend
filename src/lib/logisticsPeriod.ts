export function logisticsPeriod(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  const month = `${value("year")}-${value("month")}`;
  const lastDay = new Date(Number(value("year")), Number(value("month")), 0).getDate();
  return {
    month,
    today: `${month}-${value("day")}`,
    start: `${month}-01`,
    end: `${month}-${lastDay}`,
  };
}

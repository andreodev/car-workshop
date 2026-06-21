import type { DashboardPeriod } from "../types/dashboard.types";
import { dashboardPeriodOptions } from "./dashboard.constants";

export function normalizeDashboardPeriod(value: unknown): DashboardPeriod {  if (
    typeof value === "string" &&
    dashboardPeriodOptions.some((option) => option.value === value)
  ) {
    return value as DashboardPeriod;
  }

  return "today";
}

//pode se tornar um util global pois em varios lugares é feito essa consulta de
//dia/semana/mês
export function getDashboardPeriodRange(period: DashboardPeriod) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = new Date(todayStart);
  const dayOfWeek = weekStart.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const ranges: Record<
    DashboardPeriod,
    { start: Date; end: Date; label: string; shortLabel: string }
  > = {
    yesterday: {
      start: yesterdayStart,
      end: todayStart,
      label: "ontem",
      shortLabel: "Ontem",
    },
    today: {
      start: todayStart,
      end: tomorrowStart,
      label: "hoje",
      shortLabel: "Hoje",
    },
    week: {
      start: weekStart,
      end: nextWeekStart,
      label: "nesta semana",
      shortLabel: "Semana",
    },
    month: {
      start: monthStart,
      end: nextMonthStart,
      label: "neste mês",
      shortLabel: "Mês",
    },
  };

  return {
    ...ranges[period],
    todayStart,
  };
}

export function getSupplierDateRanges() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const nextWeekEnd = new Date(todayStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
  nextWeekEnd.setHours(23, 59, 59, 999);

  return { nextWeekEnd };
}

export function statusCount<TStatus extends string>(
  groups: Array<{
    status: TStatus;
    _count?: { _all?: number | null } | true | null;
  }>,
  status: TStatus
) {
  const count = groups.find((group) => group.status === status)?._count;
  return typeof count === "object" && count ? count._all ?? 0 : 0;
}

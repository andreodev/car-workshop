import type { dashboardPeriodOptions } from "../utils/dashboard.constants";

export type DashboardPeriod = (typeof dashboardPeriodOptions)[number]["value"];

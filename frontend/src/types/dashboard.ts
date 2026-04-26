export type DashboardRefrigeratorSummary = {
  id: string;
  name: string;
};

export type DashboardMembership = {
  role: string;
  refrigerators: DashboardRefrigeratorSummary;
};

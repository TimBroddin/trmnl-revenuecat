export interface RevenueCatMetrics {
  projects: ProjectMetrics[];
  total_mrr: number;
  total_revenue: number;
}

export interface ProjectMetrics {
  name: string;
  mrr: number;
  revenue: number;
}

import { RevenueCatMetrics, ProjectMetrics } from './types';

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v2';

interface RevenueCatV2Project {
  id: string;
  project_id: string;
  name: string;
  created_at: number;
}

interface RevenueCatV2ProjectsResponse {
  items: RevenueCatV2Project[];
  next_page: string | null;
}

interface RevenueCatV2Metric {
  id: string;
  name: string;
  description: string;
  value: number;
  unit: string;
  period: string;
  object: string;
  last_updated_at: number | null;
  last_updated_at_iso8601: string | null;
}

interface RevenueCatV2OverviewMetrics {
  object: string;
  metrics: RevenueCatV2Metric[];
}


export class RevenueCatClient {
  private apiKey: string;
  private projectId: string | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchFromRevenueCat(endpoint: string): Promise<unknown> {
    const response = await fetch(`${REVENUECAT_API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RevenueCat API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getProjectMetrics(): Promise<ProjectMetrics> {
    console.log('[RevenueCat] Fetching metrics from RevenueCat API');

    try {
      // Get the first (and only) project for this API key
      console.log('[RevenueCat] Fetching projects...');
      const response = await this.fetchFromRevenueCat('/projects') as RevenueCatV2ProjectsResponse;

      if (!response.items || response.items.length === 0) {
        throw new Error('No projects found for this API key');
      }

      const project = response.items[0];
      console.log('[RevenueCat] Found project:', project.name, `(${project.id})`);

      // Fetch overview metrics
      console.log('[RevenueCat] Fetching overview metrics for project:', project.id);
      const overview = await this.fetchFromRevenueCat(
        `/projects/${project.id}/metrics/overview`
      ) as RevenueCatV2OverviewMetrics;

      // Find MRR and Revenue metrics
      const mrrMetric = overview.metrics.find(m => m.id === 'mrr');
      const mrr = mrrMetric?.value || 0;

      const revenueMetric = overview.metrics.find(m => m.id === 'revenue');
      const revenue = revenueMetric?.value || 0;

      console.log('[RevenueCat] Project', project.name, '- MRR:', mrr, '- Revenue:', revenue);

      return {
        name: project.name,
        mrr,
        revenue,
      };
    } catch (error) {
      console.error('[RevenueCat] Error fetching metrics:', error);
      throw error;
    }
  }

}

export async function getRevenueCatMetrics(apiKeys: string[]): Promise<RevenueCatMetrics> {
  console.log('[RevenueCat] Fetching metrics for', apiKeys.length, 'project(s)');

  const projects: ProjectMetrics[] = [];
  let totalMrr = 0;
  let totalRevenue = 0;

  // Fetch metrics for each API key (project)
  for (const apiKey of apiKeys) {
    try {
      const client = new RevenueCatClient(apiKey);
      const projectMetrics = await client.getProjectMetrics();

      projects.push(projectMetrics);
      totalMrr += projectMetrics.mrr;
      totalRevenue += projectMetrics.revenue;
    } catch (error) {
      console.error('[RevenueCat] Error fetching metrics for API key:', error);
      // Continue with other projects even if one fails
    }
  }

  const result = {
    projects,
    total_mrr: totalMrr,
    total_revenue: totalRevenue,
  };

  console.log('[RevenueCat] Final aggregated metrics:', result);
  return result;
}

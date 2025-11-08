import { NextRequest, NextResponse } from 'next/server';
import { getRevenueCatMetrics } from '@/lib/revenuecat';
import { convertToEur, formatCurrency, isValidCurrency } from '@/lib/currency';

export async function GET(request: NextRequest) {
  try {
    // Get currency from query parameter (default to USD)
    const { searchParams } = new URL(request.url);
    const currencyParam = searchParams.get('currency')?.toUpperCase() || 'USD';

    if (!isValidCurrency(currencyParam)) {
      return NextResponse.json(
        { error: 'Invalid currency. Supported values: USD, EUR' },
        { status: 400 }
      );
    }

    const currency = currencyParam as 'USD' | 'EUR';

    // Extract password from Authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Support both "Bearer <token>" and just "<token>" formats
    const password = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    // Verify password
    const expectedPassword = process.env.TRMNL_PASSWORD;
    if (!expectedPassword) {
      return NextResponse.json(
        { error: 'Server configuration error: TRMNL_PASSWORD not set' },
        { status: 500 }
      );
    }

    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Get API keys from environment
    const apiKeysJson = process.env.REVENUECAT_API_KEYS;
    if (!apiKeysJson) {
      return NextResponse.json(
        { error: 'Server configuration error: REVENUECAT_API_KEYS not set' },
        { status: 500 }
      );
    }

    let apiKeys: string[];
    try {
      apiKeys = JSON.parse(apiKeysJson);
    } catch (error) {
      return NextResponse.json(
        { error: 'Server configuration error: Invalid REVENUECAT_API_KEYS format' },
        { status: 500 }
      );
    }

    if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'Server configuration error: REVENUECAT_API_KEYS must be a non-empty array' },
        { status: 500 }
      );
    }

    // Fetch metrics from RevenueCat
    const metrics = await getRevenueCatMetrics(apiKeys);

    // Convert to EUR if requested
    let totalMrr = metrics.total_mrr;
    let totalRevenue = metrics.total_revenue;
    const projects = await Promise.all(
      metrics.projects.map(async (project) => {
        let mrr = project.mrr;
        let revenue = project.revenue;

        if (currency === 'EUR') {
          mrr = await convertToEur(mrr);
          revenue = await convertToEur(revenue);
        }

        return {
          name: project.name,
          mrr: formatCurrency(mrr, currency),
          revenue: formatCurrency(revenue, currency),
        };
      })
    );

    // Sort projects alphabetically by name
    projects.sort((a, b) => a.name.localeCompare(b.name));

    if (currency === 'EUR') {
      totalMrr = await convertToEur(totalMrr);
      totalRevenue = await convertToEur(totalRevenue);
    }

    // Format response for TRMNL display
    const response = {
        total_mrr: formatCurrency(totalMrr, currency),
        total_revenue: formatCurrency(totalRevenue, currency),
        projects,
      
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in TRMNL API route:', error);

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // TRMNL might use POST for webhook updates
  return GET(request);
}

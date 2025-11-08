import { NextRequest, NextResponse } from 'next/server';
import { getRevenueCatMetrics } from '@/lib/revenuecat';
import { convertToEur, formatCurrency, isValidCurrency } from '@/lib/currency';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const currencyParam = searchParams.get('currency')?.toUpperCase() || 'USD';
    const demo = searchParams.get('demo') === 'true';
    const sort = searchParams.get('sort') || 'name';

    if (!isValidCurrency(currencyParam)) {
      return NextResponse.json(
        { error: 'Invalid currency. Supported values: USD, EUR' },
        { status: 400 }
      );
    }

    const currency = currencyParam as 'USD' | 'EUR';

    // Demo mode - return mock data for screenshots
    if (demo) {
      const mockProjects = [
        { name: 'Meditation Master', mrr: '$12,500', revenue: '$45,000' },
        { name: 'Fitness Tracker Pro', mrr: '$8,300', revenue: '$28,000' },
        { name: 'Recipe Book+', mrr: '$6,700', revenue: '$22,500' },
        { name: 'Note Taking Guru', mrr: '$5,200', revenue: '$18,000' },
        { name: 'Photo Editor Ultra', mrr: '$4,100', revenue: '$15,000' },
        { name: 'Task Manager Pro', mrr: '$3,800', revenue: '$12,000' },
        { name: 'Language Learning', mrr: '$3,200', revenue: '$10,500' },
        { name: 'Sleep Tracker', mrr: '$2,000', revenue: '$5,000' },
      ];

      return NextResponse.json({
        total_mrr: currency === 'EUR' ? '€42,300' : '$45,800',
        total_revenue: currency === 'EUR' ? '€144,000' : '$156,000',
        projects: mockProjects,
      });
    }

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

    // Sort projects based on sort parameter
    if (sort === 'mrr') {
      // Sort by MRR descending (parse currency string to number)
      projects.sort((a, b) => {
        const mrrA = parseFloat(a.mrr.replace(/[^0-9.-]+/g, ''));
        const mrrB = parseFloat(b.mrr.replace(/[^0-9.-]+/g, ''));
        return mrrB - mrrA;
      });
    } else if (sort === 'revenue') {
      // Sort by revenue descending (parse currency string to number)
      projects.sort((a, b) => {
        const revA = parseFloat(a.revenue.replace(/[^0-9.-]+/g, ''));
        const revB = parseFloat(b.revenue.replace(/[^0-9.-]+/g, ''));
        return revB - revA;
      });
    } else {
      // Default: sort alphabetically by name
      projects.sort((a, b) => a.name.localeCompare(b.name));
    }

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

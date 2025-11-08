// Currency conversion utility

const FALLBACK_USD_TO_EUR_RATE = 0.92; // Default fallback rate

interface ExchangeRateResponse {
  result: string;
  conversion_rate: number;
}

/**
 * Get USD to EUR exchange rate
 * Uses exchangerate-api.io with fallback to default rate
 */
async function getExchangeRate(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.exchangerate-api.com/v4/latest/USD',
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      console.warn('[Currency] Exchange rate API returned non-OK status, using fallback');
      return FALLBACK_USD_TO_EUR_RATE;
    }

    const data = await response.json();
    const rate = data.rates?.EUR;

    if (typeof rate !== 'number') {
      console.warn('[Currency] Invalid exchange rate data, using fallback');
      return FALLBACK_USD_TO_EUR_RATE;
    }

    console.log('[Currency] Using exchange rate:', rate);
    return rate;
  } catch (error) {
    console.error('[Currency] Error fetching exchange rate:', error);
    console.log('[Currency] Using fallback rate:', FALLBACK_USD_TO_EUR_RATE);
    return FALLBACK_USD_TO_EUR_RATE;
  }
}

/**
 * Convert USD amount to EUR
 */
export async function convertToEur(usdAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  return usdAmount * rate;
}

/**
 * Format currency amount with appropriate symbol
 */
export function formatCurrency(amount: number, currency: 'USD' | 'EUR'): string {
  const formatted = amount.toFixed(2);
  return currency === 'EUR' ? `€${formatted}` : `$${formatted}`;
}

/**
 * Validate currency parameter
 */
export function isValidCurrency(currency: string | null): currency is 'USD' | 'EUR' {
  return currency === 'USD' || currency === 'EUR';
}

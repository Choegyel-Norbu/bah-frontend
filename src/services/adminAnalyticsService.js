import { api } from './api';

const ADMIN_ANALYTICS_PATH = '/admin/analytics';

/**
 * @param {import('axios').AxiosError} error
 * @returns {string}
 */
function getErrorMessage(error) {
  const data = error.response?.data;
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
  }
  if (error.response?.status === 401) return 'Unauthorized. Please sign in as admin.';
  if (error.response?.status === 403) return 'You do not have permission to view analytics.';
  if (error.response?.status === 400) return 'Invalid analytics request.';
  return error.message ?? 'Failed to load analytics.';
}

/**
 * Fetch sales trend points for admin dashboard line charts.
 * Response shape expected: { success, message, data: { metric, granularity, currency, points, summary }, timestamp }
 * @param {{
 *  from: string;
 *  to: string;
 *  metric?: string;
 *  categoryId?: number;
 *  brand?: string;
 *  timezone?: string;
 * }} params
 */
export async function getAdminSalesTrend(params) {
  try {
    const response = await api.get(`${ADMIN_ANALYTICS_PATH}/sales-trend`, { params });
    const payload = response?.data ?? response;
    const data = payload?.data ?? payload;
    return {
      metric: data?.metric ?? 'NET_SALES',
      granularity: data?.granularity ?? 'MONTH',
      currency: data?.currency ?? 'PHP',
      points: Array.isArray(data?.points) ? data.points : [],
      summary: data?.summary ?? { total: 0, changePctVsPreviousPeriod: null },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Fetch daily sales trend points for admin dashboard line charts.
 * Endpoint: GET /admin/analytics/sales-trend/daily
 * @param {{ from: string; to: string; }} params
 */
export async function getAdminSalesTrendDaily(params) {
  try {
    const response = await api.get(`${ADMIN_ANALYTICS_PATH}/sales-trend/daily`, { params });
    const payload = response?.data ?? response;
    const data = payload?.data ?? payload;
    return {
      metric: data?.metric ?? 'NET_SALES',
      granularity: data?.granularity ?? 'DAY',
      currency: data?.currency ?? 'PHP',
      points: Array.isArray(data?.points) ? data.points : [],
      summary: data?.summary ?? { total: 0, changePctVsPreviousPeriod: null },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}


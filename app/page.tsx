import { getBigQueryClient } from '@/lib/bigquery';

export const dynamic = 'force-dynamic';

type TransactionRow = {
  transaction_id: string;
  category: string;
  amount: number;
  timestamp?: { value: string };
};

type CategoryVolume = {
  category: string;
  total_volume: number;
};

const CATEGORY_STYLES: Record<string, { icon: string; gradient: string; ring: string }> = {
  default: { icon: '📊', gradient: 'from-slate-500 to-slate-700', ring: 'ring-slate-400/30' },
};

const CARD_PALETTES = [
  { icon: '💳', gradient: 'from-violet-600 to-indigo-700', ring: 'ring-violet-400/30' },
  { icon: '🏦', gradient: 'from-emerald-600 to-teal-700', ring: 'ring-emerald-400/30' },
  { icon: '📈', gradient: 'from-amber-500 to-orange-600', ring: 'ring-amber-400/30' },
  { icon: '🔄', gradient: 'from-rose-500 to-pink-700', ring: 'ring-rose-400/30' },
];

function getCardStyle(index: number) {
  return CARD_PALETTES[index % CARD_PALETTES.length];
}

async function fetchDashboardData(): Promise<{
  rows: TransactionRow[];
  volumes: CategoryVolume[];
  error?: string;
}> {
  try {
    const bigquery = getBigQueryClient();

    const transactionsQuery = `
      SELECT * FROM \`fin-mirror-cdac-24101a0025.financial_analytics.transaction_raw\`
      ORDER BY timestamp DESC
      LIMIT 10
    `;

    const volumeQuery = `
      SELECT
        category,
        SUM(amount) AS total_volume
      FROM \`fin-mirror-cdac-24101a0025.financial_analytics.transaction_raw\`
      GROUP BY category
      ORDER BY total_volume DESC
      LIMIT 4
    `;

    const [transactionsResult, volumeResult] = await Promise.all([
      bigquery.query({ query: transactionsQuery }),
      bigquery.query({ query: volumeQuery }),
    ]);

    return {
      rows: transactionsResult[0] as TransactionRow[],
      volumes: volumeResult[0] as CategoryVolume[],
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to fetch data from BigQuery';

    console.error('BigQuery error:', error);
    return { rows: [], volumes: [], error: message };
  }
}

function formatVolume(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export default async function Home() {
  const { rows, volumes, error } = await fetchDashboardData();

  return (
    <main className="p-10 font-sans bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">Financial Mirror</h1>
        <p className="text-gray-500 mb-8">Live Transaction Stream</p>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
            <h2 className="font-semibold mb-2">Unable to load data</h2>
            <p className="text-sm">{error}</p>
            <p className="mt-3 text-sm text-red-700">
              Verify that <code className="font-mono">gcp-key.json</code> exists,
              <code className="font-mono"> GCP_PROJECT_ID</code> is set in{' '}
              <code className="font-mono">.env.local</code>, and the service account
              has BigQuery Job User and Data Viewer roles.
            </p>
          </div>
        ) : (
          <>
            {/* ── Category Volume Summary Cards ─────────────────────── */}
            {volumes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {volumes.map((vol, i) => {
                  const style = getCardStyle(i);
                  return (
                    <div
                      key={vol.category}
                      className={`
                        relative overflow-hidden rounded-xl p-5
                        bg-gradient-to-br ${style.gradient}
                        text-white shadow-lg ring-1 ${style.ring}
                        transition-transform duration-200 hover:scale-[1.03]
                      `}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{style.icon}</span>
                        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                          #{i + 1}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white/80 capitalize">
                        {vol.category}
                      </p>
                      <p className="mt-1 text-2xl font-bold tracking-tight">
                        {formatVolume(vol.total_volume)}
                      </p>
                      {/* Decorative circle */}
                      <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/10" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Transaction Table ─────────────────────────────────── */}
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-6 font-semibold">Transaction ID</th>
                    <th className="py-3 px-6 font-semibold">Category</th>
                    <th className="py-3 px-6 font-semibold">Amount</th>
                    <th className="py-3 px-6 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-6 font-mono text-xs text-gray-500">
                        {row.transaction_id}
                      </td>
                      <td className="py-3 px-6 capitalize">{row.category}</td>
                      <td className="py-3 px-6 font-medium text-emerald-600">
                        ${row.amount ? row.amount.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3 px-6 text-gray-500">
                        {row.timestamp?.value
                          ? new Date(row.timestamp.value).toLocaleTimeString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

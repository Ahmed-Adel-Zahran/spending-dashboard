import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatting';

export default function MonthlyChart({ transactions }) {
  const monthlyData = {};

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = { month, spent: 0, income: 0 };
    }
    if (tx.amount < 0) {
      monthlyData[month].spent += Math.abs(tx.amount);
    } else {
      monthlyData[month].income += tx.amount;
    }
  }

  const data = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  if (data.length === 0) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 flex items-center justify-center h-80 text-slate-500">
        No data
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.month + '-01T00:00:00').toLocaleDateString('en-CA', {
      month: 'short',
      year: '2-digit',
    }),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-navy-700 border border-navy-500 rounded-lg px-3 py-2 text-sm">
        <div className="text-slate-300 font-medium mb-1">{label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-navy-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Monthly Overview</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={formatted} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
          <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8' }}
          />
          <Bar dataKey="spent" name="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} />
          <Bar dataKey="income" name="Income" fill="#00E5A0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

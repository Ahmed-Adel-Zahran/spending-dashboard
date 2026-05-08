import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  getCategoryEmoji,
  getCategoryColor,
  getCategoryType,
  formatCurrency,
  SPENDING_TYPE_META,
} from '../utils/formatting';

function pct(value, total) {
  return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
}

export default function NeedsWantsBreakdown({ transactions, onCategoryClick }) {
  const analysis = useMemo(() => {
    const debits = transactions.filter((t) => t.amount < 0);
    const totalSpent = debits.reduce((s, t) => s + Math.abs(t.amount), 0);

    const groups = { need: {}, want: {}, transfer: {} };

    for (const tx of debits) {
      const cat = tx.category || 'Uncategorized';
      const type = getCategoryType(cat);
      if (!groups[type]) groups[type] = {};
      groups[type][cat] = (groups[type][cat] || 0) + Math.abs(tx.amount);
    }

    const summary = {};
    for (const [type, cats] of Object.entries(groups)) {
      const total = Object.values(cats).reduce((s, v) => s + v, 0);
      const sorted = Object.entries(cats)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
      summary[type] = { total, categories: sorted };
    }

    // Monthly breakdown for bar chart
    const monthlyMap = {};
    for (const tx of debits) {
      const month = tx.date.substring(0, 7);
      const type = getCategoryType(tx.category || 'Uncategorized');
      if (!monthlyMap[month]) monthlyMap[month] = { month, need: 0, want: 0, transfer: 0 };
      monthlyMap[month][type] += Math.abs(tx.amount);
    }
    const monthly = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

    return { totalSpent, summary, monthly };
  }, [transactions]);

  const { totalSpent, summary, monthly } = analysis;
  const needsTotal = summary.need?.total || 0;
  const wantsTotal = summary.want?.total || 0;
  const transfersTotal = summary.transfer?.total || 0;
  const realSpending = needsTotal + wantsTotal;

  if (totalSpent === 0) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 text-slate-500 text-center">
        No spending data to analyse
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const monthLabel = new Date(label + '-01').toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
    return (
      <div className="bg-navy-700 border border-navy-500 rounded-lg px-3 py-2 text-xs">
        <div className="text-slate-300 font-medium mb-1">{monthLabel}</div>
        {payload.map((p) => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span style={{ color: p.fill }}>{SPENDING_TYPE_META[p.dataKey]?.label}</span>
            <span className="text-slate-200">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-navy-800 rounded-xl p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">Spending Baseline</h3>
        <p className="text-xs text-slate-500">Needs vs. Wants — understand your core expenses before setting budgets</p>
      </div>

      {/* Summary bar */}
      <div className="space-y-3">
        <div className="flex rounded-full h-5 overflow-hidden bg-navy-700">
          {needsTotal > 0 && (
            <div
              className="h-full transition-all"
              style={{ width: `${pct(needsTotal, totalSpent)}%`, backgroundColor: SPENDING_TYPE_META.need.color }}
              title={`Needs: ${formatCurrency(needsTotal)}`}
            />
          )}
          {wantsTotal > 0 && (
            <div
              className="h-full transition-all"
              style={{ width: `${pct(wantsTotal, totalSpent)}%`, backgroundColor: SPENDING_TYPE_META.want.color }}
              title={`Wants: ${formatCurrency(wantsTotal)}`}
            />
          )}
          {transfersTotal > 0 && (
            <div
              className="h-full transition-all"
              style={{ width: `${pct(transfersTotal, totalSpent)}%`, backgroundColor: SPENDING_TYPE_META.transfer.color }}
              title={`Transfers: ${formatCurrency(transfersTotal)}`}
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { key: 'need', total: needsTotal },
            { key: 'want', total: wantsTotal },
            { key: 'transfer', total: transfersTotal },
          ].map(({ key, total }) => (
            <div key={key} className="bg-navy-700/50 rounded-lg p-3">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{SPENDING_TYPE_META[key].label}</div>
              <div className="text-lg font-bold" style={{ color: SPENDING_TYPE_META[key].color }}>
                {formatCurrency(total)}
              </div>
              <div className="text-[11px] text-slate-500">{pct(total, totalSpent)}% of total</div>
            </div>
          ))}
        </div>
      </div>

      {/* Real spending insight */}
      {realSpending > 0 && (
        <div className="bg-navy-700/30 border border-navy-600 rounded-lg p-4">
          <div className="text-xs text-slate-400 mb-2">Excluding transfers, your real spending is <span className="text-slate-200 font-medium">{formatCurrency(realSpending)}</span></div>
          <div className="flex items-center gap-3 text-sm">
            <div>
              <span className="font-medium" style={{ color: SPENDING_TYPE_META.need.color }}>{pct(needsTotal, realSpending)}%</span>
              <span className="text-slate-500 ml-1">needs</span>
            </div>
            <span className="text-slate-600">vs</span>
            <div>
              <span className="font-medium" style={{ color: SPENDING_TYPE_META.want.color }}>{pct(wantsTotal, realSpending)}%</span>
              <span className="text-slate-500 ml-1">wants</span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly stacked bar chart */}
      {monthly.length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-slate-300 mb-3">Monthly Trend</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthly} barCategoryGap="20%">
              <XAxis
                dataKey="month"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => {
                  const d = new Date(v + '-01');
                  return d.toLocaleDateString('en-CA', { month: 'short' });
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="need" stackId="a" fill={SPENDING_TYPE_META.need.color} radius={[0, 0, 0, 0]} />
              <Bar dataKey="want" stackId="a" fill={SPENDING_TYPE_META.want.color} radius={[0, 0, 0, 0]} />
              <Bar dataKey="transfer" stackId="a" fill={SPENDING_TYPE_META.transfer.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category lists for needs and wants */}
      <div className="grid lg:grid-cols-2 gap-6">
        {['need', 'want'].map((type) => {
          const group = summary[type];
          if (!group || group.categories.length === 0) return null;
          const meta = SPENDING_TYPE_META[type];
          return (
            <div key={type}>
              <h4 className="text-sm font-medium mb-3" style={{ color: meta.color }}>
                {meta.label}
                <span className="text-slate-500 font-normal ml-2">{formatCurrency(group.total)}</span>
              </h4>
              <div className="space-y-2">
                {group.categories.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between text-xs cursor-pointer hover:bg-navy-700/50 rounded px-2 py-1 -mx-2 transition-colors"
                    onClick={() => onCategoryClick?.(cat.name)}
                  >
                    <span className="text-slate-300">
                      {getCategoryEmoji(cat.name)} {cat.name}
                    </span>
                    <div className="text-right">
                      <span className="text-slate-400">{formatCurrency(cat.amount)}</span>
                      <span className="text-slate-600 ml-2">{pct(cat.amount, realSpending)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

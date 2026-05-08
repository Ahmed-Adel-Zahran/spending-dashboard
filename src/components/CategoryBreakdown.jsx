import { getCategoryColor, getCategoryEmoji, formatCurrency } from '../utils/formatting';

export default function CategoryBreakdown({ transactions, onCategoryClick }) {
  const debits = transactions.filter((t) => t.amount < 0);
  const totalSpent = debits.reduce((s, t) => s + Math.abs(t.amount), 0);

  const categoryTotals = {};
  for (const tx of debits) {
    const cat = tx.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(tx.amount);
  }

  const sorted = Object.entries(categoryTotals)
    .map(([name, total]) => ({ name, total, pct: totalSpent > 0 ? (total / totalSpent) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  if (sorted.length === 0) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 text-slate-500 text-center">
        No categories yet
      </div>
    );
  }

  return (
    <div className="bg-navy-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Category Breakdown</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {sorted.map((cat) => (
          <div
            key={cat.name}
            className="cursor-pointer hover:bg-navy-700/50 rounded-lg px-2 py-1 -mx-2 transition-colors"
            onClick={() => onCategoryClick?.(cat.name)}
          >
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">
                {getCategoryEmoji(cat.name)} {cat.name}
              </span>
              <span className="text-slate-400">
                {formatCurrency(cat.total)} ({cat.pct.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-navy-700 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${cat.pct}%`,
                  backgroundColor: getCategoryColor(cat.name),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

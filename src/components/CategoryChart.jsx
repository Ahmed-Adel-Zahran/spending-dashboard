import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getCategoryColor, getCategoryEmoji, formatCurrency } from '../utils/formatting';

export default function CategoryChart({ transactions, onCategoryClick }) {
  const debits = transactions.filter((t) => t.amount < 0);
  const categoryTotals = {};

  for (const tx of debits) {
    const cat = tx.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Math.abs(tx.amount);
  }

  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  if (data.length === 0) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 flex items-center justify-center h-80 text-slate-500">
        No spending data
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const { name, value } = payload[0];
    return (
      <div className="bg-navy-700 border border-navy-500 rounded-lg px-3 py-2 text-sm">
        <span>{getCategoryEmoji(name)} {name}</span>
        <div className="text-accent font-medium">{formatCurrency(value)}</div>
      </div>
    );
  };

  const handleClick = (entry) => {
    if (onCategoryClick) onCategoryClick(entry.name);
  };

  return (
    <div className="bg-navy-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            onClick={handleClick}
            cursor="pointer"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={getCategoryColor(entry.name)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-4 text-xs">
        {data.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center gap-2 cursor-pointer hover:bg-navy-700 rounded px-1 py-0.5 transition-colors"
            onClick={() => onCategoryClick?.(entry.name)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: getCategoryColor(entry.name) }}
            />
            <span className="text-slate-400 truncate">{getCategoryEmoji(entry.name)} {entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

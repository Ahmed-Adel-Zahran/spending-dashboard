import { formatCurrency } from '../utils/formatting';
import CategoryChart from './CategoryChart';
import MonthlyChart from './MonthlyChart';
import CategoryBreakdown from './CategoryBreakdown';
import BankBreakdown from './BankBreakdown';
import TransactionTable from './TransactionTable';

function StatCard({ label, value, color }) {
  return (
    <div className="bg-navy-800 rounded-xl p-5">
      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

export default function Dashboard({ activeTab, transactions, onCategoryClick, selectedCategory, onClearCategory }) {
  const totalSpent = transactions
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const netFlow = totalIncome - totalSpent;

  if (activeTab === 'transactions') {
    return (
      <TransactionTable
        transactions={transactions}
        initialCategory={selectedCategory}
        onClearCategory={onClearCategory}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} color="#ef4444" />
        <StatCard label="Total Income" value={formatCurrency(totalIncome)} color="#00E5A0" />
        <StatCard
          label="Net Cash Flow"
          value={formatCurrency(netFlow)}
          color={netFlow >= 0 ? '#00E5A0' : '#ef4444'}
        />
        <StatCard label="Transactions" value={transactions.length.toLocaleString()} color="#94a3b8" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <CategoryChart transactions={transactions} onCategoryClick={onCategoryClick} />
        <MonthlyChart transactions={transactions} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <CategoryBreakdown transactions={transactions} onCategoryClick={onCategoryClick} />
        <BankBreakdown transactions={transactions} />
      </div>
    </div>
  );
}

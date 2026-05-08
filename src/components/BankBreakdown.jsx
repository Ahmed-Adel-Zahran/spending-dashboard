import { formatCurrency, BANK_COLORS } from '../utils/formatting';

export default function BankBreakdown({ transactions }) {
  const debits = transactions.filter((t) => t.amount < 0);
  const bankData = {};

  for (const tx of debits) {
    const key = tx.bank;
    if (!bankData[key]) {
      bankData[key] = { bank: key, total: 0, accounts: {} };
    }
    bankData[key].total += Math.abs(tx.amount);

    const acctKey = tx.accountType;
    if (!bankData[key].accounts[acctKey]) {
      bankData[key].accounts[acctKey] = 0;
    }
    bankData[key].accounts[acctKey] += Math.abs(tx.amount);
  }

  const banks = Object.values(bankData).sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...banks.map((b) => b.total), 1);

  if (banks.length === 0) {
    return (
      <div className="bg-navy-800 rounded-xl p-6 text-slate-500 text-center">
        No bank data
      </div>
    );
  }

  return (
    <div className="bg-navy-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">Spending by Bank</h3>
      <div className="space-y-4">
        {banks.map((b) => (
          <div key={b.bank}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium" style={{ color: BANK_COLORS[b.bank] || '#94a3b8' }}>
                {b.bank}
              </span>
              <span className="text-sm text-slate-400">{formatCurrency(b.total)}</span>
            </div>
            <div className="w-full bg-navy-700 rounded-full h-3 mb-2">
              <div
                className="h-3 rounded-full transition-all"
                style={{
                  width: `${(b.total / maxTotal) * 100}%`,
                  backgroundColor: BANK_COLORS[b.bank] || '#64748b',
                }}
              />
            </div>
            <div className="pl-4 space-y-1">
              {Object.entries(b.accounts).sort(([, a], [, b]) => b - a).map(([acct, amount]) => (
                <div key={acct} className="flex justify-between text-xs text-slate-500">
                  <span>{acct}</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

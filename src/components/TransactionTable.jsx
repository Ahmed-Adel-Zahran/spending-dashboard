import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDate, getCategoryEmoji, getCategoryColor, getAllCategories, addCustomCategory } from '../utils/formatting';
import { useTransactionStore } from '../store/transactions';

const PAGE_SIZE = 50;

const PALETTE = [
  '#4ade80', '#f97316', '#a855f7', '#3b82f6', '#ef4444',
  '#eab308', '#ec4899', '#06b6d4', '#8b5cf6', '#10b981',
];

function CategoryPicker({ transaction, anchorRef, onClose }) {
  const { updateCategory } = useTransactionStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const nameRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 320;
      setPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 290),
        openUp,
      });
    }
    inputRef.current?.focus();
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  const categories = getAllCategories();
  const filtered = search
    ? categories.filter((c) => c.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const handleSelect = (category, applyToAll) => {
    updateCategory(transaction.id, category, applyToAll);
    onClose();
  };

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const emoji = newEmoji.trim() || '🏷️';
    addCustomCategory(name, emoji, newColor);
    handleSelect(name, false);
  };

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] bg-navy-700 border border-navy-500 rounded-lg shadow-2xl w-72 max-h-80 overflow-hidden"
      style={{
        top: pos.openUp ? undefined : pos.top,
        bottom: pos.openUp ? window.innerHeight - pos.top + 4 : undefined,
        left: pos.left,
      }}
    >
      {!creating ? (
        <>
          <div className="p-2 border-b border-navy-600">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-800 border border-navy-500 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-accent"
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.map((cat) => (
              <div
                key={cat}
                className="group flex items-center justify-between px-3 py-1.5 hover:bg-navy-600 cursor-pointer text-xs"
              >
                <span
                  className="flex items-center gap-2 flex-1"
                  onClick={() => handleSelect(cat, false)}
                >
                  <span>{getCategoryEmoji(cat)}</span>
                  <span className="text-slate-200">{cat}</span>
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelect(cat, true); }}
                  className="hidden group-hover:block text-accent text-[10px] hover:underline shrink-0 ml-2"
                  title="Apply to all transactions with this merchant"
                >
                  apply to all
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-navy-600 p-2">
            <button
              onClick={() => setCreating(true)}
              className="w-full text-xs text-accent hover:text-accent/80 py-1 transition-colors"
            >
              + Create custom category
            </button>
          </div>
        </>
      ) : (
        <div className="p-3 space-y-3">
          <div className="text-xs font-medium text-slate-300">New Category</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="😀"
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="w-10 bg-navy-800 border border-navy-500 rounded px-1 py-1 text-center text-sm text-slate-200 focus:outline-none focus:border-accent"
              maxLength={2}
            />
            <input
              ref={nameRef}
              type="text"
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 bg-navy-800 border border-navy-500 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Color</div>
            <div className="flex gap-1.5 flex-wrap">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className="w-5 h-5 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    outline: newColor === c ? '2px solid white' : 'none',
                    outlineOffset: 1,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCreating(false)}
              className="flex-1 text-xs text-slate-400 hover:text-slate-200 py-1.5 rounded bg-navy-800 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 text-xs text-navy-900 font-medium py-1.5 rounded bg-accent hover:bg-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Create & Apply
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function TransactionRow({ tx, editingId, setEditingId }) {
  const pillRef = useRef(null);
  return (
    <tr className="border-b border-navy-700/50 hover:bg-navy-700/30">
      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{formatDate(tx.date)}</td>
      <td className="py-2 px-3 text-slate-200 max-w-xs truncate">{tx.description}</td>
      <td className={`py-2 px-3 font-medium whitespace-nowrap ${tx.amount < 0 ? 'text-debit' : 'text-credit'}`}>
        {formatCurrency(tx.amount)}
      </td>
      <td className="py-2 px-3 whitespace-nowrap">
        {tx.category && (
          <span
            ref={pillRef}
            onClick={() => setEditingId(editingId === tx.id ? null : tx.id)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-pointer hover:ring-2 hover:ring-accent/50 transition-all"
            style={{
              backgroundColor: getCategoryColor(tx.category) + '20',
              color: getCategoryColor(tx.category),
              border: `1px solid ${getCategoryColor(tx.category)}40`,
            }}
          >
            {getCategoryEmoji(tx.category)} {tx.category}
          </span>
        )}
        {editingId === tx.id && (
          <CategoryPicker
            transaction={tx}
            anchorRef={pillRef}
            onClose={() => setEditingId(null)}
          />
        )}
      </td>
      <td className="py-2 px-3 text-slate-400 text-xs">
        {tx.bank} · {tx.accountType}
      </td>
    </tr>
  );
}

export default function TransactionTable({ transactions, initialCategory, onClearCategory }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (initialCategory) {
      setCategoryFilter(initialCategory);
      onClearCategory?.();
    }
  }, [initialCategory, onClearCategory]);

  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter, bankFilter, typeFilter, transactions]);

  const banks = useMemo(
    () => [...new Set(transactions.map((t) => t.bank))].sort(),
    [transactions]
  );

  const usedCategories = useMemo(
    () => [...new Set(transactions.map((t) => t.category).filter(Boolean))].sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    let result = transactions;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(q));
    }
    if (categoryFilter) result = result.filter((t) => t.category === categoryFilter);
    if (bankFilter) result = result.filter((t) => t.bank === bankFilter);
    if (typeFilter) result = result.filter((t) => t.type === typeFilter);

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'description') cmp = a.description.localeCompare(b.description);
      else if (sortField === 'category') cmp = (a.category || '').localeCompare(b.category || '');
      else if (sortField === 'bank') cmp = a.bank.localeCompare(b.bank);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [transactions, search, categoryFilter, bankFilter, typeFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-accent ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const inputClass = 'bg-navy-700 border border-navy-500 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-accent';

  return (
    <div className="bg-navy-800 rounded-xl p-6">
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search merchant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} flex-1 min-w-48`}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass}>
          <option value="">All Categories</option>
          {usedCategories.map((c) => (
            <option key={c} value={c}>{getCategoryEmoji(c)} {c}</option>
          ))}
        </select>
        <select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)} className={inputClass}>
          <option value="">All Banks</option>
          {banks.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputClass}>
          <option value="">All Types</option>
          <option value="debit">Debits</option>
          <option value="credit">Credits</option>
        </select>
      </div>

      <div className="text-xs text-slate-500 mb-3">
        {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        <span className="text-slate-600 ml-2">· click a category to change it</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-600 text-left">
              {[
                { key: 'date', label: 'Date' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount' },
                { key: 'category', label: 'Category' },
                { key: 'bank', label: 'Bank' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="py-2 px-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                >
                  {col.label}<SortIcon field={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((tx, i) => (
              <TransactionRow
                key={tx.id || i}
                tx={tx}
                editingId={editingId}
                setEditingId={setEditingId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-navy-700">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-xs bg-navy-700 text-slate-300 rounded-lg hover:bg-navy-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-xs text-slate-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-xs bg-navy-700 text-slate-300 rounded-lg hover:bg-navy-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

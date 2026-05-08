export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function parseMonthYear(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}

export const CATEGORY_META = {
  // Food & Drink
  'Groceries':           { emoji: '🛒', color: '#4ade80', type: 'need' },
  'Dining Out':          { emoji: '🍽️', color: '#f97316', type: 'want' },
  'Coffee & Cafés':      { emoji: '☕', color: '#92400e', type: 'want' },
  'Fast Food':           { emoji: '🍔', color: '#eab308', type: 'want' },
  'Alcohol & Bars':      { emoji: '🍺', color: '#a855f7', type: 'want' },
  // Transport
  'Gas & Fuel':          { emoji: '⛽', color: '#ef4444', type: 'need' },
  'Public Transit':      { emoji: '🚌', color: '#3b82f6', type: 'need' },
  'Rideshare & Taxi':    { emoji: '🚕', color: '#fbbf24', type: 'want' },
  'Parking':             { emoji: '🅿️', color: '#6b7280', type: 'need' },
  'Car Maintenance':     { emoji: '🔧', color: '#78716c', type: 'need' },
  // Home
  'Rent & Mortgage':     { emoji: '🏠', color: '#8b5cf6', type: 'need' },
  'Utilities':           { emoji: '💡', color: '#f59e0b', type: 'need' },
  'Internet & Phone':    { emoji: '📱', color: '#06b6d4', type: 'need' },
  'Home Improvement':    { emoji: '🔨', color: '#d97706', type: 'want' },
  'Furniture & Decor':   { emoji: '🪑', color: '#a16207', type: 'want' },
  // Shopping
  'Clothing & Apparel':  { emoji: '👕', color: '#ec4899', type: 'want' },
  'Electronics & Tech':  { emoji: '💻', color: '#6366f1', type: 'want' },
  'Amazon & Online':     { emoji: '📦', color: '#f97316', type: 'want' },
  'General Shopping':    { emoji: '🛍️', color: '#d946ef', type: 'want' },
  // Health
  'Pharmacy & Medicine': { emoji: '💊', color: '#10b981', type: 'need' },
  'Doctor & Medical':    { emoji: '🏥', color: '#14b8a6', type: 'need' },
  'Dental & Vision':     { emoji: '🦷', color: '#0ea5e9', type: 'need' },
  'Fitness & Gym':       { emoji: '🏋️', color: '#22c55e', type: 'want' },
  'Personal Care & Spa': { emoji: '💆', color: '#f472b6', type: 'want' },
  // Entertainment
  'Movies & Streaming':  { emoji: '🎬', color: '#e11d48', type: 'want' },
  'Gaming':              { emoji: '🎮', color: '#7c3aed', type: 'want' },
  'Events & Concerts':   { emoji: '🎵', color: '#e879f9', type: 'want' },
  'Books & Media':       { emoji: '📚', color: '#0d9488', type: 'want' },
  'Hobbies':             { emoji: '🎨', color: '#fb923c', type: 'want' },
  // Travel
  'Flights':             { emoji: '✈️', color: '#0284c7', type: 'want' },
  'Hotels & Lodging':    { emoji: '🏨', color: '#7c3aed', type: 'want' },
  'Travel Activities':   { emoji: '🗺️', color: '#059669', type: 'want' },
  // Financial
  'Transfers':           { emoji: '🔄', color: '#64748b', type: 'transfer' },
  'Loan Payments':       { emoji: '🏦', color: '#475569', type: 'need' },
  'Bank Fees':           { emoji: '🏧', color: '#94a3b8', type: 'need' },
  'Interest Charges':    { emoji: '📈', color: '#dc2626', type: 'need' },
  'ATM Withdrawals':     { emoji: '💵', color: '#65a30d', type: 'transfer' },
  'Insurance':           { emoji: '🛡️', color: '#0891b2', type: 'need' },
  // Recurring
  'Subscriptions':       { emoji: '🔁', color: '#8b5cf6', type: 'want' },
  'Memberships':         { emoji: '🎫', color: '#a855f7', type: 'want' },
  // Other
  'Charity & Donations': { emoji: '❤️', color: '#f43f5e', type: 'want' },
  'Government & Taxes':  { emoji: '🏛️', color: '#334155', type: 'need' },
  'Education & Courses': { emoji: '🎓', color: '#2563eb', type: 'want' },
  'Pets':                { emoji: '🐾', color: '#ca8a04', type: 'need' },
  'Kids & Family':       { emoji: '👨‍👩‍👧', color: '#e879f9', type: 'need' },
  // Income
  'Salary & Payroll':    { emoji: '💰', color: '#00E5A0', type: 'transfer' },
  'Refunds & Returns':   { emoji: '↩️', color: '#22d3ee', type: 'transfer' },
  'Uncategorized':       { emoji: '❓', color: '#475569', type: 'want' },
};

const CUSTOM_CATEGORIES_KEY = 'spending_dashboard_custom_categories';

function loadCustomCategories() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY) || '{}');
  } catch {
    return {};
  }
}

let customCategories = loadCustomCategories();

export function getCustomCategories() {
  return { ...customCategories };
}

export function addCustomCategory(name, emoji, color) {
  customCategories[name] = { emoji, color };
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(customCategories));
}

export function getAllCategories() {
  return [...Object.keys(CATEGORY_META), ...Object.keys(customCategories)];
}

export const CATEGORIES = Object.keys(CATEGORY_META);

export function getCategoryColor(cat) {
  return CATEGORY_META[cat]?.color || customCategories[cat]?.color || '#475569';
}

export function getCategoryEmoji(cat) {
  return CATEGORY_META[cat]?.emoji || customCategories[cat]?.emoji || '❓';
}

export function getCategoryType(cat) {
  return CATEGORY_META[cat]?.type || customCategories[cat]?.type || 'want';
}

export const SPENDING_TYPE_META = {
  need:     { label: 'Needs',     color: '#3b82f6', description: 'Essential expenses you can\'t avoid' },
  want:     { label: 'Wants',     color: '#f97316', description: 'Nice-to-haves you could cut back on' },
  transfer: { label: 'Transfers', color: '#64748b', description: 'Money movement, not real spending' },
};

let idCounter = 0;
export function generateTransactionId(tx) {
  idCounter++;
  const str = `${tx.date}|${tx.amount}|${tx.description}|${idCounter}|${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return `${hash.toString(36)}_${idCounter}`;
}

export const BANK_COLORS = {
  RBC: '#006AC3',
  CIBC: '#C41230',
  'American Express': '#2E77BC',
};

const CA_PROVINCES = 'AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT';
const CITY_PROVINCE_RE = new RegExp(
  `\\s+[A-Z][A-Za-z'-]{3,}\\s+(?:${CA_PROVINCES})\\s*$`
);
const PROVINCE_ONLY_RE = new RegExp(`\\s+(?:${CA_PROVINCES})\\s*$`);
const COUNTRY_SUFFIX_RE = /\s+(?:CAN|USA|EGY|GBR?)\s*$/i;

export function cleanMerchantName(desc) {
  if (!desc) return desc;
  let cleaned = desc;
  const cityMatch = cleaned.match(CITY_PROVINCE_RE);
  if (cityMatch) {
    const before = cleaned.slice(0, cityMatch.index);
    if (before.length >= 3) {
      cleaned = before;
    }
  }
  return cleaned
    .replace(COUNTRY_SUFFIX_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

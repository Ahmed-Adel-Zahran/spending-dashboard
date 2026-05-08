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
  'Groceries':           { emoji: '🛒', color: '#4ade80' },
  'Dining Out':          { emoji: '🍽️', color: '#f97316' },
  'Coffee & Cafés':      { emoji: '☕', color: '#92400e' },
  'Fast Food':           { emoji: '🍔', color: '#eab308' },
  'Alcohol & Bars':      { emoji: '🍺', color: '#a855f7' },
  'Gas & Fuel':          { emoji: '⛽', color: '#ef4444' },
  'Public Transit':      { emoji: '🚌', color: '#3b82f6' },
  'Rideshare & Taxi':    { emoji: '🚕', color: '#fbbf24' },
  'Parking':             { emoji: '🅿️', color: '#6b7280' },
  'Car Maintenance':     { emoji: '🔧', color: '#78716c' },
  'Rent & Mortgage':     { emoji: '🏠', color: '#8b5cf6' },
  'Utilities':           { emoji: '💡', color: '#f59e0b' },
  'Internet & Phone':    { emoji: '📱', color: '#06b6d4' },
  'Home Improvement':    { emoji: '🔨', color: '#d97706' },
  'Furniture & Decor':   { emoji: '🪑', color: '#a16207' },
  'Clothing & Apparel':  { emoji: '👕', color: '#ec4899' },
  'Electronics & Tech':  { emoji: '💻', color: '#6366f1' },
  'Amazon & Online':     { emoji: '📦', color: '#f97316' },
  'General Shopping':    { emoji: '🛍️', color: '#d946ef' },
  'Pharmacy & Medicine': { emoji: '💊', color: '#10b981' },
  'Doctor & Medical':    { emoji: '🏥', color: '#14b8a6' },
  'Dental & Vision':     { emoji: '🦷', color: '#0ea5e9' },
  'Fitness & Gym':       { emoji: '🏋️', color: '#22c55e' },
  'Personal Care & Spa': { emoji: '💆', color: '#f472b6' },
  'Movies & Streaming':  { emoji: '🎬', color: '#e11d48' },
  'Gaming':              { emoji: '🎮', color: '#7c3aed' },
  'Events & Concerts':   { emoji: '🎵', color: '#e879f9' },
  'Books & Media':       { emoji: '📚', color: '#0d9488' },
  'Hobbies':             { emoji: '🎨', color: '#fb923c' },
  'Flights':             { emoji: '✈️', color: '#0284c7' },
  'Hotels & Lodging':    { emoji: '🏨', color: '#7c3aed' },
  'Travel Activities':   { emoji: '🗺️', color: '#059669' },
  'Transfers':           { emoji: '🔄', color: '#64748b' },
  'Loan Payments':       { emoji: '🏦', color: '#475569' },
  'Bank Fees':           { emoji: '🏧', color: '#94a3b8' },
  'Interest Charges':    { emoji: '📈', color: '#dc2626' },
  'ATM Withdrawals':     { emoji: '💵', color: '#65a30d' },
  'Insurance':           { emoji: '🛡️', color: '#0891b2' },
  'Subscriptions':       { emoji: '🔁', color: '#8b5cf6' },
  'Memberships':         { emoji: '🎫', color: '#a855f7' },
  'Charity & Donations': { emoji: '❤️', color: '#f43f5e' },
  'Government & Taxes':  { emoji: '🏛️', color: '#334155' },
  'Education & Courses': { emoji: '🎓', color: '#2563eb' },
  'Pets':                { emoji: '🐾', color: '#ca8a04' },
  'Kids & Family':       { emoji: '👨‍👩‍👧', color: '#e879f9' },
  'Salary & Payroll':    { emoji: '💰', color: '#00E5A0' },
  'Refunds & Returns':   { emoji: '↩️', color: '#22d3ee' },
  'Uncategorized':       { emoji: '❓', color: '#475569' },
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

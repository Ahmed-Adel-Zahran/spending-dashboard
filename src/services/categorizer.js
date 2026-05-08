import { CATEGORIES } from '../utils/formatting';

const CACHE_KEY = 'spending_dashboard_category_cache';
const MERCHANT_MAP_KEY = 'spending_dashboard_merchant_map';

function getCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setCache(cache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function cacheKey(tx) {
  return `${tx.description}|${tx.amount}`;
}

export function getMerchantMap() {
  try {
    return JSON.parse(localStorage.getItem(MERCHANT_MAP_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setMerchantCategory(description, category) {
  const map = getMerchantMap();
  const normalized = normalizeMerchant(description);
  map[normalized] = category;
  localStorage.setItem(MERCHANT_MAP_KEY, JSON.stringify(map));

  const cache = getCache();
  for (const key of Object.keys(cache)) {
    if (key.startsWith(description + '|')) {
      cache[key] = category;
    }
  }
  setCache(cache);
}

function normalizeMerchant(desc) {
  return desc
    .toLowerCase()
    .replace(/[#\d]{3,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\b(ca|on|ab|bc|qc|mb|sk|ns|nb|pe|nl)\b/g, '')
    .replace(/\b\d{4,}\b/g, '')
    .trim();
}

function lookupMerchantMap(description) {
  const map = getMerchantMap();
  const normalized = normalizeMerchant(description);
  if (map[normalized]) return map[normalized];

  for (const [merchant, cat] of Object.entries(map)) {
    if (normalized.includes(merchant) || merchant.includes(normalized)) {
      return cat;
    }
  }
  return null;
}

export async function categorizeTransactions(transactions, onProgress) {
  const cache = getCache();
  const uncategorized = [];
  const results = [];

  for (const tx of transactions) {
    const key = cacheKey(tx);
    if (cache[key]) {
      results.push({ ...tx, category: cache[key] });
    } else {
      uncategorized.push(tx);
    }
  }

  if (uncategorized.length === 0) {
    onProgress?.(100);
    return results;
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    for (const tx of uncategorized) {
      const cat = fallbackCategorize(tx);
      cache[cacheKey(tx)] = cat;
      results.push({ ...tx, category: cat });
    }
    setCache(cache);
    onProgress?.(100);
    return results;
  }

  const batchSize = 50;
  let completed = 0;

  for (let i = 0; i < uncategorized.length; i += batchSize) {
    const batch = uncategorized.slice(i, i + batchSize);
    const batchItems = batch.map((tx, idx) => ({
      id: idx,
      description: tx.description,
      amount: tx.amount,
      date: tx.date,
    }));

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: `Categorize each bank transaction into exactly one category. Return ONLY a JSON array of objects with "id" and "category" fields.

Categories: ${CATEGORIES.join(', ')}

Transactions:
${JSON.stringify(batchItems, null, 2)}

Return ONLY valid JSON array, no other text.`,
          }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.content[0].text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('No JSON array in response');

      const categories = JSON.parse(jsonMatch[0]);

      for (const cat of categories) {
        const tx = batch[cat.id];
        if (tx) {
          const validCat = CATEGORIES.includes(cat.category) ? cat.category : 'Uncategorized';
          cache[cacheKey(tx)] = validCat;
          results.push({ ...tx, category: validCat });
        }
      }

      const missing = batch.filter((_, idx) => !categories.find((c) => c.id === idx));
      for (const tx of missing) {
        const cat = fallbackCategorize(tx);
        cache[cacheKey(tx)] = cat;
        results.push({ ...tx, category: cat });
      }
    } catch (err) {
      console.error('Categorization API error:', err);
      for (const tx of batch) {
        const cat = fallbackCategorize(tx);
        cache[cacheKey(tx)] = cat;
        results.push({ ...tx, category: cat });
      }
    }

    completed += batch.length;
    onProgress?.(Math.round((completed / uncategorized.length) * 100));
  }

  setCache(cache);
  return results;
}

const RULES = [
  // --- Food & Drink ---
  // Groceries
  [/loblaws|loblaw|superstore|no\s?frills|freshco|food\s?basics|sobeys|safeway|metro(?!\s*p)|iga\b|voila|farm\s?boy|longos|fortinos|zehrs|valu-?mart|t&t|nations|adonis|whole\s?foods|costco|walmart(?!\.com)|wal-?mart|maxi\b|provigo|save-?on|co-?op\b.*food|galleria|oceans|food\s?depot|your\s?independent|highland\s?farms|starsky|pusateri|mcewan|summerhill\s?market|fiesta\s?farms|rabba|hasty\s?market|grocerymarket|bulk\s?barn|natural\s?food/i, 'Groceries'],
  // Dining Out
  [/restaurant|resto\b|dining|kitchen(?!aid)|grill\b|bistro|sushi|thai\b|pho\b|ramen|trattoria|osteria|brasserie|tavern|diner\b|steakhouse|seafood|buffet|chophouse|izakaya|dim\s?sum|curry|tandoori|shawarma|falafel|burrito|taco(?!bell)|noodle|wok\b|teriyaki|hibachi|fondue|creperie|patisserie|brunch|eatery|cantina|pub\s?&|gastropub|food\s?hall|olive\s?garden|east\s?side\s?mario|milestone|the\s?keg|jack\s?astor|moxie|earls|joey\s?rest|cactus\s?club|original\s?joe|white\s?spot|boston\s?pizza|bp\s?grill|st-?hubert|scores|la\s?cage|baton\s?rouge|swiss\s?chalet/i, 'Dining Out'],
  // Coffee & Cafés
  [/starbucks|tim\s?horton|tims\b|second\s?cup|coffee|café|cafe\b|espresso|latte|balzac|bridgehead|blenz|dark\s?horse|pilot\s?coffee|sam\s?james|jimmy's\s?coffee|aroma|mcdonald.*coffee|mccafe|mc\s?cafe|dutch\s?bros|peet's|tea\s?shop|david's\s?tea|cha\s?time|gong\s?cha|chatime|boba|bubble\s?tea/i, 'Coffee & Cafés'],
  // Fast Food
  [/mcdonald|wendy|burger\s?king|kfc|popeye|subway|pizza\s?(pizza|hut|nova|73)|a&w\b|harvey's|taco\s?bell|chipotle|five\s?guys|mary\s?brown|fat\s?burger|hero\s?burger|south\s?st\.?\s?burger|burger\s?priest|fresh\s?burger|panera|chick-?fil-?a|shake\s?shack|panda\s?express|arby|dairy\s?queen|dq\b|little\s?caesar|domino|papa\s?john|new\s?york\s?fries|quesada|mucho\s?burrito|extreme\s?pita|pita\s?pit|mr\.?\s?sub|quiznos|firehouse|jimmy\s?john|uber\s?eats|doordash|skip\s?the\s?dish|grubhub|fantuan|ritual\b|foodora|instacart|cornershop/i, 'Fast Food'],
  // Alcohol & Bars
  [/lcbo|beer\s?store|wine\s?rack|saq\b|liquor|brewing|brewery|wine(?!rs)|distiller|vintages|bar\s|pub\s|\bbar\b|\btap\b|cocktail|lounge|nightclub|spirits/i, 'Alcohol & Bars'],

  // --- Transport ---
  // Gas & Fuel
  [/shell\b|esso\b|petro[\s-]?can|gas\b|fuel|pioneer\b|ultramar|husky\b|mobil\b|chevron|sunoco|irving\b|co-?op\s?gas|domo\b|fas\s?gas|circle\s?k(?!.*store)|on\s?the\s?run|couche[\s-]?tard|mac's\b|petroleum|bp\s?gas|4cents/i, 'Gas & Fuel'],
  // Public Transit
  [/presto|ttc\b|go\s?transit|octranspo|stm\b|translink|transit|metrolinx|via\s?rail|up\s?express|miway|grt\b|oc\s?transpo|ecopass|compass\s?card|bus\s?pass|metro\s?pass/i, 'Public Transit'],
  // Rideshare & Taxi
  [/uber(?!\s*eats)|lyft|taxi|cab\b|beck\s?taxi|co-?op\s?cab|covoit|rideshare/i, 'Rideshare & Taxi'],
  // Parking
  [/parking|impark|green\s?p|indigo\s?park|precise\s?park|park\s?mobile|honk\s?mobile|meter|parkade/i, 'Parking'],
  // Car Maintenance
  [/jiffy\s?lube|midas|mr\.?\s?lube|canadian\s?tire(?!\s*gas)|active\s?green|auto\s?parts|napa\b|partsource|auto\s?repair|mechanic|tire|meineke|speedy\s?auto|oil\s?change|car\s?wash|kal\s?tire|fountain\s?tire|ok\s?tire/i, 'Car Maintenance'],

  // --- Home ---
  // Rent & Mortgage
  [/rent\b|mortgage|landlord|tenant|property\s?mgmt|property\s?management|leasing|capreit|boardwalk|killam|realstar|minto\s?group/i, 'Rent & Mortgage'],
  // Utilities
  [/hydro|enbridge|gas\s?bill|electricity|water\s?bill|utility|utilit|toronto\s?hydro|hydro\s?one|hydro[\s-]?qu|alectra|epcor|fortis\b|bc\s?hydro|nova\s?scotia\s?power|nb\s?power|sask\s?power|manitoba\s?hydro|union\s?gas|atco\b|direct\s?energy/i, 'Utilities'],
  // Internet & Phone
  [/rogers\b|bell\b(?!.*rest)|telus|fido\b|koodo|virgin\b(?!.*air)|freedom\s?mob|shaw\b|videotron|cogeco|eastlink|sasktel|tbaytel|ice\s?wireless|public\s?mobile|chatr|lucky\s?mobile|fizz\b|teksavvy|start\.ca|can\s?net|carry\s?telecom|distributel|vmedia|internet|phone\s?bill|wireless\s?bill|cell\s?bill|mobile\s?bill/i, 'Internet & Phone'],
  // Home Improvement
  [/home\s?depot|lowes|lowe's|rona\b|home\s?hardware|kent\b(?!.*cloth)|ace\s?hardware|renovation|plumb|electri.*supply|lumber|building\s?supply|benjamin\s?moore|sherwin|dulux|cloverdale\s?paint/i, 'Home Improvement'],
  // Furniture & Decor
  [/ikea|structube|eq3\b|the\s?brick|leon's|wayfair|crate\s?&?\s?barrel|pottery\s?barn|cb2\b|west\s?elm|pier\s?1|home\s?sense|homesense|bed\s?bath|kitchen\s?stuff|williams[\s-]?sonoma|restoration\s?hardware|furniture|mattress|sleep\s?country/i, 'Furniture & Decor'],

  // --- Shopping ---
  // Clothing & Apparel
  [/clothing|h&m\b|zara\b|gap\b|old\s?navy|winners|nordstrom|uniqlo|aritzia|lululemon|roots\b|joe\s?fresh|simons|sport\s?chek|mark's\b|fashion|apparel|shoe|foot\s?locker|aldo\b|call\s?it\s?spring|dsw\b|skechers|nike\b|adidas|under\s?armour|puma\b|lacoste|ralph\s?lauren|tommy\b|calvin\s?klein|banana\s?republic|j\.?\s?crew|express\b(?!.*mail)|american\s?eagle|ae\b|aeo\b|hollister|abercrombie|forever\s?21|urban\s?outfitter|anthropologie|free\s?people|frank\s?&\s?oak|tentree|reitmans|penningtons|addition\s?elle|laura\b(?!.*rest)|rw&co|le\s?chateau|suzy\s?shier|dynamite|garage\b(?!.*auto)|ardene|bluenotes|bootlegger|rickis|cleo|northern\s?reflect|sears|the\s?bay|hudson.*bay|hbc\b|marshalls|ross\b/i, 'Clothing & Apparel'],
  // Electronics & Tech
  [/best\s?buy|apple\s?store|staples|electronic|canada\s?computer|memory\s?express|micro\s?center|newegg|b&h\b|the\s?source|visions\b|london\s?drugs(?!.*pharm)/i, 'Electronics & Tech'],
  // Amazon & Online
  [/amazon|amzn|prime\b(?!.*video)|aws\b/i, 'Amazon & Online'],
  // General Shopping
  [/dollarama|dollar\s?tree|giant\s?tiger|miniso|daiso|muji\b|indigo\b(?!.*park)|chapters|toys\s?r\s?us|mastermind|crayola|michaels|hobby\s?lobby|craft|sephora|bath\s?&\s?body|lush\b|shopify|etsy|ebay|aliexpress|shein|wish\.com|temu|marketplace|mall\b|plaza\b|outlet|depot(?!.*home)|store\b|shop\b|retail|purchase/i, 'General Shopping'],

  // --- Health & Wellness ---
  // Pharmacy & Medicine
  [/shoppers\s?drug|pharma|rexall|medicine|prescription|rx\b|london\s?drugs.*pharm|jean\s?coutu|familiprix|uniprix|brunet|guardian|ida\b|pharmasave|medic.*supply|drug\s?mart/i, 'Pharmacy & Medicine'],
  // Doctor & Medical
  [/doctor|dr\.\s|clinic|hospital|medical|health\s?care|lab\b(?!att)|lifelabs|dynacare|blood|xray|x-ray|mri\b|imaging|specialist|surgeon|physician|therap|physiother|chiropract|osteopath|naturopath|acupunct|psycholog|psychiatr|counsel|walk[\s-]?in/i, 'Doctor & Medical'],
  // Dental & Vision
  [/dentist|dental|optom|optician|vision|eye\s?care|glasses|lenscrafters|clearly|specsavers|pearl\s?vision|hakim|eye\s?exam|contact\s?lens/i, 'Dental & Vision'],
  // Fitness & Gym
  [/gym\b|fitness|goodlife|fit4less|planet\s?fitness|anytime\s?fitness|equinox|orangetheory|f45\b|crossfit|yoga|pilates|spin\s?class|barre|martial\s?art|boxing|swimming\s?pool|rec\s?centre|ymca|ywca|goodlife\s?clubs/i, 'Fitness & Gym'],
  // Personal Care & Spa
  [/spa\b|salon|barber|hair\s?cut|haircut|nail|manicure|pedicure|massage|wax|beauty|esthetic|dermatolog|skin\s?care|facial|brow|lash/i, 'Personal Care & Spa'],

  // --- Entertainment ---
  // Movies & Streaming
  [/cineplex|cinema|movie|imax|landmark\s?theatre|film|netflix|disney\s?\+|disney\s?plus|crave\b|prime\s?video|paramount\s?\+|apple\s?tv|hbo|hulu|mubi|criterion|tubi|plex/i, 'Movies & Streaming'],
  // Gaming
  [/steam\b|playstation|xbox|nintendo|epic\s?games|riot\s?games|blizzard|ea\s?games|game\s?stop|eb\s?games|twitch|gaming/i, 'Gaming'],
  // Events & Concerts
  [/ticketmaster|stubhub|vivid\s?seats|concert|festival|event|exhibition|museum|gallery|zoo|aquarium|amusement|canada's\s?wonderland|ticket|admission|arena|stadium|theatre(?!.*landmark)|performing\s?art/i, 'Events & Concerts'],
  // Books & Media
  [/book|amazon.*kindle|kobo\b|audible|library|bookstore|scholar|penguin|publishing/i, 'Books & Media'],
  // Hobbies
  [/hobby|craft\s?store|art\s?supply|music\s?store|instrument|photography|camera|camp(?!us)|outdoor|mec\b|sail\b|sport\s?mart|atmosphere|bass\s?pro|cabela/i, 'Hobbies'],

  // --- Travel ---
  // Flights
  [/air\s?canada|westjet|porter\s?air|flair\b|swoop|sunwing|transat|flight|airline|airways|united\s?air|delta\s?air|american\s?air|british\s?air|lufthansa|klm\b|air\s?france|emirates|cathay|singapore\s?air|japan\s?air|korean\s?air|qantas|avianca|copa\b|aeromexico|expedia.*air|kayak.*air|boarding\s?pass|seat\s?selection/i, 'Flights'],
  // Hotels & Lodging
  [/hotel|airbnb|vrbo|marriott|hilton|hyatt|ihg\b|holiday\s?inn|best\s?western|comfort\s?inn|days\s?inn|super\s?8|motel|fairmont|four\s?seasons|ritz|westin|sheraton|delta\s?hotel|inn\b|lodge|hostel|resort|booking\.com|hotels\.com|trivago|expedia.*hotel/i, 'Hotels & Lodging'],
  // Travel Activities
  [/tour|excursion|adventure|rental\s?car|enterprise|hertz|avis|budget\s?car|national\s?car|alamo\b|zipcar|turo\b|cruise|carnival|royal\s?caribbean|travel\s?insur|world\s?nomad|nexus|global\s?entry|currency\s?exchange|forex/i, 'Travel Activities'],

  // --- Financial ---
  // Transfers
  [/transfer|e-?transfer|etransfer|tfr\b|xfer|interac\s?e|send\s?money|wire\b|remit|bill\s?py?mt|payment\s?-?\s?thank\s?you|paiement\s?-?\s?merci|inter-?fi\s?fund/i, 'Transfers'],
  // Salary & Payroll
  [/payroll|salary|direct\s?deposit|pay\s?-|employer|wage|income\s?deposit|company\s?pay|payroll\s?deposit|morgan\s?stanley/i, 'Salary & Payroll'],
  // ATM Withdrawals
  [/atm\b|withdraw|cash\s?advance|cash\s?back/i, 'ATM Withdrawals'],
  // Bank Fees
  [/fee\b|service\s?charge|monthly\s?plan|account\s?fee|maintenance\s?fee|nsf\b|overdraft|annual\s?fee|admin\s?fee/i, 'Bank Fees'],
  // Interest Charges
  [/interest(?!\s*free)/i, 'Interest Charges'],
  // Loan Payments
  [/loan|student\s?loan|nslsc|csl\b|car\s?payment|auto\s?loan|line\s?of\s?credit|loc\b|installment/i, 'Loan Payments'],
  // Insurance
  [/insurance|insur|manulife|sunlife|sun\s?life|great[\s-]?west|canada\s?life|desjardins\s?ins|intact|aviva|co-?operators|wawanesa|economical|td\s?insur|rbc\s?insur|belair|johnson\b|caa\b(?!.*rest)|green\s?shield|blue\s?cross|the\s?personal/i, 'Insurance'],

  // --- Recurring ---
  // Subscriptions
  [/spotify|netflix|disney|apple\.com|itunes|google\s?(play|one|storage)|icloud|dropbox|microsoft\s?365|office\s?365|adobe|canva|notion|slack|zoom\b|github|openai|chatgpt|claude|anthropic|youtube\s?prem|twitch\s?sub|patreon|substack|medium\b.*member|crunchyroll|curiosity\s?stream|masterclass|skillshare|coursera|duolingo|headspace|calm\b|strava|peloton|subscription|recurring|monthly\s?charge|annual\s?renew/i, 'Subscriptions'],
  // Memberships
  [/membership|member\s?fee|costco\s?member|amazon\s?prime\s?member|aaa\b|aarp|club\b|association|union\s?dues|professional\s?fee/i, 'Memberships'],

  // --- Other ---
  // Charity & Donations
  [/charit|donat|red\s?cross|united\s?way|salvation\s?army|unicef|world\s?vision|habitat|gofundme|giving|tithe|church|mosque|synagogue|temple|islamic\s?relief|muslim\s?association|yaqeen|sadaqa|intl\s?dev\s?and\s?relief|57357|mac\s?-\s?calgary/i, 'Charity & Donations'],
  // Government & Taxes
  [/government|cra\b|canada\s?revenue|tax\b|property\s?tax|income\s?tax|hst\b|gst\b|service\s?canada|service\s?ontario|icbc\b|saaq|mto\b|license|permit|passport|fine\b|penalty|parking\s?ticket|bylaw|h&r\s?block/i, 'Government & Taxes'],
  // Education & Courses
  [/university|college|school|tuition|campus|education|learning|course|udemy|linkedin\s?learn|training|workshop|seminar|conference|textbook/i, 'Education & Courses'],
  // Pets
  [/pet|vet\b|veterin|animal|petsmart|pet\s?valu|global\s?pet|mondou|ren's\s?pet|dog\b|cat\b.*food|puppy|kitten|grooming(?!.*hair)/i, 'Pets'],
  // Kids & Family
  [/daycare|childcare|baby|nursery|toys|children|kids|maternity|buy\s?buy\s?baby|carter|oshkosh|children's\s?place|kiddo|little\s?one/i, 'Kids & Family'],
  // Refunds & Returns
  [/refund|return|reversal|credit\s?adj|chargeback|reimburse|rebate/i, 'Refunds & Returns'],
];

function fallbackCategorize(tx) {
  const mapped = lookupMerchantMap(tx.description);
  if (mapped) return mapped;

  const desc = tx.description;

  for (const [pattern, category] of RULES) {
    if (pattern.test(desc)) return category;
  }

  if (tx.amount > 0 && tx.type === 'credit') {
    if (/payroll|deposit.*morgan|salary/i.test(desc)) return 'Salary & Payroll';
    if (/e-transfer|autodeposit/i.test(desc)) return 'Transfers';
    if (tx.amount > 1000) return 'Salary & Payroll';
    return 'Transfers';
  }

  return 'Uncategorized';
}

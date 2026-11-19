import { useState, useMemo } from 'react';
import { Snowflake, Camera, Mic, ShieldCheck, Sparkles, Wifi, Crown, ArrowUp, X, Lock, Check, ShoppingCart, ChefHat, Flame, Bell, Eye, Plus, Minus, Trash2, AlertTriangle, Clock, ChevronRight, Volume2, Store } from 'lucide-react';

// ---------- date helpers ----------
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoIn = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toISO(d); };
const daysLeft = (iso) => {
  if (!iso) return 0;
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
};
const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' }); };
const expiryLabel = (d) => d < 0 ? (d === -1 ? 'Expired yesterday' : `Expired ${-d}d ago`) : d === 0 ? 'Expires today' : `${d}d left`;

// Color key: RED = expired, YELLOW = expires today, ORANGE = 1-2 days, LIME = 3-5 days, GREEN = 6+ days
const tone = (d) =>
  d < 0 ? { solid: '#FF3B30', soft: 'rgba(255,59,48,.10)', pillBg: '#FF3B30', pillFg: '#fff' }
  : d === 0 ? { solid: '#FFCC00', soft: 'rgba(255,204,0,.20)', pillBg: '#FFCC00', pillFg: '#4a3b00' }
  : d <= 2 ? { solid: '#FF9500', soft: 'transparent', pillBg: 'rgba(255,149,0,.15)', pillFg: '#B35F00' }
  : d <= 5 ? { solid: '#9BD02B', soft: 'transparent', pillBg: 'rgba(155,208,43,.20)', pillFg: '#4B7A05' }
  : { solid: '#34C759', soft: 'transparent', pillBg: 'rgba(52,199,89,.15)', pillFg: '#1D8A3A' };

const seed = (arr) => arr.map(({ days, ...r }) => ({ ...r, kind: r.id, exp: isoIn(days) }));
const INITIAL_ITEMS = seed([
  { id: 'milk', name: 'Milk', emoji: '🥛', qty: 1, unit: 'carton', days: 2, shelf: 1, cal: 150 },
  { id: 'eggs', name: 'Eggs', emoji: '🥚', qty: 12, unit: 'eggs', days: 9, shelf: 1, cal: 70 },
  { id: 'spinach', name: 'Spinach', emoji: '🥬', qty: 1, unit: 'bag', days: 0, shelf: 2, cal: 20 },
  { id: 'chicken', name: 'Chicken breast', emoji: '🍗', qty: 2, unit: 'pcs', days: 2, shelf: 3, cal: 280 },
  { id: 'cheese', name: 'Cheddar', emoji: '🧀', qty: 1, unit: 'block', days: 14, shelf: 1, cal: 110 },
  { id: 'tomato', name: 'Tomatoes', emoji: '🍅', qty: 4, unit: 'pcs', days: 5, shelf: 2, cal: 25 },
  { id: 'yogurt', name: 'Yogurt', emoji: '🥣', qty: 3, unit: 'cups', days: 6, shelf: 2, cal: 120 },
  { id: 'pasta', name: 'Leftover pasta', emoji: '🍝', qty: 1, unit: 'box', days: -2, shelf: 3, cal: 400 },
  { id: 'pepper', name: 'Bell pepper', emoji: '🫑', qty: 2, unit: 'pcs', days: 6, shelf: 2, cal: 30 },
  { id: 'oj', name: 'Orange juice', emoji: '🧃', qty: 1, unit: 'bottle', days: 7, shelf: 1, cal: 110 },
]);
const SCAN_POOL = seed([
  { id: 'berries', name: 'Strawberries', emoji: '🍓', qty: 1, unit: 'pint', days: 4, shelf: 2, cal: 50 },
  { id: 'butter', name: 'Butter', emoji: '🧈', qty: 1, unit: 'stick', days: 30, shelf: 1, cal: 100 },
  { id: 'lemon', name: 'Lemons', emoji: '🍋', qty: 2, unit: 'pcs', days: 12, shelf: 2, cal: 20 },
  { id: 'basil', name: 'Basil', emoji: '🌿', qty: 1, unit: 'bunch', days: 3, shelf: 2, cal: 5 },
]);
const KEYWORDS = {
  milk: ['milk'], eggs: ['egg'], spinach: ['spinach'], chicken: ['chicken'], cheese: ['cheese', 'cheddar'],
  tomato: ['tomato'], yogurt: ['yogurt', 'yoghurt'], pasta: ['pasta'], pepper: ['pepper'], oj: ['orange juice'],
  berries: ['strawberr', 'berries'], butter: ['butter'], lemon: ['lemon'], basil: ['basil'],
};
const guessKind = (name) => { const n = name.toLowerCase(); return Object.keys(KEYWORDS).find((k) => KEYWORDS[k].some((w) => n.includes(w))) || null; };
const EMOJIS = ['🥛', '🥚', '🥬', '🍗', '🧀', '🍅', '🥣', '🍝', '🫑', '🧃', '🍎', '🥕', '🍞', '🥩', '🐟', '🥫', '🧈', '🍕'];

const RECIPES = [
  { name: 'Spinach & Cheese Omelet', emoji: '🍳', time: 10, cal: 340, ing: ['eggs', 'spinach', 'cheese'] },
  { name: 'Lemon Chicken Skillet', emoji: '🍋', time: 25, cal: 420, ing: ['chicken', 'spinach', 'pepper', 'lemon'] },
  { name: 'Tomato Basil Salad', emoji: '🥗', time: 8, cal: 230, ing: ['tomato', 'cheese', 'basil'] },
  { name: 'Veggie Scramble', emoji: '🥘', time: 12, cal: 290, ing: ['eggs', 'pepper', 'tomato'] },
  { name: 'Berry Yogurt Parfait', emoji: '🍓', time: 5, cal: 210, ing: ['yogurt', 'berries'] },
  { name: 'Chicken Pasta Bake', emoji: '🍝', time: 35, cal: 560, ing: ['chicken', 'pasta', 'tomato', 'cheese'] },
];
const CATALOG = {
  lemon: { name: 'Lemons', price: 0.79, emoji: '🍋' },
  basil: { name: 'Fresh basil', price: 2.49, emoji: '🌿' },
  berries: { name: 'Strawberries', price: 4.99, emoji: '🍓' },
  milk: { name: 'Milk', price: 3.99, emoji: '🥛' },
  spinach: { name: 'Spinach', price: 3.49, emoji: '🥬' },
  chicken: { name: 'Chicken breast', price: 8.99, emoji: '🍗' },
  eggs: { name: 'Eggs (dozen)', price: 3.79, emoji: '🥚' },
  cheese: { name: 'Cheddar', price: 4.29, emoji: '🧀' },
  tomato: { name: 'Tomatoes', price: 3.19, emoji: '🍅' },
  yogurt: { name: 'Yogurt 4-pack', price: 4.49, emoji: '🥣' },
  pasta: { name: 'Pasta', price: 1.99, emoji: '🍝' },
  pepper: { name: 'Bell peppers', price: 2.99, emoji: '🫑' },
};
const ORDER_PROVIDERS = [
  { id: 'uber', name: 'Uber Grocery', note: 'Delivery app' },
  { id: 'doordash', name: 'DoorDash', note: 'Delivery app' },
];
const STORE_OPTIONS = [
  { id: 'foodlion', name: 'Food Lion' },
  { id: 'harristeeter', name: 'Harris Teeter' },
];
const PRICE_FACTORS = { uber: 1.16, doordash: 1.11, foodlion: 0.91, harristeeter: 1.02 };
const priceEstimate = (id, source) => {
  const seedValue = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const variation = ((seedValue % 7) - 3) * 0.018;
  return Math.max(0.5, Math.round(CATALOG[id].price * (PRICE_FACTORS[source] + variation) * 100) / 100);
};
const SCOPES = [
  { key: 'names', label: 'Item names', desc: 'e.g. "Milk", "Spinach"' },
  { key: 'expiry', label: 'Expiration dates', desc: 'Days left per item' },
  { key: 'quantity', label: 'Quantities', desc: 'How much of each item' },
  { key: 'nutrition', label: 'Nutrition info', desc: 'Calories per item or meal' },
  { key: 'purchases', label: 'Ordering', desc: 'Build carts. You confirm checkout.' },
];
const ALWAYS_BLOCKED = ['Raw camera images', 'People / faces', 'Audio recordings'];
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ---------- illustrated food (vector art, each drawn around x=0, resting on y=0) ----------
const Sh = ({ x, y, w, h, o = 0.35 }) => <rect x={x} y={y} width={w} height={h} rx={w / 2} fill="#fff" opacity={o} />;
const Tom = ({ x, y, r = 7 }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#E0382B" />
    <circle cx={x} cy={y} r={r} fill="none" stroke="#9E1F16" strokeWidth=".5" opacity=".5" />
    <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.25} ry={r * 0.18} fill="#fff" opacity=".45" />
    <path d={`M${x - 3},${y - r + 1} L${x},${y - r - 1} L${x + 3},${y - r + 1} L${x},${y - r + 2.5} Z`} fill="#3F8F3A" />
  </g>
);
const Cup = ({ x }) => (
  <g transform={`translate(${x},0)`}>
    <polygon points="-5.5,-17 5.5,-17 4.2,0 -4.2,0" fill="#fff" stroke="#D6DCE2" strokeWidth=".5" />
    <polygon points="-5.2,-12 5.2,-12 4.7,-5 -4.7,-5" fill="#F472B6" />
    <rect x="-6" y="-19" width="12" height="3" rx="1" fill="#E5E7EB" stroke="#CBD2D9" strokeWidth=".4" />
    <Sh x="-4" y="-16" w="1.6" h="14" />
  </g>
);
const Pep = ({ x, c }) => (
  <g transform={`translate(${x},0)`}>
    <path d="M-7,-14 Q-9,-4 -4,0 Q0,2 4,0 Q9,-4 7,-14 Q4,-17 0,-15 Q-4,-17 -7,-14 Z" fill={c} />
    <rect x="-1" y="-21" width="2.4" height="6" rx="1" fill="#3F7D32" />
    <ellipse cx="-3.5" cy="-9" rx="1.4" ry="3.5" fill="#fff" opacity=".4" />
  </g>
);
const Straw = ({ x, y, r }) => (
  <g>
    <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill="#E11D48" />
    <path d={`M${x - r * 0.6},${y - r} L${x},${y - r - 2} L${x + r * 0.6},${y - r} L${x},${y - r + 1} Z`} fill="#3F8F3A" />
    <circle cx={x - r * 0.3} cy={y} r=".5" fill="#FDE68A" />
    <circle cx={x + r * 0.3} cy={y + r * 0.3} r=".5" fill="#FDE68A" />
  </g>
);
const Lem = ({ x, y, r = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${r})`}>
    <ellipse rx="8" ry="5.5" fill="#FACC15" />
    <ellipse cx="-8" rx="1.2" ry="1" fill="#E0AE0C" />
    <ellipse cx="8" rx="1.2" ry="1" fill="#E0AE0C" />
    <ellipse cx="-2.5" cy="-2" rx="3" ry="1.2" fill="#fff" opacity=".4" />
  </g>
);

const ART = {
  milk: () => (
    <g>
      <rect x="-10" y="-32" width="20" height="32" fill="#F7F9FB" stroke="#C5D0D8" strokeWidth=".6" />
      <polygon points="-10,-32 -5,-40 5,-40 10,-32" fill="#DCE6EC" stroke="#C5D0D8" strokeWidth=".6" />
      <rect x="-10" y="-24" width="20" height="12" fill="#3B82F6" />
      <text x="0" y="-15.5" fontSize="6" fontWeight="700" fill="#fff" textAnchor="middle">MILK</text>
      <rect x="4" y="-32" width="6" height="32" fill="#000" opacity=".07" />
      <Sh x="-8" y="-30" w="2.5" h="28" />
    </g>
  ),
  eggs: () => (
    <g>
      {[-11, -3.7, 3.7, 11].map((x) => <ellipse key={x} cx={x} cy="-11" rx="4.6" ry="6" fill="#F4E4CC" stroke="#D9BF9C" strokeWidth=".5" />)}
      <path d="M-16,-8 L-14,0 H14 L16,-8 Z" fill="#BFA07A" />
      <rect x="-16" y="-9" width="32" height="2" fill="#A98B65" />
    </g>
  ),
  spinach: () => (
    <g>
      <path d="M-11,0 L-12,-28 Q-12,-34 -8,-36 H8 Q12,-34 12,-28 L11,0 Z" fill="#9BD07A" fillOpacity=".75" stroke="#6FAE4E" strokeWidth=".6" />
      {[[-5, -12, -30], [5, -14, 25], [-2, -24, -10], [6, -26, 40], [-6, -26, -45], [0, -8, 10]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="3.6" ry="7" transform={`rotate(${r} ${x} ${y})`} fill="#3E8E41" />
      ))}
      <rect x="-10" y="-39" width="20" height="4" rx="1" fill="#E3F2D8" stroke="#6FAE4E" strokeWidth=".4" />
      <Sh x="-9" y="-33" w="2.4" h="28" o=".4" />
    </g>
  ),
  chicken: () => (
    <g>
      <rect x="-16" y="-12" width="32" height="12" rx="2" fill="#F4F6F8" stroke="#CBD3DA" strokeWidth=".6" />
      <ellipse cx="-6" cy="-12" rx="10" ry="6" fill="#F3C4A8" />
      <ellipse cx="7" cy="-11" rx="9" ry="5.5" fill="#EBB08E" />
      <path d="M-14,-10 q10,-8 28,-2" stroke="#fff" strokeOpacity=".6" fill="none" strokeWidth="1.2" />
      <rect x="-16" y="-8" width="32" height="8" fill="#fff" opacity=".3" />
      <rect x="-5" y="-6" width="10" height="4" fill="#EF4444" rx=".8" />
    </g>
  ),
  cheese: () => (
    <g>
      <polygon points="-14,-14 -9,-20 19,-20 14,-14" fill="#F9D56E" />
      <rect x="-14" y="-14" width="28" height="14" fill="#F2B632" />
      <polygon points="14,-14 19,-20 19,-6 14,0" fill="#D99A1A" />
      <rect x="-14" y="-9" width="28" height="6" fill="#E34B3A" />
      <text x="0" y="-4.6" fontSize="4.6" fontWeight="700" fill="#fff" textAnchor="middle">CHEDDAR</text>
    </g>
  ),
  tomato: () => (<g><Tom x={-8} y={-7} /><Tom x={8} y={-7} /><Tom x={0} y={-16} /></g>),
  yogurt: () => (<g><Cup x={-11} /><Cup x={0} /><Cup x={11} /></g>),
  pasta: () => (
    <g>
      <rect x="-15" y="-17" width="30" height="17" rx="2" fill="#fff" fillOpacity=".55" stroke="#B8C4CE" strokeWidth=".6" />
      <path d="M-13,-14 q4,-5 8,0 t8,0 t8,0 t8,0 V-2 H-13 Z" fill="#F0CE72" />
      <path d="M-12,-9 q3,-3 6,0 t6,0 t6,0 t6,0" fill="none" stroke="#D9A93F" strokeWidth="1" />
      <path d="M-12,-5 q3,-3 6,0 t6,0 t6,0 t6,0" fill="none" stroke="#D9A93F" strokeWidth="1" />
      <rect x="-16" y="-21" width="32" height="5" rx="1.5" fill="#4FA3E0" />
    </g>
  ),
  pepper: () => (<g><Pep x={-8} c="#D92D20" /><Pep x={8} c="#F2B90F" /></g>),
  oj: () => (
    <g>
      <rect x="-7.5" y="-26" width="15" height="26" rx="3" fill="#F59E0B" />
      <path d="M-3.5,-26 V-33 H3.5 V-26 Z" fill="#F59E0B" />
      <rect x="-4.2" y="-37" width="8.4" height="4.5" rx="1" fill="#EA580C" />
      <rect x="-7.5" y="-19" width="15" height="11" fill="#fff" />
      <circle cx="0" cy="-13.5" r="3.6" fill="#FB923C" />
      <Sh x="-6" y="-25" w="2.2" h="22" o=".45" />
    </g>
  ),
  berries: () => (
    <g>
      <Straw x={-6} y={-13} r={5} />
      <Straw x={2} y={-14} r={5} />
      <Straw x={8} y={-11} r={4.2} />
      <rect x="-12" y="-10" width="24" height="10" rx="1.5" fill="#fff" fillOpacity=".35" stroke="#B8C4CE" strokeWidth=".6" />
    </g>
  ),
  butter: () => (
    <g>
      <polygon points="-13,-9 -9,-14 17,-14 13,-9" fill="#FFF6C7" />
      <rect x="-13" y="-9" width="26" height="9" fill="#FCE588" />
      <rect x="-13" y="-6" width="26" height="4" fill="#F59E0B" opacity=".85" />
      <polygon points="13,-9 17,-14 17,-5 13,0" fill="#E6C65A" />
      <text x="0" y="-2.8" fontSize="3.6" fontWeight="700" fill="#fff" textAnchor="middle">BUTTER</text>
    </g>
  ),
  lemon: () => (<g><Lem x={-6} y={-5} r={-8} /><Lem x={6} y={-5} r={8} /><Lem x={0} y={-12} r={0} /></g>),
  basil: () => (
    <g>
      {[[-8, -20, -40], [8, -20, 40], [-4, -27, -15], [4, -27, 15], [0, -16, 0]].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4.2" ry="7" transform={`rotate(${r} ${x} ${y})`} fill={i % 2 ? '#2E7D32' : '#3C9A40'} />
      ))}
      <rect x="-1" y="-10" width="2" height="10" fill="#4C8B3A" />
      <rect x="-3" y="-8" width="6" height="2" rx="1" fill="#EF4444" />
    </g>
  ),
  generic: () => (
    <g>
      <rect x="-9" y="-24" width="18" height="24" rx="3" fill="#8B5CF6" fillOpacity=".8" stroke="#6D45C9" strokeWidth=".6" />
      <rect x="-10" y="-29" width="20" height="6" rx="1.5" fill="#374151" />
      <rect x="-9" y="-17" width="18" height="9" fill="#fff" />
      <Sh x="-7.5" y="-23" w="2" h="20" o=".4" />
    </g>
  ),
};

const FoodIcon = ({ kind, size = 28 }) => {
  const Art = ART[kind] || ART.generic;
  return (
    <svg viewBox="-20 -46 40 50" width={size} height={size} style={{ display: 'block' }}>
      <ellipse cx="0" cy="1" rx="14" ry="2.2" fill="#000" opacity=".12" />
      <Art />
    </svg>
  );
};

// ---------- realistic wide-angle fridge camera scene ----------
const SHELVES = [{ y0: 62, c: -8 }, { y0: 118, c: 0 }, { y0: 172, c: 10 }];
const boxColor = (d) => (d < 0 ? '#FF3B30' : d === 0 ? '#FFCC00' : '#34C759');

const FridgeScene = ({ items, boxes }) => {
  const placed = SHELVES.flatMap((sh, si) => {
    const row = items.filter((i) => i.shelf === si + 1);
    return row.map((it, k) => {
      const x = 44 + (k + 0.5) * (272 / row.length);
      const t = x / 360;
      const y = sh.y0 + 2 * sh.c * t * (1 - t);
      const ang = (Math.atan((2 * sh.c * (1 - 2 * t)) / 360) * 180) / Math.PI;
      const d = (x - 180) / 180;
      const s = 1.08 - 0.16 * d * d;
      return { it, x, y, ang, s };
    });
  });

  return (
    <svg viewBox="0 0 360 196" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="fc-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6FBFD" /><stop offset="1" stopColor="#C4DCE6" /></linearGradient>
        <linearGradient id="fc-sideL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8FB3C2" /><stop offset="1" stopColor="#D5E7EE" /></linearGradient>
        <linearGradient id="fc-sideR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#8FB3C2" /><stop offset="1" stopColor="#D5E7EE" /></linearGradient>
        <linearGradient id="fc-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id="fc-shelfShadow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4F7C8F" stopOpacity=".3" /><stop offset="1" stopColor="#4F7C8F" stopOpacity="0" /></linearGradient>
        <radialGradient id="fc-vig" cx=".5" cy=".5" r=".75"><stop offset=".5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".65" /></radialGradient>
        <radialGradient id="fc-glare" cx=".2" cy=".15" r=".5"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <filter id="fc-grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      </defs>

      {/* back wall + ceiling light */}
      <rect width="360" height="196" fill="url(#fc-wall)" />
      <rect width="360" height="80" fill="url(#fc-light)" />

      {/* glass shelves */}
      {SHELVES.map((sh, i) => (
        <g key={i}>
          <path d={`M0,${sh.y0 + 5} Q180,${sh.y0 + sh.c + 5} 360,${sh.y0 + 5} L360,${sh.y0 + 20} Q180,${sh.y0 + sh.c + 20} 0,${sh.y0 + 20} Z`} fill="url(#fc-shelfShadow)" />
          <path d={`M0,${sh.y0} Q180,${sh.y0 + sh.c} 360,${sh.y0} L360,${sh.y0 + 5} Q180,${sh.y0 + sh.c + 5} 0,${sh.y0 + 5} Z`} fill="#CFE9F0" fillOpacity=".75" stroke="#fff" strokeOpacity=".8" strokeWidth=".6" />
          <path d={`M0,${sh.y0 + 5} Q180,${sh.y0 + sh.c + 5} 360,${sh.y0 + 5}`} fill="none" stroke="#fff" strokeWidth="1" opacity=".9" />
        </g>
      ))}

      {/* side walls for depth */}
      <polygon points="0,0 24,12 24,184 0,196" fill="url(#fc-sideL)" />
      <polygon points="360,0 336,12 336,184 360,196" fill="url(#fc-sideR)" />
      <polygon points="0,0 360,0 336,12 24,12" fill="#fff" opacity=".9" />
      <rect x="44" y="1.5" width="272" height="4" rx="2" fill="#fff" />

      {/* food */}
      {placed.map(({ it, x, y, ang, s }) => {
        const Art = ART[it.kind] || ART.generic;
        const col = boxColor(it.days);
        const label = it.days < 0 ? 'EXPIRED' : it.days === 0 ? 'TODAY' : it.days + 'd';
        const w = label.length * 4.6 + 8;
        return (
          <g key={it.id} transform={`translate(${x} ${y}) rotate(${ang}) scale(${s})`}>
            <ellipse cx="0" cy="1" rx="15" ry="2.6" fill="#1b3a47" opacity=".25" />
            <Art />
            {boxes && (
              <g>
                {it.days <= 0 && <rect x="-19" y="-46" width="38" height="48" rx="3" fill={col} opacity=".2" />}
                <path d="M-19,-39 V-46 H-12 M12,-46 H19 V-39 M19,-5 V2 H12 M-12,2 H-19 V-5" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <rect x={-w / 2} y="-55" width={w} height="9" rx="4.5" fill={col} />
                <text x="0" y="-48.4" fontSize="6.6" fontWeight="700" textAnchor="middle" fill={it.days === 0 ? '#3b2f00' : '#fff'}>{label}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* lens effects */}
      <rect width="360" height="196" fill="url(#fc-glare)" />
      <rect width="360" height="196" fill="url(#fc-vig)" />
      <rect width="360" height="196" filter="url(#fc-grain)" opacity=".1" />
      <text x="10" y="189" fontSize="7" fill="#fff" opacity=".8" fontFamily="ui-monospace, Menlo, monospace">CAM 01 · 170° · 1080p</text>
    </svg>
  );
};

// ---------- iOS-style building blocks ----------
const BLUE = '#007AFF';
const Toggle = ({ on, onChange, disabled }) => (
  <button disabled={disabled} onClick={() => onChange(!on)} className={`relative w-[51px] h-[31px] rounded-full transition-colors shrink-0 ${disabled ? 'opacity-50' : ''}`} style={{ background: on ? '#34C759' : '#E9E9EA' }}>
    <span className="absolute top-[2px] w-[27px] h-[27px] bg-white rounded-full transition-all" style={{ left: on ? 22 : 2, boxShadow: '0 3px 8px rgba(0,0,0,.15), 0 1px 1px rgba(0,0,0,.16)' }} />
  </button>
);
const Group = ({ title, footer, children, className = '' }) => (
  <div className={className}>
    {title && <div className="px-4 pb-1.5 text-[13px] uppercase text-[#6C6C70] tracking-wide">{title}</div>}
    <div className="bg-white rounded-[12px] overflow-hidden divide-y divide-black/[0.07]">{children}</div>
    {footer && <div className="px-4 pt-1.5 text-[13px] text-[#6C6C70] leading-snug">{footer}</div>}
  </div>
);
const Tile = ({ children, bg = '#F2F2F7', size = 36 }) => (
  <div className="rounded-[9px] flex items-center justify-center shrink-0 text-[20px]" style={{ width: size, height: size, background: bg }}>{children}</div>
);
const Pill = ({ d }) => { const t = tone(d); return <span className="text-[12px] font-semibold px-2.5 py-[3px] rounded-full whitespace-nowrap" style={{ background: t.pillBg, color: t.pillFg }}>{expiryLabel(d)}</span>; };
const Segmented = ({ options, value, onChange }) => (
  <div className="flex bg-[#7676801F] rounded-[9px] p-[2px]">
    {options.map(([k, label, I]) => (
      <button key={k} onClick={() => onChange(k)} className={`flex-1 py-[6px] text-[13px] rounded-[7px] flex items-center justify-center gap-1 transition-all ${value === k ? 'bg-white font-semibold shadow-[0_3px_8px_rgba(0,0,0,.12),0_3px_1px_rgba(0,0,0,.04)]' : 'text-black/80'}`}>{I && <I size={13} />}{label}</button>
    ))}
  </div>
);

export default function App() {
  const [tab, setTab] = useState('fridge');
  const [premium, setPremium] = useState(false);
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [sheet, setSheet] = useState(null);
  const [boxes, setBoxes] = useState(true);
  const [scopes, setScopes] = useState({ names: true, expiry: true, quantity: true, nutrition: true, purchases: true });
  const [log, setLog] = useState([{ t: now(), tool: 'demo.init', purpose: 'Local MCP permission-flow simulation started', shared: [], blocked: ALWAYS_BLOCKED }]);
  const [devices, setDevices] = useState([
    { id: 'alexa', name: 'Amazon Alexa', icon: '🔵', on: true, cap: 'Announces expiring items and answers "what\'s in my fridge?"' },
    { id: 'nest', name: 'Google Nest', icon: '🟢', on: false, cap: 'Shows fridge summary on Nest Hub' },
    { id: 'homekit', name: 'Apple Home', icon: '🏠', on: false, cap: 'Door-open and expiry notifications' },
    { id: 'things', name: 'SmartThings', icon: '🟣', on: false, cap: 'Link to oven and dishwasher routines' },
  ]);
  const [shutter, setShutter] = useState(false);
  const [trigger, setTrigger] = useState('both');
  const [scanning, setScanning] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voice, setVoice] = useState({ listening: false, said: '', reply: '' });
  const [aTab, setATab] = useState('chat');
  const [chat, setChat] = useState([{ from: 'ai', text: 'Welcome to the CoolCam AI preview. Ask about expiring food, dinner ideas, calories, or missing ingredients. Replies are simulated for this demo; no AI service is connected.' }]);
  const [input, setInput] = useState('');
  const [cart, setCart] = useState([]);
  const [ordered, setOrdered] = useState(false);
  const [orderProvider, setOrderProvider] = useState('uber');
  const [compareStores, setCompareStores] = useState(true);
  const [meals, setMeals] = useState([{ name: 'Oatmeal', cal: 300 }]);
  const [toast, setToast] = useState('');

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const all = useMemo(() => items.map((i) => ({ ...i, days: daysLeft(i.exp) })), [items]);
  const sorted = useMemo(() => [...all].sort((a, b) => a.days - b.days), [all]);
  const expired = sorted.filter((i) => i.days < 0);
  const today = sorted.filter((i) => i.days === 0);
  const soon = sorted.filter((i) => i.days >= 1 && i.days <= 2);
  const have = (kind) => all.some((i) => i.kind === kind && i.qty > 0 && i.days >= 0);
  const eaten = meals.reduce((s, m) => s + m.cal, 0);
  const GOAL = 2000;
  const cartSubtotal = (source) => cart.reduce((sum, id) => sum + priceEstimate(id, source), 0);
  const cheaperStore = ['foodlion', 'harristeeter']
    .map((id) => ({ id, name: id === 'foodlion' ? 'Food Lion' : 'Harris Teeter', total: cartSubtotal(id) }))
    .filter((store) => store.total < cartSubtotal(orderProvider))
    .sort((a, b) => a.total - b.total)[0];

  const addLog = (entry) => setLog((l) => [{ t: now(), ...entry }, ...l].slice(0, 30));
  const mcp = (tool, needed, purpose) => {
    const missing = needed.filter((k) => !scopes[k]);
    const shared = needed.filter((k) => scopes[k]).map((k) => SCOPES.find((s) => s.key === k).label);
    const blocked = [...missing.map((k) => SCOPES.find((s) => s.key === k).label + ' (disabled by you)'), ...ALWAYS_BLOCKED];
    addLog({ tool, purpose, shared, blocked, denied: missing.length > 0 });
    return missing.map((k) => SCOPES.find((s) => s.key === k).label);
  };

  // ---------- manual add / edit ----------
  const openAdd = () => setSheet({ mode: 'add', name: '', emoji: '🥫', qty: 1, exp: isoIn(7), cal: '' });
  const openEdit = (i) => setSheet({ mode: 'edit', id: i.id, name: i.name, emoji: i.emoji, qty: i.qty, exp: i.exp, cal: i.cal ?? '' });
  const upd = (k, v) => setSheet((s) => ({ ...s, [k]: v }));
  const saveSheet = () => {
    const s = sheet;
    if (!s.name.trim()) return flash('Please enter an item name');
    if (!s.exp) return flash('Please pick an expiration date');
    const qty = Math.max(1, parseInt(s.qty, 10) || 1);
    const cal = s.cal === '' ? undefined : Number(s.cal);
    if (s.mode === 'add') {
      const counts = [1, 2, 3].map((n) => items.filter((i) => i.shelf === n).length);
      const shelf = counts.indexOf(Math.min(...counts)) + 1;
      const item = { id: 'u' + Date.now(), kind: guessKind(s.name), name: s.name.trim(), emoji: s.emoji, qty, unit: 'pcs', exp: s.exp, shelf, cal };
      setItems((it) => [...it, item]);
      addLog({ tool: 'inventory.manual_entry', purpose: 'You added "' + item.name + '" by hand', shared: [], blocked: ['Stays on device until the AI requests permitted fields'] });
      const d = daysLeft(s.exp);
      flash(d < 0 ? 'Added (already expired)' : d === 0 ? 'Added (expires today)' : 'Item added');
    } else {
      setItems((it) => it.map((i) => i.id === s.id ? { ...i, name: s.name.trim(), emoji: s.emoji, qty, exp: s.exp, cal, kind: i.id === i.kind ? i.kind : guessKind(s.name) } : i));
      addLog({ tool: 'inventory.manual_edit', purpose: 'You updated "' + s.name.trim() + '"', shared: [], blocked: ['Stays on device until the AI requests permitted fields'] });
      flash('Item updated');
    }
    setSheet(null);
  };
  const removeItem = () => {
    setItems((it) => it.filter((i) => i.id !== sheet.id));
    addLog({ tool: 'inventory.remove', purpose: 'You removed "' + sheet.name + '"', shared: [], blocked: ['Stays on device'] });
    flash('Item removed');
    setSheet(null);
  };

  const scan = (viaVoice) => {
    if (shutter) return flash('Lens shutter is closed');
    setScanning(true);
    setTimeout(() => {
      const next = SCAN_POOL.find((p) => !items.some((i) => i.id === p.id));
      if (next) { setItems((it) => [...it, next]); flash(`Detected: ${next.name}`); }
      else flash('No changes detected');
      addLog({ tool: 'vision.demo_scan', purpose: viaVoice ? 'Voice-triggered sample scan' : 'Sample camera scan', shared: [], blocked: ['No image is captured in this prototype'] });
      setScanning(false);
    }, 1600);
  };

  const recipeScore = (r) => {
    const haveN = r.ing.filter(have).length;
    const exp = r.ing.filter((k) => all.some((i) => i.kind === k && i.days >= 0 && i.days <= 3)).length;
    return { haveN, missing: r.ing.filter((k) => !have(k)), exp };
  };
  const addToCart = (ids) => {
    if (!ids.length) return;
    const missing = mcp('cart.build', ['names', 'purchases'], 'Add missing ingredients to cart');
    if (missing.length) return flash('Blocked: ' + missing.join(', ') + ' off');
    setCart((c) => [...c, ...ids.filter((id) => !c.includes(id))]);
    setOrdered(false);
    flash('Added to cart');
  };
  const cook = (r) => {
    const m = mcp('nutrition.log_meal', ['nutrition'], 'Log "' + r.name + '"');
    setItems((it) => {
      const used = new Set();
      return it.map((i) => {
        if (i.kind && r.ing.includes(i.kind) && !used.has(i.kind) && daysLeft(i.exp) >= 0) { used.add(i.kind); return { ...i, qty: i.qty - 1 }; }
        return i;
      }).filter((i) => i.qty > 0);
    });
    if (!m.length) { setMeals((x) => [...x, { name: r.name, cal: r.cal }]); flash(`Logged ${r.cal} cal`); }
    else flash('Cooked. Calories not logged (nutrition off)');
  };

  const assistantReply = (q) => {
    const t = q.toLowerCase();
    if (/order|buy|missing|cart|grocer/.test(t)) {
      const miss = mcp('cart.build', ['names', 'purchases'], 'Assistant build cart');
      if (miss.length) return { text: `I can't build an order because "${miss.join(', ')}" access is turned off in Privacy.` };
      const ids = [...new Set(RECIPES.flatMap((r) => recipeScore(r).missing))];
      setCart((c) => [...new Set([...c, ...ids])]); setOrdered(false);
      return { text: `I added ${ids.length} missing ingredients to your cart, including replacements for expired food. Review it in the Order tab. Nothing is purchased until you confirm.` };
    }
    if (/calor|light|healthy|under/.test(t)) {
      const miss = mcp('recipes.search', ['names', 'nutrition'], 'Low-calorie recipe search');
      if (miss.length) return { text: `I don't have access to "${miss.join(', ')}", so I can't filter by calories.` };
      return { text: `You've had ${eaten} of ${GOAL} cal. Here are lighter options (350 cal or less):`, recipes: RECIPES.filter((r) => r.cal <= 350) };
    }
    if (/expir|soon|waste|use up/.test(t)) {
      const miss = mcp('recipes.search', ['names', 'expiry'], 'Use-it-up recipe search');
      if (miss.length) return { text: `I can't see "${miss.join(', ')}", so I can't prioritize expiring food.` };
      const r = RECIPES.map((x) => ({ x, s: recipeScore(x) })).filter((o) => o.s.exp > 0).sort((a, b) => b.s.exp - a.s.exp).map((o) => o.x);
      return { text: 'These recipes use food that is about to expire' + (today.length ? ` (including ${today.map((i) => i.name).join(', ')}, which expires today)` : '') + ':' + (expired.length ? ` I skipped ${expired.length} expired item${expired.length > 1 ? 's' : ''}. Please check them.` : ''), recipes: r.slice(0, 3) };
    }
    const miss = mcp('recipes.search', ['names'], 'Recipe search: "' + q.slice(0, 30) + '"');
    if (miss.length) return { text: "I can't see your item names, so I can't suggest recipes. Enable it in Privacy." };
    const r = RECIPES.map((x) => ({ x, s: recipeScore(x) })).sort((a, b) => b.s.haveN / b.x.ing.length - a.s.haveN / a.x.ing.length).map((o) => o.x);
    return { text: "Based on what's fresh in your fridge:", recipes: r.slice(0, 3) };
  };
  const send = (q) => {
    if (!q.trim()) return;
    const reply = assistantReply(q);
    setChat((c) => [...c, { from: 'me', text: q }, { from: 'ai', ...reply }]);
    setInput('');
  };

  const voiceCmd = (cmd) => {
    setVoice({ listening: true, said: cmd, reply: '' });
    setTimeout(() => {
      let r;
      const t = cmd.toLowerCase();
      const ex = sorted.filter((i) => i.days < 0);
      const td = sorted.filter((i) => i.days === 0);
      const so = sorted.filter((i) => i.days >= 1 && i.days <= 3);
      if (/expir/.test(t)) {
        const parts = [];
        if (ex.length) parts.push(`Already expired: ${ex.map((i) => i.name).join(', ')}.`);
        if (td.length) parts.push(`Expiring today: ${td.map((i) => i.name).join(', ')}.`);
        if (so.length) parts.push(`Expiring soon: ${so.map((i) => `${i.name} (${i.days}d)`).join(', ')}.`);
        r = parts.length ? parts.join(' ') : 'Nothing has expired or expires in the next 3 days.';
      } else if (/milk/.test(t)) {
        const m = all.find((i) => i.kind === 'milk');
        r = !m ? 'No milk. Want me to add it to your list?'
          : m.days < 0 ? `Your milk expired ${-m.days} day(s) ago. Time to toss it.`
          : m.days === 0 ? 'Yes, you have milk, but it expires today.'
          : `Yes, you have milk. It expires in ${m.days} days.`;
      } else if (/scan|look|update/.test(t)) { scan(true); r = 'Scanning the shelves now.'; }
      else if (/dinner|recipe/.test(t)) {
        if (!premium) r = 'Recipe ideas are part of Premium. Upgrade for $10/month to unlock the AI assistant.';
        else { const x = assistantReply('use expiring'); r = x.recipes ? 'Try ' + x.recipes[0].name + '.' : x.text; }
      } else r = `You have ${all.length} items. ${ex.length} expired, ${td.length} expiring today, ${so.length} within the next 3 days.`;
      setVoice({ listening: false, said: cmd, reply: r });
    }, 1200);
  };
  const speakReply = () => {
    if (!voice.reply || !('speechSynthesis' in window)) return flash('Audio playback is not available in this browser');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(voice.reply));
  };

  const RecipeCard = ({ r }) => {
    const s = recipeScore(r);
    return (
      <div className="bg-white rounded-[14px] p-3 mt-2 text-black">
        <div className="flex items-center gap-3"><Tile size={40}>{r.emoji}</Tile>
          <div className="flex-1"><div className="font-semibold text-[15px] leading-tight">{r.name}</div><div className="text-[13px] text-[#6C6C70]">{r.time} min · {r.cal} cal</div></div></div>
        <div className="flex flex-wrap gap-1 mt-2.5">
          {r.ing.map((id) => <span key={id} className="text-[11px] px-2 py-0.5 rounded-full" style={have(id) ? { background: 'rgba(52,199,89,.15)', color: '#1D8A3A' } : { background: '#F2F2F7', color: '#8E8E93', textDecoration: 'line-through' }}>{CATALOG[id]?.name || id}</span>)}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => cook(r)} disabled={s.missing.length > 0} className="flex-1 text-[14px] font-semibold py-2 rounded-full text-white disabled:opacity-30" style={{ background: BLUE }}>Cook & log</button>
          {s.missing.length > 0 && <button onClick={() => addToCart(s.missing)} className="flex-1 text-[14px] font-semibold py-2 rounded-full" style={{ background: 'rgba(0,122,255,.12)', color: BLUE }}>Order {s.missing.length} missing</button>}
        </div>
      </div>
    );
  };

  const tabs = [['fridge', Snowflake, 'Fridge'], ['assistant', Sparkles, 'Assistant'], ['devices', Wifi, 'Devices'], ['privacy', ShieldCheck, 'Privacy'], ['plan', Crown, 'Plan']];
  const titles = { fridge: 'My Fridge', assistant: 'Assistant', devices: 'Devices', privacy: 'Privacy', plan: 'Plan' };
  const sheetDays = sheet ? daysLeft(sheet.exp) : 0;
  const attention = [
    expired.length > 0 && { c: '#FF3B30', Icon: AlertTriangle, t: 'Expired. Throw out', n: expired },
    today.length > 0 && { c: '#FFCC00', Icon: Clock, t: 'Expires today', n: today },
    soon.length > 0 && { c: '#FF9500', Icon: Bell, t: 'Use soon', n: soon },
  ].filter(Boolean);
  const pct = Math.min(1, eaten / GOAL);
  const CIRC = 2 * Math.PI * 52;

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F2F2F7] text-[#1C1C1E]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif' }}>
      <style>{`@keyframes scanl{0%{top:0}100%{top:100%}} @keyframes pulse2{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}} @keyframes sheetUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}} .sheetAnim{animation:sheetUp .25s ease-out} ::-webkit-scrollbar{display:none}`}</style>
      <header className="sticky top-0 z-10 shrink-0 border-b border-black/[0.07] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
          <button onClick={() => setTab('fridge')} className="flex shrink-0 items-center gap-2.5 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] text-white" style={{ background: BLUE }}><Snowflake size={23} /></span>
            <span><span className="block text-[17px] font-bold tracking-tight">CoolCam</span><span className="hidden text-[11px] text-[#8E8E93] sm:block">Smart fridge companion</span></span>
          </button>
          <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Main navigation">
            {tabs.map(([k, Icon, label]) => <button key={k} onClick={() => setTab(k)} className={`flex h-10 items-center gap-2 rounded-[10px] px-3 text-[14px] font-medium transition-colors ${tab === k ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'text-[#6C6C70] hover:bg-black/[0.04]'}`}><Icon size={17} />{label}</button>)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full px-2.5 py-1 text-[12px] font-semibold sm:inline-flex" style={premium ? { background: 'rgba(255,149,0,.15)', color: '#B35F00' } : { background: '#7676801F', color: '#6C6C70' }}>{premium ? 'Premium' : 'Free'}</span>
            <button onClick={() => { setVoiceOpen(true); setVoice({ listening: false, said: '', reply: '' }); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-white sm:px-4" style={{ background: BLUE }}><Mic size={17} /><span className="hidden text-[14px] font-semibold sm:inline">Try voice</span></button>
          </div>
        </div>
      </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div><div className="mb-1 text-[13px] font-medium text-[#8E8E93]">COOLCAM / {titles[tab].toUpperCase()}</div><h1 className="text-[30px] font-bold tracking-tight md:text-[36px]">{titles[tab]}</h1></div>
            <div className="hidden items-center gap-2 text-[13px] text-[#6C6C70] sm:flex"><span className="h-2 w-2 rounded-full bg-[#34C759]" />Demo data · saved on this device</div>
          </div>
          {tab === 'fridge' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
              <div className="space-y-5">
              {/* camera */}
              <div>
                <div className="relative h-[220px] overflow-hidden rounded-[20px] bg-[#1C1C1E] md:h-[320px]">
                  {shutter ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 text-[14px]"><Lock size={24} /><div className="mt-2">Lens shutter closed</div></div>
                  ) : (
                    <>
                      <FridgeScene items={all} boxes={boxes} />
                      {scanning && <div className="absolute left-0 right-0 h-0.5 bg-[#34C759]" style={{ animation: 'scanl 1.6s linear', boxShadow: '0 0 12px 3px #34C759' }} />}
                    </>
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] text-white font-medium bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: shutter ? '#8E8E93' : scanning ? '#FF3B30' : '#34C759' }} />{shutter ? 'Camera off' : scanning ? 'Demo scan in progress' : 'Sample camera view'}</div>
                  {!shutter && (
                    <button onClick={() => setBoxes(!boxes)} className="absolute top-3 right-3 flex items-center gap-1 text-[11px] text-white font-medium bg-black/40 backdrop-blur-md rounded-full px-2.5 py-1"><Eye size={12} />{boxes ? 'AI overlay' : 'Raw view'}</button>
                  )}
                </div>
                <div className="flex gap-2.5 mt-3">
                  <button onClick={() => scan(false)} disabled={scanning} className="flex-1 flex items-center justify-center gap-1.5 py-[11px] rounded-[12px] font-semibold text-[15px] bg-white disabled:opacity-50" style={{ color: BLUE }}><Camera size={16} /> Scan</button>
                  <button onClick={openAdd} className="flex-1 flex items-center justify-center gap-1.5 py-[11px] rounded-[12px] font-semibold text-[15px] text-white" style={{ background: BLUE }}><Plus size={17} /> Add item</button>
                </div>
              </div>

              {/* attention */}
              {attention.length > 0 && (
                <Group title="Needs attention">
                  {attention.map((a) => (
                    <div key={a.t} className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: a.c, color: a.c === '#FFCC00' ? '#4a3b00' : '#fff' }}><a.Icon size={16} /></div>
                      <div className="min-w-0"><div className="text-[15px] font-semibold leading-tight">{a.t}</div><div className="text-[13px] text-[#6C6C70] truncate">{a.n.map((i) => i.name).join(', ')}</div></div>
                    </div>
                  ))}
                </Group>
              )}

              {/* legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12px] text-[#6C6C70]">
                {[['#FF3B30', 'Expired'], ['#FFCC00', 'Today'], ['#FF9500', '1–2 days'], ['#9BD02B', '3–5 days'], ['#34C759', '6+ days']].map(([c, l]) => <span key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>)}
              </div>
              </div>

              {/* inventory */}
              <div className="space-y-5">
              <Group title={`${all.length} items`} footer="Tap an item to edit its date or remove it.">
                {sorted.map((i) => {
                  const t = tone(i.days);
                  return (
                    <button key={i.id} onClick={() => openEdit(i)} className="w-full text-left flex items-center gap-3 px-3 py-2.5 active:bg-black/5" style={{ background: t.soft }}>
                      <Tile bg={i.days < 0 ? 'rgba(255,59,48,.12)' : i.days === 0 ? 'rgba(255,204,0,.3)' : '#F2F2F7'}>
                        <span className="flex" style={{ opacity: i.days < 0 ? 0.6 : 1 }}>{ART[i.kind] ? <FoodIcon kind={i.kind} size={30} /> : i.emoji}</span>
                      </Tile>
                      <div className="flex-1 min-w-0">
                        <div className="text-[16px] leading-tight" style={{ color: i.days < 0 ? '#D70015' : '#000' }}>{i.name}</div>
                        <div className="text-[13px] text-[#6C6C70]">{i.qty} {i.unit} · {i.days < 0 ? 'expired' : 'exp.'} {fmtDate(i.exp)}</div>
                      </div>
                      <Pill d={i.days} />
                      <ChevronRight size={16} className="text-[#C7C7CC] -mr-1 shrink-0" />
                    </button>
                  );
                })}
              </Group>
              </div>
            </div>
          )}

          {tab === 'assistant' && (!premium ? (
            <div className="px-8 pt-16 text-center">
              <div className="w-[72px] h-[72px] mx-auto rounded-[18px] flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg,#FF9F0A,#FF375F)' }}><Sparkles size={34} /></div>
              <h3 className="font-bold text-[22px] mt-5">Meet your fridge assistant</h3>
              <p className="text-[15px] text-[#6C6C70] mt-2 leading-snug">AI recipes from what you have, automatic food ordering, and a calorie tracker.</p>
              <button onClick={() => { setPremium(true); flash('Premium unlocked (demo)'); }} className="mt-6 w-full py-3.5 rounded-[14px] text-white font-semibold text-[17px]" style={{ background: BLUE }}>Try Premium · $10/month</button>
              <p className="text-[12px] text-[#8E8E93] mt-3">Cancel anytime. Demo only.</p>
            </div>
          ) : (
            <div className="min-h-full flex flex-col">
              <div className="px-4 pb-3">
                <Segmented value={aTab} onChange={setATab} options={[['chat', 'Recipes', ChefHat], ['order', cart.length ? `Order (${cart.length})` : 'Order', ShoppingCart], ['cal', 'Calories', Flame]]} />
              </div>
              {aTab === 'chat' && (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 px-4 space-y-2">
                    {chat.map((m, i) => (
                      <div key={i} className={m.from === 'me' ? 'flex justify-end' : ''}>
                        <div className="max-w-[88%] rounded-[18px] px-3.5 py-2 text-[15px] leading-snug" style={m.from === 'me' ? { background: BLUE, color: '#fff' } : { background: '#E9E9EB', color: '#000' }}>
                          {m.text}
                          {m.recipes?.map((r) => <RecipeCard key={r.name} r={r} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 pt-3 flex gap-2 overflow-x-auto pb-2">
                    {['What can I make for dinner?', 'Use up expiring food', 'Something under 350 cal', 'Order missing ingredients'].map((c) => <button key={c} onClick={() => send(c)} className="text-[13px] whitespace-nowrap bg-white rounded-full px-3.5 py-2" style={{ color: BLUE }}>{c}</button>)}
                  </div>
                  <div className="px-4 pb-3 flex gap-2 items-center">
                    <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)} placeholder="Ask for a recipe" className="flex-1 bg-white rounded-full px-4 py-2.5 text-[15px] outline-none" />
                    <button onClick={() => send(input)} className="w-9 h-9 rounded-full text-white flex items-center justify-center" style={{ background: BLUE }}><ArrowUp size={18} /></button>
                  </div>
                </div>
              )}
              {aTab === 'order' && (
                <div className="mx-auto max-w-3xl px-4 pb-6 space-y-4 md:px-0">
                  <section className="rounded-[16px] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h2 className="text-[17px] font-semibold">Shopping preferences</h2><p className="mt-1 text-[13px] text-[#6C6C70]">Pick your default grocery delivery app.</p></div>
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(255,149,0,.15)', color: '#B35F00' }}>PREMIUM</span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {ORDER_PROVIDERS.map((provider) => <button key={provider.id} onClick={() => setOrderProvider(provider.id)} className="flex items-center gap-3 rounded-[12px] border p-3 text-left transition-colors" style={orderProvider === provider.id ? { borderColor: BLUE, background: 'rgba(0,122,255,.06)' } : { borderColor: '#E5E5EA', background: '#fff' }}><span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: orderProvider === provider.id ? 'rgba(0,122,255,.12)' : '#F2F2F7', color: BLUE }}><ShoppingCart size={18} /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{provider.name}</span><span className="block text-[12px] text-[#8E8E93]">{provider.note}</span></span><span className="h-5 w-5 rounded-full border flex items-center justify-center" style={orderProvider === provider.id ? { borderColor: BLUE, background: BLUE, color: '#fff' } : { borderColor: '#C7C7CC' }}>{orderProvider === provider.id && <Check size={13} />}</span></button>)}
                    </div>
                    <div className="mt-4 flex items-center gap-3 border-t border-black/[0.07] pt-4">
                      <div className="flex-1"><div className="text-[14px] font-medium">Compare nearby stores</div><div className="text-[12px] text-[#6C6C70]">Food Lion and Harris Teeter sample basket prices</div></div>
                      <Toggle on={compareStores} onChange={(value) => {
                        if (!value) return setCompareStores(false);
                        const missing = mcp('shopping.compare_prices', ['names', 'purchases'], 'Compare sample grocery prices');
                        if (missing.length) return flash('Price comparison blocked: ' + missing.join(', ') + ' access is off in Privacy');
                        setCompareStores(true);
                      }} />
                    </div>
                  </section>

                  {compareStores && cart.length > 0 && (
                    <section className="rounded-[16px] border border-[#CBE2FF] bg-[#F6FAFF] p-4">
                      <div className="flex items-center gap-2"><Store size={18} style={{ color: BLUE }} /><h2 className="text-[16px] font-semibold">Sample basket comparison</h2></div>
                      {cheaperStore ? <p className="mt-2 text-[14px] leading-snug">This basket is estimated <strong>${(cartSubtotal(orderProvider) - cheaperStore.total).toFixed(2)} lower</strong> at {cheaperStore.name} than the {ORDER_PROVIDERS.find((p) => p.id === orderProvider).name} item subtotal.</p> : <p className="mt-2 text-[14px] leading-snug">Neither nearby store has a lower estimated item subtotal than {ORDER_PROVIDERS.find((p) => p.id === orderProvider).name} for this basket.</p>}
                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {STORE_OPTIONS.map((store) => {
                          const total = cartSubtotal(store.id);
                          const saves = total < cartSubtotal(orderProvider);
                          return <div key={store.id} className="flex items-center gap-3 rounded-[12px] bg-white p-3"><span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F2F2F7] text-[#59636E]"><Store size={17} /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{store.name}</span><span className="block text-[12px] text-[#8E8E93]">{saves ? `$${(cartSubtotal(orderProvider) - total).toFixed(2)} less` : 'No savings on this basket'}</span></span><strong className="text-[15px]">${total.toFixed(2)}</strong></div>;
                        })}
                      </div>
                      <p className="mt-3 text-[11px] leading-snug text-[#6C6C70]">Illustrative estimates only. Live store pricing, delivery fees, taxes, and ordering integrations are not connected.</p>
                    </section>
                  )}

                  {ordered && <div className="rounded-[12px] p-3.5 text-[15px] flex gap-2 items-center" style={{ background: 'rgba(52,199,89,.15)', color: '#1D8A3A' }}><Check size={18} />Demo order placed. No purchase was made.</div>}
                  {cart.length === 0 && !ordered && <div className="rounded-[16px] bg-white px-5 py-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93]"><ShoppingCart size={22} /></div><p className="mt-3 text-[16px] font-semibold">Your cart is empty</p><p className="mt-1 text-[14px] text-[#8E8E93]">Build a sample cart to see the provider and store comparison.</p><button onClick={() => addToCart([...new Set(RECIPES.flatMap((recipe) => recipeScore(recipe).missing))])} className="mt-4 rounded-full px-4 py-2.5 text-[14px] font-semibold text-white" style={{ background: BLUE }}>Build sample cart</button></div>}
                  {cart.length > 0 && (<>
                    <Group>
                      {cart.map((id) => (
                        <div key={id} className="flex items-center gap-3 px-3 py-2.5">
                          <Tile><FoodIcon kind={id} size={30} /></Tile><span className="flex-1 text-[16px]">{CATALOG[id].name}</span>
                          <span className="text-[15px] text-[#6C6C70]">${priceEstimate(id, orderProvider).toFixed(2)}</span>
                          <button onClick={() => setCart(cart.filter((c) => c !== id))} className="w-6 h-6 rounded-full bg-[#7676801F] flex items-center justify-center"><X size={13} className="text-[#6C6C70]" /></button>
                        </div>
                      ))}
                      <div className="flex justify-between px-3 py-3 font-semibold text-[16px]"><span>Estimated item subtotal · {ORDER_PROVIDERS.find((p) => p.id === orderProvider).name}</span><span>${cartSubtotal(orderProvider).toFixed(2)}</span></div>
                    </Group>
                    <button onClick={() => { setCart([]); setOrdered(true); addLog({ tool: 'order.demo_confirm', purpose: 'You confirmed a simulated order', shared: ['Cart contents (sample only)'], blocked: ALWAYS_BLOCKED }); }} className="w-full py-3.5 rounded-[14px] text-white font-semibold text-[17px]" style={{ background: BLUE }}>Place demo order</button>
                    <p className="text-[13px] text-[#6C6C70] text-center -mt-1">Checkout is simulated. No payment or order is sent.</p>
                  </>)}
                </div>
              )}
              {aTab === 'cal' && (
                <div className="px-4 pb-6 space-y-4">
                  <div className="bg-white rounded-[16px] p-5 flex flex-col items-center">
                    <div className="relative w-[132px] h-[132px]">
                      <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
                        <circle cx="66" cy="66" r="52" fill="none" stroke="#F2F2F7" strokeWidth="14" />
                        <circle cx="66" cy="66" r="52" fill="none" stroke={eaten > GOAL ? '#FF3B30' : '#FF2D55'} strokeWidth="14" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)} style={{ transition: 'stroke-dashoffset .5s' }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-[28px] font-bold leading-none">{eaten}</div><div className="text-[12px] text-[#6C6C70] mt-1">of {GOAL} cal</div></div>
                    </div>
                    <div className="text-[13px] text-[#6C6C70] mt-3">{Math.max(0, GOAL - eaten)} cal remaining today</div>
                  </div>
                  <Group title="Today">
                    {meals.map((m, i) => <div key={i} className="flex justify-between px-3 py-3 text-[16px]"><span>{m.name}</span><span className="text-[#6C6C70]">{m.cal} cal</span></div>)}
                  </Group>
                  <div>
                    <div className="px-1 pb-1.5 text-[13px] uppercase text-[#6C6C70] tracking-wide">Quick add</div>
                    <div className="flex flex-wrap gap-2">{all.filter((i) => i.cal && i.days >= 0).slice(0, 5).map((i) => <button key={i.id} onClick={() => { const m = mcp('nutrition.log_meal', ['nutrition'], 'Quick log ' + i.name); if (!m.length) setMeals([...meals, { name: i.name, cal: i.cal }]); else flash('Nutrition access is off'); }} className="text-[13px] bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{ color: BLUE }}>{ART[i.kind] ? <FoodIcon kind={i.kind} size={18} /> : i.emoji} {i.name} · {i.cal}</button>)}</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {tab === 'devices' && (
            <div className="mx-auto max-w-3xl px-4 pb-6 md:px-0">
              <Group footer={'In the product concept, assistants receive summaries rather than images. These connection toggles are a demo only; no external service is linked.'}>
                {devices.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-3">
                    <Tile size={40}>{d.icon}</Tile>
                    <div className="flex-1 min-w-0"><div className="text-[16px] leading-tight">{d.name}</div><div className="text-[13px] text-[#6C6C70] leading-snug">{d.on ? `Preview enabled · ${d.cap}` : 'Available in the product concept'}</div></div>
                    <Toggle on={d.on} onChange={(v) => { setDevices(devices.map((x) => x.id === d.id ? { ...x, on: v } : x)); flash(v ? d.name + ' demo preview enabled' : d.name + ' demo preview disabled'); }} />
                  </div>
                ))}
              </Group>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="mx-auto max-w-3xl px-4 pb-6 space-y-5 md:px-0">
              <div className="bg-white rounded-[12px] p-4">
                <div className="flex items-center text-[11px] text-center gap-1">
                  {[['📷', 'Camera'], ['🧠', 'On-device vision'], ['🛡️', 'MCP gateway'], ['✨', 'AI']].map(([e, l], i) => (
                    <div key={l} className="flex items-center gap-1 flex-1"><div className="flex-1 rounded-[10px] py-2 px-1" style={i === 2 ? { background: 'rgba(52,199,89,.15)', outline: '1.5px solid #34C759' } : { background: '#F2F2F7' }}><div className="text-[20px]">{e}</div>{l}</div>{i < 3 && <span className="text-[#C7C7CC]">›</span>}</div>
                  ))}
                </div>
                <p className="text-[13px] text-[#6C6C70] mt-3 leading-snug">Product concept: photos would be processed on-device; an MCP gateway could share only the fields you allow. This prototype simulates those permission checks locally. No camera, MCP server, or AI service is connected.</p>
              </div>

              <Group title="AI can access" footer="Raw images, faces and audio are always blocked and can't be turned on.">
                {SCOPES.map((s) => (
                  <div key={s.key} className="px-3 py-2.5 flex items-center gap-3"><div className="flex-1"><div className="text-[16px] leading-tight">{s.label}</div><div className="text-[13px] text-[#6C6C70]">{s.desc}</div></div><Toggle on={scopes[s.key]} onChange={(v) => setScopes({ ...scopes, [s.key]: v })} /></div>
                ))}
                <div className="px-3 py-2.5 flex items-center gap-3"><Lock size={16} className="text-[#8E8E93]" /><div className="flex-1 text-[16px] text-[#8E8E93]">Images, faces, audio</div><Toggle on={false} onChange={() => {}} disabled /></div>
              </Group>

              <Group title="Camera">
                <div className="px-3 py-2.5 flex items-center gap-3"><div className="flex-1 text-[16px]">Lens shutter closed</div><Toggle on={shutter} onChange={setShutter} /></div>
                <div className="px-3 py-3 space-y-2">
                  <div className="text-[13px] text-[#6C6C70]">Camera turns on for</div>
                  <Segmented value={trigger} onChange={setTrigger} options={[['voice', 'Voice only'], ['door', 'Door open'], ['both', 'Both']]} />
                </div>
              </Group>

              <div>
                <div className="px-4 pb-1.5 text-[13px] uppercase text-[#6C6C70] tracking-wide flex items-center gap-1"><Eye size={12} />MCP activity simulation</div>
                <div className="space-y-2">
                  {log.map((e, i) => (
                    <div key={i} className="rounded-[12px] p-3 text-[13px]" style={{ background: e.denied ? 'rgba(255,59,48,.10)' : '#fff' }}>
                      <div className="flex justify-between items-center"><code className="font-semibold text-[13px]">{e.tool}</code><span className="text-[#8E8E93] text-[12px]">{e.t}</span></div>
                      <div className="text-[#6C6C70]">{e.purpose}</div>
                      {e.shared.length > 0 && <div className="mt-1" style={{ color: '#1D8A3A' }}>✓ Shared: {e.shared.join(', ')}</div>}
                      <div className="text-[#8E8E93]">✗ Withheld: {e.blocked.join(', ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'plan' && (
            <div className="mx-auto max-w-3xl px-4 pb-6 space-y-4 md:px-0">
              <div className="rounded-[20px] p-5 text-white" style={{ background: 'linear-gradient(145deg,#2C2C2E,#000)' }}>
                <div className="flex justify-between items-start">
                  <div><div className="text-[22px] font-bold tracking-tight">CoolCam</div><div className="text-[13px] text-white/60 mt-0.5">Wide-angle · door-mounted · voice-activated</div></div>
                  <div className="text-[22px] font-semibold">$79.99</div>
                </div>
                <div className="text-[13px] text-white/50 mt-4">One-time purchase. Includes the Free app.</div>
              </div>

              {[
                { name: 'Free', price: '$0', cur: !premium, feats: ["See what's in your fridge", 'Expiration tracking and color-coded alerts', 'Add and edit items and dates by hand', 'Alexa, Google Nest and more', 'Voice questions about inventory'] },
                { name: 'Premium', price: '$10/mo', cur: premium, feats: ['Everything in Free', 'AI recipes based on what you want', 'AI orders food for you', 'Compare sample basket prices at nearby stores', 'Choose Uber Grocery or DoorDash as your default', 'Calorie tracker'], prem: true },
              ].map((p) => (
                <div key={p.name} className="bg-white rounded-[16px] p-4" style={p.cur ? { outline: `2px solid ${BLUE}` } : {}}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2"><span className="text-[19px] font-bold">{p.name}</span>{p.cur && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,122,255,.12)', color: BLUE }}>Current</span>}</div>
                    <span className="text-[17px] font-semibold">{p.price}</span>
                  </div>
                  <ul className="mt-3 space-y-2">{p.feats.map((f) => <li key={f} className="flex gap-2.5 text-[15px] leading-snug"><Check size={16} className="mt-0.5 shrink-0" style={{ color: BLUE }} strokeWidth={3} />{f}</li>)}</ul>
                  {p.prem && <button onClick={() => { setPremium(!premium); flash(premium ? 'Back to Free plan' : 'Premium unlocked (demo)'); }} className="w-full mt-4 py-3 rounded-[12px] font-semibold text-[16px]" style={premium ? { background: '#7676801F', color: '#FF3B30' } : { background: BLUE, color: '#fff' }}>{premium ? 'Cancel Premium' : 'Upgrade to Premium'}</button>}
                </div>
              ))}
              <p className="text-[12px] text-[#8E8E93] text-center">Prototype only. All data and purchases are simulated.</p>
            </div>
          )}
        </main>

        {/* compact navigation for phone-sized screens */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-black/10 bg-white/90 px-2 pt-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Main navigation">
          {tabs.map(([k, Icon, l]) => (
            <button key={k} onClick={() => setTab(k)} className="flex-1 flex flex-col items-center gap-0.5 text-[10px] font-medium" style={{ color: tab === k ? BLUE : '#8E8E93' }}>
              <span className="relative">
                <Icon size={24} strokeWidth={tab === k ? 2.2 : 1.7} />
                {k === 'fridge' && today.length > 0 && <span className="absolute -top-1 -left-2.5 min-w-[16px] h-4 rounded-full text-[10px] flex items-center justify-center font-bold px-1" style={{ background: '#FFCC00', color: '#4a3b00' }}>{today.length}</span>}
                {k === 'fridge' && expired.length > 0 && <span className="absolute -top-1 -right-2.5 min-w-[16px] h-4 rounded-full text-[10px] flex items-center justify-center font-bold px-1 text-white" style={{ background: '#FF3B30' }}>{expired.length}</span>}
              </span>
              {l}
            </button>
          ))}
        </nav>

        {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white text-[14px] px-4 py-2.5 rounded-full z-40 whitespace-nowrap">{toast}</div>}

        {/* add / edit sheet */}
        {sheet && (
          <div className="fixed inset-0 bg-black/30 z-20 flex items-end justify-center p-0 md:items-center md:p-6">
            <div className="sheetAnim bg-[#F2F2F7] w-full max-w-xl rounded-t-[28px] md:rounded-[24px] max-h-[93%] overflow-y-auto pb-6">
              <div className="w-9 h-[5px] bg-black/20 rounded-full mx-auto mt-2" />
              <div className="flex items-center justify-between px-4 py-3">
                <button onClick={() => setSheet(null)} className="text-[17px]" style={{ color: BLUE }}>Cancel</button>
                <div className="font-semibold text-[17px]">{sheet.mode === 'add' ? 'New item' : 'Edit item'}</div>
                <button onClick={saveSheet} className="text-[17px] font-semibold" style={{ color: BLUE }}>{sheet.mode === 'add' ? 'Add' : 'Save'}</button>
              </div>
              <div className="px-4 space-y-5">
                <Group>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <span className="text-[16px] w-[84px]">Name</span>
                    <input value={sheet.name} onChange={(e) => upd('name', e.target.value)} placeholder="e.g. Hummus" className="flex-1 text-[16px] text-right outline-none bg-transparent" />
                  </div>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <span className="text-[16px] w-[84px]">Quantity</span>
                    <div className="flex-1 flex justify-end items-center gap-3">
                      <button onClick={() => upd('qty', Math.max(1, (parseInt(sheet.qty, 10) || 1) - 1))} className="w-8 h-8 rounded-full bg-[#7676801F] flex items-center justify-center"><Minus size={16} /></button>
                      <span className="text-[16px] w-6 text-center">{sheet.qty}</span>
                      <button onClick={() => upd('qty', (parseInt(sheet.qty, 10) || 0) + 1)} className="w-8 h-8 rounded-full bg-[#7676801F] flex items-center justify-center"><Plus size={16} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-3">
                    <span className="text-[16px] w-[84px]">Calories</span>
                    <input type="number" min="0" value={sheet.cal} onChange={(e) => upd('cal', e.target.value)} placeholder="Optional" className="flex-1 text-[16px] text-right outline-none bg-transparent" />
                  </div>
                  <div className="px-3 py-3">
                    <div className="text-[13px] text-[#6C6C70] mb-2">Icon</div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {EMOJIS.map((e) => <button key={e} onClick={() => upd('emoji', e)} className="w-10 h-10 shrink-0 text-[22px] rounded-[10px] flex items-center justify-center" style={sheet.emoji === e ? { background: 'rgba(0,122,255,.12)', outline: `2px solid ${BLUE}` } : { background: '#F2F2F7' }}>{e}</button>)}
                    </div>
                  </div>
                </Group>

                <Group title="Expiration">
                  <div className="flex items-center gap-3 px-3 py-3">
                    <span className="text-[16px] flex-1">Date</span>
                    <input type="date" value={sheet.exp} onChange={(e) => upd('exp', e.target.value)} className="text-[16px] rounded-[8px] bg-[#7676801F] px-2.5 py-1 outline-none" />
                  </div>
                  <div className="px-3 py-3">
                    <div className="flex gap-2">
                      {[['Today', 0], ['3 days', 3], ['1 week', 7], ['2 weeks', 14]].map(([l, n]) => <button key={l} onClick={() => upd('exp', isoIn(n))} className="flex-1 py-1.5 rounded-full text-[13px] font-medium" style={sheet.exp === isoIn(n) ? { background: BLUE, color: '#fff' } : { background: '#F2F2F7', color: BLUE }}>{l}</button>)}
                    </div>
                  </div>
                  {sheet.exp && (
                    <div className="px-3 py-3 flex items-center gap-2 text-[15px]" style={{ background: tone(sheetDays).soft }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: tone(sheetDays).solid }} />
                      <span className="flex-1">{fmtDate(sheet.exp)}</span>
                      <Pill d={sheetDays} />
                    </div>
                  )}
                </Group>

                {sheet.mode === 'edit' && (
                  <button onClick={removeItem} className="w-full bg-white rounded-[12px] py-3 text-[17px] flex items-center justify-center gap-1.5" style={{ color: '#FF3B30' }}><Trash2 size={17} />Remove item</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* voice sheet */}
        {voiceOpen && (
          <div className="fixed inset-0 bg-black/30 z-20 flex items-end justify-center p-0 md:items-center md:p-6">
            <div className="sheetAnim bg-[#F2F2F7] w-full max-w-lg rounded-t-[28px] md:rounded-[24px] px-5 pt-2 pb-8">
              <div className="w-9 h-[5px] bg-black/20 rounded-full mx-auto" />
              <div className="flex justify-between items-center mt-3"><div className="font-semibold text-[17px]">Hey Fridge</div><button onClick={() => setVoiceOpen(false)} className="w-7 h-7 rounded-full bg-[#7676801F] flex items-center justify-center"><X size={15} className="text-[#6C6C70]" /></button></div>
              <div className="flex justify-center my-6"><div className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-white" style={{ background: voice.listening ? 'linear-gradient(135deg,#FF375F,#FF9F0A)' : BLUE, animation: voice.listening ? 'pulse2 .9s infinite' : 'none', boxShadow: voice.listening ? '0 0 0 10px rgba(255,55,95,.15)' : 'none' }}><Mic size={30} /></div></div>
              {voice.said && <div className="text-[17px] text-center font-medium">“{voice.said}”</div>}
              {voice.listening && <div className="text-[14px] text-center text-[#8E8E93] mt-1">Simulating a voice command…</div>}
              {voice.reply && <div className="bg-white rounded-[14px] p-3.5 text-[15px] mt-3 leading-snug">{voice.reply}</div>}
              {voice.reply && <button onClick={speakReply} className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold" style={{ color: BLUE }}><Volume2 size={16} />Hear reply</button>}
              <div className="text-[13px] text-[#6C6C70] mt-5 mb-2">Tap a command to simulate speaking</div>
              <p className="mb-3 text-[12px] text-[#8E8E93]">This demo uses preset commands and sample answers. It does not access your microphone.</p>
              <div className="flex flex-wrap gap-2">{["What's expiring soon?", 'Do I have milk?', 'Scan the fridge', "What's for dinner?"].map((c) => <button key={c} onClick={() => voiceCmd(c)} className="text-[14px] bg-white rounded-full px-3.5 py-2" style={{ color: BLUE }}>{c}</button>)}</div>
            </div>
          </div>
        )}
    </div>
  );
}

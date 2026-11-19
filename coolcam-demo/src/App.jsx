import { useState, useMemo, useRef, useEffect } from 'react';
import { Snowflake, Camera, Mic, ShieldCheck, Sparkles, Wifi, Crown, ArrowUp, X, Lock, Check, ShoppingCart, ChefHat, Flame, Bell, Eye, Plus, Minus, Trash2, AlertTriangle, Clock, ChevronRight, Volume2, Store, Users, TrendingUp } from 'lucide-react';

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
  { id: 'lemon', name: 'Lemons', emoji: '🍋', qty: 2, unit: 'pcs', days: 12, shelf: 2, cal: 20 },
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
const CHEF_RECIPES = [
  { name: 'Spinach & Cheese Omelet', emoji: '🍳', time: 10, serves: 1, categories: ['Popular', 'Quick meals', 'Appetizers'], ingredients: [{ name: 'Eggs', kind: 'eggs' }, { name: 'Spinach', kind: 'spinach' }, { name: 'Cheddar', kind: 'cheese' }], steps: ['Whisk the eggs with a pinch of salt and pepper until the yolks and whites are blended.', 'Warm a lightly oiled pan over medium-low heat. Add the spinach and cook until just wilted.', 'Pour in the eggs. Gently pull the cooked edges toward the center as the eggs set.', 'Add cheddar, fold the omelet in half, and cook until the center is just set.'] },
  { name: 'Lemon Chicken Skillet', emoji: '🍋', time: 25, serves: 2, categories: ['Popular', 'Quick meals'], ingredients: [{ name: 'Chicken breast', kind: 'chicken' }, { name: 'Spinach', kind: 'spinach' }, { name: 'Bell pepper', kind: 'pepper' }, { name: 'Lemon', kind: 'lemon' }], steps: ['Pat the chicken dry, then season both sides with salt and pepper.', 'Heat a little oil in a skillet over medium heat. Cook chicken until browned and fully cooked through.', 'Move the chicken to a clean plate. Add sliced pepper and cook until tender.', 'Stir in spinach and lemon juice. Return chicken to the pan and spoon the vegetables over it.'] },
  { name: 'Berry Yogurt Parfait', emoji: '🍓', time: 5, serves: 1, categories: ['Popular', 'Desserts', 'Quick meals'], ingredients: [{ name: 'Yogurt', kind: 'yogurt' }, { name: 'Strawberries', kind: 'berries' }], steps: ['Rinse the strawberries and remove their leafy tops.', 'Slice the berries into bite-size pieces.', 'Layer yogurt and berries in a glass or bowl.', 'Finish with a little honey or granola if you have some.'] },
  { name: 'Tomato Basil Crostini', emoji: '🥖', time: 15, serves: 4, categories: ['Appetizers', 'Party food'], ingredients: [{ name: 'Tomatoes', kind: 'tomato' }, { name: 'Cheddar', kind: 'cheese' }, { name: 'Fresh basil', kind: 'basil' }], steps: ['Dice the tomatoes and finely chop the basil.', 'Toast slices of bread until crisp at the edges.', 'Top each slice with tomato and a little cheese.', 'Add basil and serve right away.'] },
  { name: 'Crunchy Party Veggie Board', emoji: '🥕', time: 15, serves: 6, categories: ['Popular', 'Party food', 'Appetizers'], ingredients: [{ name: 'Bell pepper', kind: 'pepper' }, { name: 'Spinach', kind: 'spinach' }, { name: 'Yogurt dip', kind: 'yogurt' }], steps: ['Wash the vegetables and pat them dry.', 'Slice the pepper into easy-to-grab strips.', 'Stir a pinch of salt and lemon juice into yogurt for a quick dip.', 'Arrange everything on a platter, keeping the dip in a small bowl in the center.'] },
  { name: 'Birthday Berry Yogurt Cups', emoji: '🎂', time: 10, serves: 4, categories: ['Popular', 'Birthdays', 'Desserts'], ingredients: [{ name: 'Yogurt', kind: 'yogurt' }, { name: 'Strawberries', kind: 'berries' }, { name: 'Lemon', kind: 'lemon' }], steps: ['Rinse and slice the strawberries.', 'Spoon yogurt into small cups or glasses.', 'Add a layer of strawberries and a tiny squeeze of lemon.', 'Repeat the layers and finish with a berry on top. Chill until ready to serve.'] },
  { name: 'Mini Spinach Egg Bites', emoji: '🧁', time: 22, serves: 6, categories: ['Appetizers', 'Party food', 'Birthdays'], ingredients: [{ name: 'Eggs', kind: 'eggs' }, { name: 'Spinach', kind: 'spinach' }, { name: 'Cheddar', kind: 'cheese' }], steps: ['Heat the oven to 350°F (175°C) and lightly grease a muffin tin.', 'Whisk the eggs, then stir in chopped spinach and shredded cheddar.', 'Divide the mixture among the muffin cups, filling each about two-thirds full.', 'Bake until puffed and fully set in the center, about 15–18 minutes. Cool briefly before serving.'] },
  { name: 'Lemon Berry Celebration Cups', emoji: '🍋', time: 12, serves: 4, categories: ['Birthdays', 'Desserts'], ingredients: [{ name: 'Yogurt', kind: 'yogurt' }, { name: 'Strawberries', kind: 'berries' }, { name: 'Lemon', kind: 'lemon' }], steps: ['Spoon yogurt into four small serving cups.', 'Add sliced strawberries and a little lemon zest or juice.', 'Add another spoonful of yogurt and top with extra berries.', 'Chill the cups before serving; add sprinkles if available.'] },
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
  { id: 'doordash', name: 'DoorDash', note: 'Grocery delivery varies by area' },
  { id: 'instacart', name: 'Instacart', note: 'Grocery delivery varies by area' },
  { id: 'walmart', name: 'Walmart Delivery', note: 'Walmart grocery delivery' },
  { id: 'shipt', name: 'Shipt', note: 'Same-day delivery in supported areas' },
  { id: 'ubereats', name: 'Uber Eats', note: 'Grocery delivery varies by area' },
];
const STORE_OPTIONS = [
  { id: 'foodlion', name: 'Food Lion' },
  { id: 'harristeeter', name: 'Harris Teeter' },
];
const PRICE_FACTORS = { doordash: 1.11, instacart: 1.14, walmart: 1.00, shipt: 1.12, ubereats: 1.13, foodlion: 0.91, harristeeter: 1.02 };
const ESTIMATED_UNIT_VALUES = { milk: 3.99, eggs: 0.32, spinach: 3.49, chicken: 4.50, cheese: 4.29, tomato: 0.80, yogurt: 1.12, pasta: 1.99, pepper: 1.00, lemon: 0.40, oj: 3.99, berries: 4.99, butter: 0.75, basil: 2.49 };
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

const FridgeScene = ({ items, boxes, highlightedItemId }) => {
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
            {it.id === highlightedItemId && (
              <g className="locatePulse" pointerEvents="none">
                <rect x="-24" y="-49" width="48" height="55" rx="7" fill="#C8FF58" fillOpacity=".18" stroke="#DFFF70" strokeWidth="3" />
                <rect x="-16" y="-62" width="32" height="9" rx="4.5" fill="#1D6B35" />
                <text x="0" y="-55.5" fontSize="5.5" fontWeight="800" textAnchor="middle" fill="#fff">FOUND</text>
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
  const [speechVoices, setSpeechVoices] = useState([]);
  const [speechVoiceURI, setSpeechVoiceURI] = useState('');
  const recognitionRef = useRef(null);
  const locateTimeoutRef = useRef(null);
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [aTab, setATab] = useState('chat');
  const [chefCategory, setChefCategory] = useState('Popular');
  const [activeChefRecipe, setActiveChefRecipe] = useState(null);
  const [chefStep, setChefStep] = useState(0);
  const [chat, setChat] = useState([{ from: 'ai', text: 'Welcome to MyFridge. Ask what is in your fridge, how much of an item you have, what is expiring, recipe ideas, calories, or missing ingredients. Replies use local demo logic; no AI service is connected.' }]);
  const [input, setInput] = useState('');
  const [cart, setCart] = useState([]);
  const [ordered, setOrdered] = useState(false);
  const [orderProvider, setOrderProvider] = useState('doordash');
  const [compareStores, setCompareStores] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [profiles, setProfiles] = useState([{ id: 'you', name: 'You', emoji: '🙂', goal: 2000, meals: [{ name: 'Oatmeal', cal: 300 }] }]);
  const [activeProfileId, setActiveProfileId] = useState('you');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices().filter((candidate) => candidate.lang?.toLowerCase().startsWith('en') && /google/i.test(candidate.name));
      setSpeechVoices(voices);
      setSpeechVoiceURI((current) => current && voices.some((candidate) => candidate.voiceURI === current)
        ? current
        : (voices.find((candidate) => /google us english/i.test(candidate.name)) || voices[0])?.voiceURI || '');
    };
    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
  }, []);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const all = useMemo(() => items.map((i) => ({ ...i, days: daysLeft(i.exp) })), [items]);
  const sorted = useMemo(() => [...all].sort((a, b) => a.days - b.days), [all]);
  const expired = sorted.filter((i) => i.days < 0);
  const today = sorted.filter((i) => i.days === 0);
  const soon = sorted.filter((i) => i.days >= 1 && i.days <= 2);
  const have = (kind) => all.some((i) => i.kind === kind && i.qty > 0 && i.days >= 0);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const meals = activeProfile?.meals || [];
  const eaten = meals.reduce((s, m) => s + m.cal, 0);
  const GOAL = activeProfile?.goal || 2000;
  const thisMonth = new Date();
  const monthlySavings = savedEvents.filter((event) => {
    const date = new Date(event.createdAt);
    return date.getMonth() === thisMonth.getMonth() && date.getFullYear() === thisMonth.getFullYear();
  });
  const savedValueThisMonth = monthlySavings.reduce((sum, event) => sum + event.value, 0);
  const savedItemsThisMonth = monthlySavings.reduce((sum, event) => sum + event.items.length, 0);
  const cartSubtotal = (source) => cart.reduce((sum, id) => sum + priceEstimate(id, source), 0);
  const cheaperStore = ['foodlion', 'harristeeter']
    .map((id) => ({ id, name: id === 'foodlion' ? 'Food Lion' : 'Harris Teeter', total: cartSubtotal(id) }))
    .filter((store) => store.total < cartSubtotal(orderProvider))
    .sort((a, b) => a.total - b.total)[0];

  const addLog = (entry) => setLog((l) => [{ t: now(), ...entry }, ...l].slice(0, 30));
  const logMealForActiveProfile = (meal) => {
    setProfiles((current) => current.map((profile) => profile.id === activeProfileId
      ? { ...profile, meals: [...profile.meals, meal] }
      : profile));
  };
  const addFamilyProfile = () => {
    const name = profileNameInput.trim();
    if (!name) return flash('Enter a name for the profile');
    if (profiles.length >= 8) return flash('The demo supports up to 8 profiles');
    const profile = { id: `profile-${Date.now()}`, name, emoji: ['🧑', '👩', '👨', '🧒', '👧', '🧑‍🦱', '🧑‍🦰'][profiles.length - 1] || '🙂', goal: 2000, meals: [] };
    setProfiles((current) => [...current, profile]);
    setActiveProfileId(profile.id);
    setProfileNameInput('');
    setShowProfileForm(false);
    flash(`${name}'s profile added`);
  };
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
  const markItemUsed = () => {
    const item = items.find((entry) => entry.id === sheet.id);
    if (!item) return setSheet(null);
    const remaining = daysLeft(item.exp);
    if (remaining < 0) return flash('This item is past its listed date. It was not counted as saved.');
    const value = remaining <= 3 ? (ESTIMATED_UNIT_VALUES[item.kind] || 0) : 0;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, qty: entry.qty - 1 } : entry).filter((entry) => entry.qty > 0));
    if (value > 0) setSavedEvents((events) => [{ id: `used-${Date.now()}`, createdAt: Date.now(), recipe: 'Marked used', items: [item.name], value }, ...events]);
    setSheet(null);
    flash(value > 0 ? `Marked used · estimated $${value.toFixed(2)} saved from waste` : 'Marked one unit as used');
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
    const usedKinds = new Set();
    const savedItems = items.filter((i) => {
      const remaining = daysLeft(i.exp);
      if (!i.kind || !r.ing.includes(i.kind) || usedKinds.has(i.kind) || i.qty <= 0 || remaining < 0 || remaining > 3) return false;
      usedKinds.add(i.kind);
      return true;
    });
    const savedValue = savedItems.reduce((sum, i) => sum + (ESTIMATED_UNIT_VALUES[i.kind] || 0), 0);
    if (savedItems.length) setSavedEvents((events) => [{ id: `saved-${Date.now()}`, createdAt: Date.now(), recipe: r.name, items: savedItems.map((i) => i.name), value: Number(savedValue.toFixed(2)) }, ...events]);
    setItems((it) => {
      const used = new Set();
      return it.map((i) => {
        if (i.kind && r.ing.includes(i.kind) && !used.has(i.kind) && daysLeft(i.exp) >= 0) { used.add(i.kind); return { ...i, qty: i.qty - 1 }; }
        return i;
      }).filter((i) => i.qty > 0);
    });
    const savingsNote = savedValue > 0 ? ` Est. $${savedValue.toFixed(2)} of food value used before expiry.` : '';
    if (!m.length) { logMealForActiveProfile({ name: r.name, cal: r.cal }); flash(`Logged ${r.cal} cal for ${activeProfile.name}.${savingsNote}`); }
    else flash(`Cooked. Calories not logged (nutrition off).${savingsNote}`);
  };

  const assistantReply = (q) => {
    const t = q.toLowerCase();
    const itemForQuery = all.find((item) => [item.name, ...(KEYWORDS[item.kind] || [])].some((name) => t.includes(name.toLowerCase())));
    const recipeKind = Object.entries(KEYWORDS).find(([kind, words]) => [kind, ...words].some((word) => t.includes(word.toLowerCase())))?.[0];

    if (/order|buy|missing|cart|grocer/.test(t)) {
      const miss = mcp('cart.build', ['names', 'purchases'], 'Assistant build cart');
      if (miss.length) return { text: `I can't build an order because "${miss.join(', ')}" access is turned off in Privacy.` };
      const ids = [...new Set(RECIPES.flatMap((r) => recipeScore(r).missing))];
      setCart((c) => [...new Set([...c, ...ids])]); setOrdered(false);
      return { text: `I added ${ids.length} missing ingredients to your cart, including replacements for expired food. Review it in the Order tab. Nothing is purchased until you confirm.` };
    }

    if (/do i have|do you have|do we have|is there|have we got|how much|how many|is my|are my|still good|still fresh|expired/.test(t) && itemForQuery) {
      const needs = ['names'];
      if (/how much|how many|quantity/.test(t)) needs.push('quantity');
      if (/expir|fresh|good|date|last/.test(t)) needs.push('expiry');
      const missing = mcp('inventory.lookup', needs, `Look up ${itemForQuery.name}`);
      if (missing.length) return { text: `I can't answer because ${missing.join(' and ')} access is turned off in Privacy.` };
      if (/how much|how many|quantity/.test(t)) return { text: `You have ${itemForQuery.qty} ${itemForQuery.unit} of ${itemForQuery.name}.` };
      if (/expir|fresh|good|date|last/.test(t)) {
        if (itemForQuery.days < 0) return { text: `${itemForQuery.name} expired ${-itemForQuery.days} day${itemForQuery.days === -1 ? '' : 's'} ago. Check it before using.` };
        if (itemForQuery.days === 0) return { text: `${itemForQuery.name} expires today. Check the package before using it.` };
        return { text: `${itemForQuery.name} is in your fridge and expires in ${itemForQuery.days} days (${fmtDate(itemForQuery.exp)}).` };
      }
      return { text: `Yes, ${itemForQuery.name} is in your fridge${itemForQuery.days < 0 ? ', but it is past its listed expiration date' : ''}.` };
    }

    if (/do i have|do you have|do we have|have we got|what(?:'s| is) (?:in|inside) (?:my|the) fridge|what food do i have|what do i have|show my inventory|list my food|what(?:'s| is) available/.test(t)) {
      const needs = ['names'];
      if (/expir|fresh|date|soon/.test(t)) needs.push('expiry');
      if (/how many|quantity|amount/.test(t)) needs.push('quantity');
      const missing = mcp('inventory.summary', needs, 'Summarize fridge inventory');
      if (missing.length) return { text: `I can't show that information because ${missing.join(' and ')} access is turned off in Privacy.` };
      if (!all.length) return { text: 'Your fridge list is empty. Add an item to get started.' };
      const names = all.map((item) => {
        if (/expir|fresh|date|soon/.test(t)) return `${item.name} (${expiryLabel(item.days).toLowerCase()})`;
        if (/how many|quantity|amount/.test(t)) return `${item.qty} ${item.unit} ${item.name}`;
        return item.name;
      });
      return { text: `I have ${all.length} items in your fridge: ${names.join(', ')}.` };
    }

    if (/calor/.test(t) && itemForQuery) {
      const missing = mcp('nutrition.lookup', ['names', 'nutrition'], `Check calories for ${itemForQuery.name}`);
      if (missing.length) return { text: `I can't answer because ${missing.join(' and ')} access is turned off in Privacy.` };
      if (itemForQuery.cal == null) return { text: `I don't have calorie information for ${itemForQuery.name} in this sample inventory.` };
      return { text: `${itemForQuery.name} is listed as about ${itemForQuery.cal} calories per item.` };
    }

    if (/calor|light|healthy|under/.test(t)) {
      const miss = mcp('recipes.search', ['names', 'nutrition'], 'Low-calorie recipe search');
      if (miss.length) return { text: `I don't have access to "${miss.join(', ')}", so I can't filter by calories.` };
      return { text: `${activeProfile.name} has logged ${eaten} of ${GOAL} cal. Here are lighter options (350 cal or less):`, recipes: RECIPES.filter((r) => r.cal <= 350) };
    }
    if (/expir|soon|waste|use up/.test(t)) {
      const miss = mcp('recipes.search', ['names', 'expiry'], 'Use-it-up recipe search');
      if (miss.length) return { text: `I can't see "${miss.join(', ')}", so I can't prioritize expiring food.` };
      const r = RECIPES.map((x) => ({ x, s: recipeScore(x) })).filter((o) => o.s.exp > 0).sort((a, b) => b.s.exp - a.s.exp).map((o) => o.x);
      return { text: 'These recipes use food that is about to expire' + (today.length ? ` (including ${today.map((i) => i.name).join(', ')}, which expires today)` : '') + ':' + (expired.length ? ` I skipped ${expired.length} expired item${expired.length > 1 ? 's' : ''}. Please check them.` : ''), recipes: r.slice(0, 3) };
    }

    if (recipeKind && /recipe|make|cook|dinner|meal|with|using/.test(t)) {
      const missing = mcp('recipes.search', ['names'], `Find recipes using ${recipeKind}`);
      if (missing.length) return { text: "I can't search recipes because item-name access is turned off in Privacy." };
      const recipes = RECIPES.filter((recipe) => recipe.ing.includes(recipeKind))
        .sort((a, b) => recipeScore(b).haveN / b.ing.length - recipeScore(a).haveN / a.ing.length);
      if (!recipes.length) return { text: `I don't have a ${recipeKind} recipe in this demo's small recipe list yet.` };
      return { text: `Here are ideas that use ${CATALOG[recipeKind]?.name || recipeKind}. Green ingredients are in your fridge; crossed-out ones are missing.`, recipes: recipes.slice(0, 3) };
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

  const voiceCmd = (cmd, source = 'preset') => {
    setVoice({ listening: source === 'preset', processing: source === 'microphone', said: cmd, reply: '', source });
    setTimeout(() => {
      let r;
      const t = cmd.toLowerCase();
      const ex = sorted.filter((i) => i.days < 0);
      const td = sorted.filter((i) => i.days === 0);
      const so = sorted.filter((i) => i.days >= 1 && i.days <= 3);
      if (/\b(where|find|locate|show me)\b/.test(t)) {
        const item = all.find((entry) => [entry.name, ...(KEYWORDS[entry.kind] || [])].some((word) => t.includes(word.toLowerCase())));
        if (!item) {
          r = 'I can only locate items in the sample fridge list. I do not see that item right now.';
        } else {
          const missing = mcp('inventory.locate', ['names'], `Locate ${item.name} in the sample fridge`);
          if (missing.length) {
            r = `I can't locate that item because ${missing.join(' and ')} access is turned off in Privacy.`;
          } else {
            const shelf = ({ 1: 'top shelf', 2: 'middle shelf', 3: 'bottom shelf' })[item.shelf] || 'fridge';
            setTab('fridge');
            if (shutter) {
              r = `I found ${item.name.toLowerCase()} on the ${shelf}, but the camera shutter is closed, so I can't show the highlight.`;
            } else {
              setHighlightedItemId(item.id);
              if (locateTimeoutRef.current) window.clearTimeout(locateTimeoutRef.current);
              locateTimeoutRef.current = window.setTimeout(() => {
                setHighlightedItemId((current) => current === item.id ? null : current);
                locateTimeoutRef.current = null;
              }, 3200);
              setVoiceOpen(false);
              r = `I found ${item.name.toLowerCase()} on the ${shelf}. I've highlighted it in the camera view for a few seconds.`;
            }
          }
        }
      }
      else if (/scan|look at|update the fridge/.test(t)) { scan(true); r = 'Scanning the shelves now. This is a sample scan; no photo is captured.'; }
      else if (/dinner|recipe|meal/.test(t) && !premium) r = 'Recipe ideas are part of Premium. You can still ask me what food is in your fridge.';
      else if (/expir/.test(t)) {
        const missing = mcp('voice.inventory_lookup', ['names', 'expiry'], 'Voice question about expiring food');
        if (missing.length) r = `I can't check that because ${missing.join(' and ')} access is turned off in Privacy.`;
        else {
        const parts = [];
        if (ex.length) parts.push(`Already expired: ${ex.map((i) => i.name).join(', ')}.`);
        if (td.length) parts.push(`Expiring today: ${td.map((i) => i.name).join(', ')}.`);
        if (so.length) parts.push(`Expiring soon: ${so.map((i) => `${i.name} (${i.days}d)`).join(', ')}.`);
        r = parts.length ? parts.join(' ') : 'Nothing has expired or expires in the next 3 days.';
        }
      } else {
        const answer = assistantReply(cmd);
        r = answer.recipes?.length ? `${answer.text} ${answer.recipes.map((recipe) => recipe.name).join('. ')}` : answer.text;
      }
      setVoice({ listening: false, processing: false, said: cmd, reply: r, source });
      if (source === 'microphone') speakText(r);
    }, source === 'preset' ? 900 : 350);
  };
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!window.isSecureContext) {
      setVoice({ listening: false, processing: false, said: '', reply: 'Microphone voice input needs a secure HTTPS page. Open the GitHub Pages link and try again.', source: 'microphone' });
      return;
    }
    if (!SpeechRecognition) {
      setVoice({ listening: false, processing: false, said: '', reply: 'Live speech recognition is not available in this browser. Try Chrome or Edge, or use one of the sample prompts below.', source: 'microphone' });
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new SpeechRecognition();
    let receivedSpeech = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      receivedSpeech = true;
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) voiceCmd(transcript, 'microphone');
      else setVoice({ listening: false, processing: false, said: '', reply: 'I did not catch that. Try again or choose a sample prompt.' });
    };
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed'
        ? 'Microphone access was blocked. Allow it in your browser’s site settings, then try again.'
        : event.error === 'no-speech'
          ? 'I did not hear anything. Tap the microphone and try again.'
          : 'Speech recognition is unavailable right now. Try a sample prompt instead.';
      setVoice({ listening: false, processing: false, said: '', reply: message });
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setVoice((current) => current.listening && !receivedSpeech
        ? { listening: false, processing: false, said: '', reply: 'I did not catch that. Tap the microphone and try again, or choose a sample prompt.' }
        : current);
    };
    recognitionRef.current = recognition;
    setVoice({ listening: true, processing: false, said: '', reply: '', source: 'microphone' });
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoice({ listening: false, processing: false, said: '', reply: 'The microphone could not start. Check browser permission and try again.' });
    }
  };
  const closeVoice = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setVoiceOpen(false);
    setVoice((current) => ({ ...current, listening: false, processing: false }));
  };
  const speakText = (text) => {
    if (!text || !('speechSynthesis' in window)) return false;
    const speech = window.speechSynthesis;
    const voices = speech.getVoices();
    const googleVoices = voices.filter((candidate) => candidate.lang?.toLowerCase().startsWith('en') && /google/i.test(candidate.name));
    const selectedVoice = googleVoices.find((candidate) => candidate.voiceURI === speechVoiceURI)
      || googleVoices.find((candidate) => /google us english/i.test(candidate.name))
      || googleVoices[0];
    if (!selectedVoice) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.91;
    utterance.pitch = 1.12;
    utterance.volume = 1;
    if (selectedVoice) utterance.voice = selectedVoice;
    speech.cancel();
    speech.speak(utterance);
    return true;
  };
  const speakReply = () => {
    if (!speakText(voice.reply)) return flash('Audio playback is not available in this browser');
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
      <style>{`@keyframes scanl{0%{top:0}100%{top:100%}} @keyframes pulse2{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}} @keyframes sheetUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}} @keyframes locateGlow{0%,100%{opacity:.58}50%{opacity:1}} .locatePulse{animation:locateGlow .6s ease-in-out 5;filter:drop-shadow(0 0 5px rgba(210,255,80,.9))} .sheetAnim{animation:sheetUp .25s ease-out} ::-webkit-scrollbar{display:none}`}</style>
      <header className="sticky top-0 z-10 shrink-0 border-b border-black/[0.07] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 md:px-8">
          <button onClick={() => setTab('fridge')} className="flex shrink-0 items-center gap-2.5 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-[13px] text-white" style={{ background: BLUE }}><Snowflake size={23} /></span>
            <span><span className="block text-[17px] font-bold tracking-tight">MyFridge</span><span className="hidden text-[11px] text-[#8E8E93] sm:block">Smart fridge companion</span></span>
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
            <div><div className="mb-1 text-[13px] font-medium text-[#8E8E93]">MYFRIDGE / {titles[tab].toUpperCase()}</div><h1 className="text-[30px] font-bold tracking-tight md:text-[36px]">{titles[tab]}</h1></div>
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
                      <FridgeScene items={all} boxes={boxes} highlightedItemId={highlightedItemId} />
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

              <section className="rounded-[18px] border border-[#DCEBD8] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: 'rgba(52,199,89,.13)', color: '#1D8A3A' }}><TrendingUp size={18} /></span>
                    <div><h2 className="text-[16px] font-semibold">Food savings</h2><p className="text-[12px] text-[#6C6C70]">Estimated for {thisMonth.toLocaleDateString([], { month: 'long' })}</p></div>
                  </div>
                  <strong className="text-[23px] tracking-tight" style={{ color: '#1D8A3A' }}>${savedValueThisMonth.toFixed(2)}</strong>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[12px] bg-[#F4F8F2] p-3"><div className="text-[19px] font-semibold">{savedItemsThisMonth}</div><div className="text-[11px] text-[#6C6C70]">items used before expiry</div></div>
                  <div className="rounded-[12px] bg-[#F4F8F2] p-3"><div className="text-[19px] font-semibold">{monthlySavings.length}</div><div className="text-[11px] text-[#6C6C70]">meals logged</div></div>
                </div>
                {monthlySavings.length ? (
                  <div className="mt-3 space-y-2">
                    {monthlySavings.slice(0, 2).map((event) => <div key={event.id} className="flex items-center justify-between gap-3 text-[12px]"><span className="min-w-0 truncate text-[#6C6C70]">{event.recipe} · {event.items.join(', ')}</span><strong className="shrink-0 text-[#1D8A3A]">+${event.value.toFixed(2)}</strong></div>)}
                  </div>
                ) : <p className="mt-3 text-[12px] leading-snug text-[#6C6C70]">Mark an item as used from its details before its listed date to start tracking your estimate.</p>}
                <p className="mt-3 border-t border-black/[0.06] pt-2 text-[10px] leading-snug text-[#8E8E93]">Estimate uses sample value per quantity used. It is not a live price or guaranteed savings.</p>
              </section>

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
              <p className="text-[15px] text-[#6C6C70] mt-2 leading-snug">Guided cooking, recipes for every occasion, grocery planning, and a calorie tracker.</p>
              <button onClick={() => { setPremium(true); flash('Premium unlocked (demo)'); }} className="mt-6 w-full py-3.5 rounded-[14px] text-white font-semibold text-[17px]" style={{ background: BLUE }}>Try Premium · $10/month</button>
              <p className="text-[12px] text-[#8E8E93] mt-3">Cancel anytime. Demo only.</p>
            </div>
          ) : (
            <div className="min-h-full flex flex-col">
              <div className="px-4 pb-3">
                <Segmented value={aTab} onChange={setATab} options={[['chat', 'Recipes', ChefHat], ['chef', 'AI Chef', Sparkles], ['order', cart.length ? `Order (${cart.length})` : 'Order', ShoppingCart], ['cal', 'Calories', Flame]]} />
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
              {aTab === 'chef' && (
                <div className="mx-auto w-full max-w-4xl px-4 pb-6 md:px-0">
                  <section className="overflow-hidden rounded-[20px] text-white" style={{ background: 'linear-gradient(130deg,#3B2F70,#6B4EFF 55%,#B177FF)' }}>
                    <div className="p-5 md:p-7">
                      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[.14em] text-white/75"><Sparkles size={15} /> MyFridge AI Chef</div>
                      <h2 className="max-w-xl text-[25px] font-bold leading-tight md:text-[30px]">Find something delicious, then cook it one step at a time.</h2>
                      <p className="mt-2 max-w-xl text-[13px] leading-snug text-white/75">Popular ideas for weeknights, parties, desserts, and birthdays. Ingredient badges show what’s already in your fridge.</p>
                    </div>
                  </section>

                  {activeChefRecipe ? (
                    <div className="mt-4 space-y-4">
                      <button onClick={() => { setActiveChefRecipe(null); setChefStep(0); }} className="text-[14px] font-semibold" style={{ color: BLUE }}>‹ Back to recipes</button>
                      <section className="rounded-[18px] bg-white p-4 md:p-6">
                        <div className="flex items-start gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#F2F2F7] text-[28px]">{activeChefRecipe.emoji}</span>
                          <div className="min-w-0 flex-1"><h2 className="text-[20px] font-bold leading-tight">{activeChefRecipe.name}</h2><p className="mt-1 text-[13px] text-[#6C6C70]">{activeChefRecipe.time} min · serves {activeChefRecipe.serves} · demo recipe</p></div>
                        </div>
                        <div className="mt-5">
                          <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-[#6C6C70]"><span>Step {chefStep + 1} of {activeChefRecipe.steps.length}</span><span>{Math.round(((chefStep + 1) / activeChefRecipe.steps.length) * 100)}%</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#F2F2F7]"><div className="h-full rounded-full transition-all" style={{ width: `${((chefStep + 1) / activeChefRecipe.steps.length) * 100}%`, background: '#7657E8' }} /></div>
                          <div className="mt-5 min-h-[130px] rounded-[16px] bg-[#F7F5FF] p-5">
                            <div className="mb-2 text-[12px] font-bold uppercase tracking-[.12em]" style={{ color: '#7657E8' }}>Step {chefStep + 1}</div>
                            <p className="text-[18px] font-medium leading-relaxed">{activeChefRecipe.steps[chefStep]}</p>
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button disabled={chefStep === 0} onClick={() => setChefStep((step) => Math.max(0, step - 1))} className="flex-1 rounded-[12px] bg-[#F2F2F7] py-3 text-[14px] font-semibold disabled:opacity-40">Previous</button>
                            {chefStep < activeChefRecipe.steps.length - 1
                              ? <button onClick={() => setChefStep((step) => step + 1)} className="flex-1 rounded-[12px] py-3 text-[14px] font-semibold text-white" style={{ background: '#7657E8' }}>Next step</button>
                              : <button onClick={() => { setActiveChefRecipe(null); setChefStep(0); flash('Recipe complete — enjoy!'); }} className="flex-1 rounded-[12px] py-3 text-[14px] font-semibold text-white" style={{ background: '#1D8A3A' }}>Finish cooking</button>}
                          </div>
                        </div>
                      </section>
                      <section className="rounded-[18px] bg-white p-4">
                        <h3 className="text-[15px] font-semibold">Ingredients</h3>
                        <div className="mt-3 flex flex-wrap gap-2">{activeChefRecipe.ingredients.map((ingredient) => { const inFridge = have(ingredient.kind); return <span key={ingredient.kind} className="rounded-full px-3 py-1.5 text-[12px] font-medium" style={inFridge ? { background: 'rgba(52,199,89,.14)', color: '#1D8A3A' } : { background: '#F2F2F7', color: '#6C6C70' }}>{inFridge ? '✓ ' : '○ '}{ingredient.name}</span>; })}</div>
                        <p className="mt-3 text-[11px] text-[#8E8E93]">Green means listed in your fridge. Any missing pantry ingredients are for the demo recipe.</p>
                      </section>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{['Popular', 'Appetizers', 'Party food', 'Desserts', 'Birthdays', 'Quick meals'].map((category) => <button key={category} onClick={() => setChefCategory(category)} className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold" style={chefCategory === category ? { background: '#7657E8', color: '#fff' } : { background: '#fff', color: '#5E596C' }}>{category}</button>)}</div>
                      <div className="mb-3 mt-3 flex items-end justify-between"><div><h2 className="text-[19px] font-bold">{chefCategory === 'Popular' ? 'Popular right now' : chefCategory}</h2><p className="mt-0.5 text-[12px] text-[#8E8E93]">Picked to be easy to browse and cook along with</p></div><span className="text-[11px] text-[#8E8E93]">{CHEF_RECIPES.filter((recipe) => recipe.categories.includes(chefCategory)).length} ideas</span></div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {CHEF_RECIPES.filter((recipe) => recipe.categories.includes(chefCategory)).map((recipe) => {
                          const available = recipe.ingredients.filter((ingredient) => have(ingredient.kind)).length;
                          return <article key={recipe.name} className="rounded-[18px] bg-white p-4 shadow-sm">
                            <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#F5F2FF] text-[28px]">{recipe.emoji}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-1">{recipe.categories.includes('Popular') && <span className="rounded-full bg-[#FFF4DB] px-2 py-0.5 text-[10px] font-bold text-[#9B6810]">POPULAR</span>}<span className="rounded-full bg-[#F2F2F7] px-2 py-0.5 text-[10px] font-semibold text-[#6C6C70]">{recipe.time} min</span></div><h3 className="mt-1 text-[16px] font-semibold leading-tight">{recipe.name}</h3><p className="mt-1 text-[12px] text-[#8E8E93]">{recipe.serves} servings · {available}/{recipe.ingredients.length} fridge ingredients</p></div></div>
                            <div className="mt-3 flex flex-wrap gap-1">{recipe.ingredients.slice(0, 4).map((ingredient) => <span key={ingredient.kind} className="rounded-full px-2 py-1 text-[10px]" style={have(ingredient.kind) ? { background: 'rgba(52,199,89,.12)', color: '#1D8A3A' } : { background: '#F2F2F7', color: '#8E8E93' }}>{ingredient.name}</span>)}</div>
                            <button onClick={() => { setActiveChefRecipe(recipe); setChefStep(0); }} className="mt-4 w-full rounded-[12px] py-2.5 text-[14px] font-semibold text-white" style={{ background: '#7657E8' }}>Cook step by step <ChevronRight size={15} className="ml-1 inline" /></button>
                          </article>;
                        })}
                      </div>
                      <p className="mt-4 text-center text-[11px] text-[#8E8E93]">School demo: these are built-in sample recipes, not generated by a connected AI.</p>
                    </>
                  )}
                </div>
              )}
              {aTab === 'order' && (
                <div className="mx-auto max-w-3xl px-4 pb-6 space-y-4 md:px-0">
                  <section className="rounded-[16px] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><h2 className="text-[17px] font-semibold">Shopping preferences</h2><p className="mt-1 text-[13px] text-[#6C6C70]">Pick your preferred grocery delivery service.</p></div>
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
                      <p className="mt-3 text-[11px] leading-snug text-[#6C6C70]">Sample item estimates only. Providers and store availability depend on your address. Live prices, delivery fees, taxes, and ordering integrations are not connected.</p>
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
                <div className="mx-auto max-w-3xl px-4 pb-6 space-y-4 md:px-0">
                  <section className="rounded-[16px] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: 'rgba(0,122,255,.10)', color: BLUE }}><Users size={18} /></span><div><h2 className="text-[16px] font-semibold">Family profiles</h2><p className="text-[12px] text-[#6C6C70]">Separate calorie goals and meal logs</p></div></div>
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(255,149,0,.15)', color: '#B35F00' }}>PREMIUM</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {profiles.map((profile) => <button key={profile.id} onClick={() => setActiveProfileId(profile.id)} className="flex items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium" style={activeProfileId === profile.id ? { background: BLUE, color: '#fff' } : { background: '#F2F2F7', color: '#3A3A3C' }}><span>{profile.emoji}</span>{profile.name}</button>)}
                      {!showProfileForm && profiles.length < 8 && <button onClick={() => setShowProfileForm(true)} className="flex items-center gap-1 rounded-full border border-dashed border-[#C7C7CC] px-3 py-2 text-[13px] font-medium" style={{ color: BLUE }}><Plus size={15} />Add profile</button>}
                    </div>
                    {showProfileForm && <form onSubmit={(event) => { event.preventDefault(); addFamilyProfile(); }} className="mt-3 flex gap-2"><input autoFocus value={profileNameInput} onChange={(event) => setProfileNameInput(event.target.value)} placeholder="Family member's name" maxLength={24} className="min-w-0 flex-1 rounded-[10px] bg-[#F2F2F7] px-3 py-2 text-[14px] outline-none" /><button type="submit" className="rounded-[10px] px-3 py-2 text-[14px] font-semibold text-white" style={{ background: BLUE }}>Add</button><button type="button" onClick={() => { setShowProfileForm(false); setProfileNameInput(''); }} className="rounded-[10px] bg-[#F2F2F7] px-3 py-2 text-[14px]">Cancel</button></form>}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/[0.07] pt-3">
                      <div><div className="text-[13px] font-medium">{activeProfile.name}’s daily calorie goal</div><div className="text-[11px] text-[#8E8E93]">Adjustable demo target</div></div>
                      <div className="flex items-center gap-2"><button aria-label="Lower calorie goal" onClick={() => setProfiles((current) => current.map((profile) => profile.id === activeProfileId ? { ...profile, goal: Math.max(800, profile.goal - 100) } : profile))} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F7] text-[#3A3A3C]"><Minus size={15} /></button><strong className="min-w-[82px] text-center text-[14px]">{GOAL} cal</strong><button aria-label="Raise calorie goal" onClick={() => setProfiles((current) => current.map((profile) => profile.id === activeProfileId ? { ...profile, goal: Math.min(5000, profile.goal + 100) } : profile))} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F7] text-[#3A3A3C]"><Plus size={15} /></button></div>
                    </div>
                    <p className="mt-3 text-[11px] leading-snug text-[#8E8E93]">Demo only: profiles share one fridge list and separate this session’s calorie logs. They are not separate password-protected accounts.</p>
                  </section>

                  <div className="bg-white rounded-[16px] p-5 flex flex-col items-center">
                    <div className="relative w-[132px] h-[132px]">
                      <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
                        <circle cx="66" cy="66" r="52" fill="none" stroke="#F2F2F7" strokeWidth="14" />
                        <circle cx="66" cy="66" r="52" fill="none" stroke={eaten > GOAL ? '#FF3B30' : '#FF2D55'} strokeWidth="14" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)} style={{ transition: 'stroke-dashoffset .5s' }} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center"><div className="text-[28px] font-bold leading-none">{eaten}</div><div className="text-[12px] text-[#6C6C70] mt-1">of {GOAL} cal</div></div>
                    </div>
                    <div className="text-[13px] text-[#6C6C70] mt-3">{activeProfile.name} · {Math.max(0, GOAL - eaten)} cal remaining today</div>
                  </div>
                  <Group title={`${activeProfile.name} · Today`}>
                    {meals.map((m, i) => <div key={i} className="flex justify-between px-3 py-3 text-[16px]"><span>{m.name}</span><span className="text-[#6C6C70]">{m.cal} cal</span></div>)}
                  </Group>
                  <div>
                    <div className="px-1 pb-1.5 text-[13px] uppercase text-[#6C6C70] tracking-wide">Quick add</div>
                    <div className="flex flex-wrap gap-2">{all.filter((i) => i.cal && i.days >= 0).slice(0, 5).map((i) => <button key={i.id} onClick={() => { const m = mcp('nutrition.log_meal', ['nutrition'], `Quick log ${i.name} for ${activeProfile.name}`); if (!m.length) logMealForActiveProfile({ name: i.name, cal: i.cal }); else flash('Nutrition access is off'); }} className="text-[13px] bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{ color: BLUE }}>{ART[i.kind] ? <FoodIcon kind={i.kind} size={18} /> : i.emoji} {i.name} · {i.cal}</button>)}</div>
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

              <Group title="AI can access" footer="Raw images, faces and recordings are never shared with the assistant. Browser speech recognition may process microphone audio through its own service; see the voice panel before speaking.">
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
                  <div><div className="text-[22px] font-bold tracking-tight">MyFridge</div><div className="text-[13px] text-white/60 mt-0.5">Wide-angle · door-mounted · voice-activated</div></div>
                  <div className="text-[22px] font-semibold">$79.99</div>
                </div>
                <div className="text-[13px] text-white/50 mt-4">One-time purchase. Includes the Free app.</div>
              </div>

              {[
                { name: 'Free', price: '$0', cur: !premium, feats: ["See what's in your fridge", 'Expiration tracking and color-coded alerts', 'Food savings dashboard when you mark items as used', 'Add and edit items and dates by hand', 'Alexa, Google Nest and more', 'Voice questions about inventory'] },
                { name: 'Premium', price: '$10/mo', cur: premium, feats: ['Everything in Free', 'AI Chef with step-by-step cooking and occasion-based recipes', 'Grocery ordering and sample store comparisons', 'Calorie tracking and family profiles'], prem: true },
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
                  <>
                    <button onClick={markItemUsed} disabled={sheetDays < 0} className="w-full bg-white rounded-[12px] py-3 text-[16px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40" style={{ color: '#1D8A3A' }}><Check size={17} />Mark one unit as used</button>
                    <button onClick={removeItem} className="w-full bg-white rounded-[12px] py-3 text-[17px] flex items-center justify-center gap-1.5" style={{ color: '#FF3B30' }}><Trash2 size={17} />Remove item</button>
                  </>
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
              <div className="flex justify-between items-center mt-3"><div className="font-semibold text-[17px]">Hey Fridge</div><button onClick={closeVoice} aria-label="Close voice assistant" className="w-7 h-7 rounded-full bg-[#7676801F] flex items-center justify-center"><X size={15} className="text-[#6C6C70]" /></button></div>
              <div className="flex justify-center my-6"><button onClick={startListening} disabled={voice.listening || voice.processing} aria-label="Start speaking" className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-white disabled:opacity-75" style={{ background: voice.listening ? 'linear-gradient(135deg,#FF375F,#FF9F0A)' : BLUE, animation: voice.listening ? 'pulse2 .9s infinite' : 'none', boxShadow: voice.listening ? '0 0 0 10px rgba(255,55,95,.15)' : 'none' }}><Mic size={30} /></button></div>
              {voice.said && <div className="text-[17px] text-center font-medium">“{voice.said}”</div>}
              {voice.listening && <div className="text-[14px] text-center text-[#8E8E93] mt-1">{voice.source === 'microphone' ? 'Listening…' : 'Running sample command…'}</div>}
              {voice.processing && <div className="text-[14px] text-center text-[#8E8E93] mt-1">Checking your fridge list…</div>}
              {voice.reply && <div className="bg-white rounded-[14px] p-3.5 text-[15px] mt-3 leading-snug">{voice.reply}</div>}
              {voice.reply && <button onClick={speakReply} className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-semibold" style={{ color: BLUE }}><Volume2 size={16} />{voice.source === 'microphone' ? 'Replay reply' : 'Hear reply'}</button>}
              <div className="mt-4 rounded-[14px] bg-white p-3">
                <label htmlFor="speech-voice" className="mb-2 block text-[12px] font-semibold text-[#6C6C70]">Spoken voice</label>
                {speechVoices.length > 0 ? (
                  <div className="flex gap-2">
                    <select id="speech-voice" value={speechVoiceURI} onChange={(event) => setSpeechVoiceURI(event.target.value)} className="min-w-0 flex-1 rounded-[10px] bg-[#F2F2F7] px-3 py-2 text-[14px] outline-none">
                      {speechVoices.map((candidate) => <option key={candidate.voiceURI} value={candidate.voiceURI}>{candidate.name}{candidate.default ? ' · Default' : ''}</option>)}
                    </select>
                    <button onClick={() => speakText("Hi, I'm your MyFridge assistant. What would you like to find today?")} className="shrink-0 rounded-[10px] px-3 text-[13px] font-semibold" style={{ background: 'rgba(0,122,255,.1)', color: BLUE }}>Preview</button>
                  </div>
                ) : <p className="text-[12px] leading-snug text-[#8E8E93]">No English Google voice is available in this browser. Text answers still work; spoken replies need a Google voice exposed by your browser.</p>}
              </div>
              <div className="text-[13px] text-[#6C6C70] mt-5 mb-2">Tap the mic and ask a question, or try a sample</div>
              <p className="mb-3 text-[12px] text-[#8E8E93]">Microphone access starts only after you tap. Answers to spoken questions read aloud automatically. Speech recognition depends on your browser and may send audio to its speech service; this demo does not send your voice to an AI service.</p>
              <div className="flex flex-wrap gap-2">{["Where are the lemons?", "What's expiring soon?", 'Do I have milk?', 'Scan the fridge', "What's for dinner?"].map((c) => <button key={c} onClick={() => voiceCmd(c)} className="text-[14px] bg-white rounded-full px-3.5 py-2" style={{ color: BLUE }}>{c}</button>)}</div>
            </div>
          </div>
        )}
    </div>
  );
}

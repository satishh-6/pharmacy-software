// fix-white-theme.js — node fix-white-theme.js
const fs = require('fs');

const pages = [
  'public/index.html', 'public/billing.html', 'public/stock.html',
  'public/purchase.html', 'public/customers.html', 'public/prescriptions.html',
  'public/branches.html', 'public/reports.html', 'public/profile.html'
];

const fixCSS = `
  /* ── GLOBAL WHITE THEME FIX ── */
  body { background: #f0f4f8; }

  /* Navbar */
  .navbar { background:#ffffff !important; box-shadow:0 2px 16px rgba(0,0,0,0.08) !important; border-bottom:1px solid #e2e8f0; color:#1a2332 !important; }
  .navbar h1 { font-size:26px !important; font-weight:900 !important; color:#1a2332 !important; white-space:nowrap; display:flex; align-items:center; gap:6px; }
  .navbar h1 .dawa, .navbar h1 span:first-child { color:#1a3a6b !important; }
  .navbar h1 .hisaab, .navbar h1 span:last-child { color:#1e6b3a !important; }
  .navbar h1 span { color:#1e6b3a !important; }

  /* Nav buttons — dark text on white bg */
  .nav-badge { background:#f0f4f8 !important; color:#1a2332 !important; border:1px solid #e2e8f0 !important; }
  .nav-badge:hover { background:#e2e8f0 !important; }
  .btn-logout { background:transparent !important; border:1.5px solid #d0d7de !important; color:#1a2332 !important; }
  .btn-logout:hover { background:#f0f4f8 !important; color:#1a2332 !important; }
  .btn-back { background:#f0f4f8 !important; border:1.5px solid #d0d7de !important; color:#1a2332 !important; }
  .btn-back:hover { background:#e2e8f0 !important; }

  /* Sidebar active — keep brand colors */
  .sidebar a:hover { background:#EBF5FB; color:#1a3a6b; border-left-color:#1a3a6b; }
  .sidebar a.active { background:#EBF5FB; color:#1a3a6b; border-left-color:#1a3a6b; font-weight:700; }

  /* Primary buttons — dark gradient */
  .btn-primary { background:linear-gradient(135deg,#1a3a6b,#1e6b3a) !important; color:#ffffff !important; }
  .btn-primary:hover { box-shadow:0 6px 20px rgba(26,58,107,0.3) !important; color:#ffffff !important; }
  .abtn.save { background:linear-gradient(135deg,#1a3a6b,#154360) !important; color:#ffffff !important; }
  .abtn.prnt { background:linear-gradient(135deg,#1E8449,#145A32) !important; color:#ffffff !important; }
  .abtn.wa { background:linear-gradient(135deg,#25D366,#128C7E) !important; color:#ffffff !important; }

  /* Table headers — keep dark */
  .bill-tbl thead tr, table thead tr { background:linear-gradient(135deg,#1a3a6b,#154360) !important; }
  .bill-tbl thead th, table thead th { color:rgba(255,255,255,0.9) !important; }

  /* Welcome bar on dashboard */
  .welcome-bar { background:linear-gradient(135deg,#1a3a6b,#1e6b3a) !important; color:#ffffff !important; }
  .welcome-bar * { color:#ffffff !important; }

  /* Stat cards keep white bg */
  .stat-card, .card { background:#ffffff; }

  /* Tab active in profile */
  .tab-btn.active { background:linear-gradient(135deg,#1a3a6b,#1e6b3a) !important; color:#ffffff !important; }

  /* Profile banner */
  .profile-banner { background:linear-gradient(135deg,#1a3a6b,#1e6b3a) !important; }
  .profile-name { color:#ffffff !important; }
  .profile-sub { color:rgba(255,255,255,0.75) !important; }
`;

let fixed = 0;

pages.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  // Remove ALL old navbar/theme CSS blocks first
  html = html.replace(/\/\* ── DAWA HISAAB BRAND THEME ── \*\/[\s\S]*?\.dh-logo \{ display: none !important; \}/g, '');
  html = html.replace(/\/\* ── WHITE NAVBAR THEME ── \*\/[\s\S]*?\.btn-logout:hover \{ background: #f0f4f8 !important; \}/g, '');
  html = html.replace(/\/\* ── GLOBAL WHITE THEME FIX ── \*\/[\s\S]*?\.profile-banner \{ background:linear-gradient[\s\S]*?\}/g, '');

  // Fix white-on-white button colors directly in CSS
  html = html.replace(/\.btn-primary \{ background:#ffffff; color:white; \}/g,
    '.btn-primary { background:linear-gradient(135deg,#1a3a6b,#1e6b3a); color:#ffffff; }');
  html = html.replace(/\.btn-primary \{ background:#1B4F72; color:white; \}/g,
    '.btn-primary { background:linear-gradient(135deg,#1a3a6b,#1e6b3a); color:#ffffff; }');

  // Fix btn-logout white text
  html = html.replace(/\.btn-logout \{ background:rgba\(255,255,255,0\.15\); border:1\.5px solid rgba\(255,255,255,0\.4\); color:white;/g,
    '.btn-logout { background:transparent; border:1.5px solid #d0d7de; color:#1a2332;');

  // Fix nav-badge white text  
  html = html.replace(/\.nav-badge \{ background:rgba\(255,255,255,0\.15\);[^}]*\}/g,
    '.nav-badge { background:#f0f4f8; padding:6px 14px; border-radius:20px; font-size:12px; cursor:pointer; color:#1a2332; border:1px solid #e2e8f0; }');

  // Inject fix CSS before </style>
  if (!html.includes('GLOBAL WHITE THEME FIX')) {
    html = html.replace('</style>', fixCSS + '\n</style>');
  }

  if (html !== orig) {
    fs.writeFileSync(file, html);
    console.log('✅ Fixed:', file.replace('public/', ''));
    fixed++;
  }
});

console.log(`\n🎉 ${fixed} files fixed!`);
console.log('Run: taskkill /F /IM node.exe && node server.js');
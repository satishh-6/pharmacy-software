// update-navbar.js — node update-navbar.js
const fs = require('fs');

const files = [
  'public/index.html', 'public/billing.html', 'public/stock.html',
  'public/purchase.html', 'public/customers.html', 'public/prescriptions.html',
  'public/branches.html', 'public/reports.html', 'public/profile.html',
  'public/signup.html', 'public/superadmin/index.html'
];

const newNavbarCSS = `
  /* ── DAWA HISAAB BRAND THEME ── */
  .navbar {
    background: linear-gradient(135deg, #0f2744 0%, #1a3a2a 100%) !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
  }
  .navbar .dawa  { color: #ffffff; font-weight: 900; }
  .navbar .hisaab{ color: #4ade80; font-weight: 900; }
  .dh-logo { display: none !important; }
`;

let fixed = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let h = fs.readFileSync(file, 'utf8');
  const orig = h;

  // 1. Remove DH logo script blocks
  h = h.replace(/<script>\s*fetch\('\/api\/platform-logo'\)[\s\S]*?<\/script>/g, '');
  h = h.replace(/<script>\s*\(function\(\)\{[\s\S]*?platform-logo[\s\S]*?\}\)\(\);\s*<\/script>/g, '');

  // 2. Remove logo img tags
  h = h.replace(/<img[^>]*class="dh-logo"[^>]*\/>/g, '');
  h = h.replace(/<img[^>]*class="dh-nav-logo"[^>]*>/g, '');
  h = h.replace(/<img[^>]*id="dhLogo"[^>]*\/>/g, '');
  h = h.replace(/<img[^>]*id="dhNavLogo"[^>]*\/>/g, '');
  h = h.replace(/<img[^>]*id="dhSignupLogo"[^>]*\/>/g, '');

  // 3. Remove logo wrapper divs that were added
  h = h.replace(/<div style="display:flex;align-items:center;gap:10px;">\s*<img[^>]*\/>\s*(<h1[^>]*>)/g, '$1');
  h = h.replace(/<\/h1>\s*<\/div>/g, '</h1>');

  // 4. Replace h1 content — remove emoji, add brand classes
  h = h.replace(/💊\s*Dawa\s*<span[^>]*>Hisaab<\/span>/g,
    '<span class="dawa">Dawa</span> <span class="hisaab">Hisaab</span>');
  h = h.replace(/💊\s*Dawa\s*<span>Hisaab<\/span>/g,
    '<span class="dawa">Dawa</span> <span class="hisaab">Hisaab</span>');

  // 5. Add CSS before </style>
  if (!h.includes('DAWA HISAAB BRAND THEME')) {
    h = h.replace('</style>', newNavbarCSS + '\n  </style>');
  }

  // 6. Remove navPharmacy div from navbar
  h = h.replace(/<div id="navPharmacy"[^>]*><\/div>/g, '');
  h = h.replace(/<div id="navPharmacy"[^>]*>.*?<\/div>/g, '');

  if (h !== orig) {
    fs.writeFileSync(file, h);
    console.log('✅ Updated:', file.replace('public/', ''));
    fixed++;
  } else {
    console.log('⚠️  No change:', file.replace('public/', ''));
  }
});

console.log(`\n🎉 Done! ${fixed} files updated.`);
console.log('Run: taskkill /F /IM node.exe && node server.js');

const newNavbarCSS = `
  .navbar {
    background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%) !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
  }
  .navbar h1 {
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 22px !important;
  }
  .navbar .dawa   { color: #ffffff; font-weight: 900; }
  .navbar .hisaab { color: #4ade80; font-weight: 900; }
`;
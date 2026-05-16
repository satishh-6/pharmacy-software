// update-all-theme.js — node update-all-theme.js
const fs = require('fs');

const pages = [
  'public/index.html',
  'public/billing.html', 
  'public/stock.html',
  'public/purchase.html',
  'public/customers.html',
  'public/prescriptions.html',
  'public/branches.html',
  'public/reports.html',
  'public/profile.html',
  'public/superadmin/index.html'
];

// New white navbar CSS to inject
const whiteNavbarCSS = `
  /* ── WHITE NAVBAR THEME ── */
  .navbar {
    background: #ffffff !important;
    box-shadow: 0 2px 16px rgba(0,0,0,0.08) !important;
    border-bottom: 1px solid #e2e8f0;
    color: #1a2332 !important;
  }
  .navbar h1 {
    font-size: 26px !important;
    font-weight: 900 !important;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .navbar h1 .dawa   { color: #1a3a6b !important; }
  .navbar h1 .hisaab { color: #1e6b3a !important; }
  .navbar h1 span    { color: #1e6b3a !important; }
  .nav-badge {
    background: #f0f4f8 !important;
    color: #1a2332 !important;
    border: 1px solid #e2e8f0;
  }
  .nav-badge:hover { background: #e2e8f0 !important; }
  .btn-logout {
    background: transparent !important;
    border: 1.5px solid #e2e8f0 !important;
    color: #1a2332 !important;
  }
  .btn-logout:hover { background: #f0f4f8 !important; }
`;

let totalFixed = 0;

pages.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('⚠️  Not found:', file);
    return;
  }

  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  // 1. Remove pill emoji 💊
  html = html.replace(/💊\s*/g, '');

  // 2. Remove old dark navbar CSS and add white theme
  if (!html.includes('WHITE NAVBAR THEME')) {
    // Add white navbar CSS before </style>
    html = html.replace('</style>', whiteNavbarCSS + '\n</style>');
  }

  // 3. Update existing dark navbar background inline styles
  html = html.replace(
    /background:linear-gradient\(135deg,#1B4F72,#154360\)/g,
    'background:#ffffff'
  );
  html = html.replace(
    /background:\s*linear-gradient\(135deg,\s*#1B4F72,\s*#154360\)/g,
    'background:#ffffff'
  );
  html = html.replace(
    /background:\s*linear-gradient\(135deg,\s*#0f2744[^)]*\)/g,
    'background:#ffffff'
  );

  // 4. Update navbar h1 span color (light blue → brand green)
  html = html.replace(
    '.navbar h1 span { color:#85C1E9; }',
    '.navbar h1 span { color:#1e6b3a; }'
  );

  // 5. Make Dawa Hisaab text bigger
  html = html.replace(
    /font-size:22px;font-weight:800;flex:1/g,
    'font-size:26px;font-weight:900;flex:1'
  );
  html = html.replace(
    /font-size:20px;font-weight:800;margin:0/g,
    'font-size:26px;font-weight:900;margin:0'
  );

  // 6. Fix shadow color for white navbar
  html = html.replace(
    'box-shadow:0 4px 20px rgba(27,79,114,0.4)',
    'box-shadow:0 2px 16px rgba(0,0,0,0.08)'
  );
  html = html.replace(
    'box-shadow:0 4px 20px rgba(27,79,114,0.45)',
    'box-shadow:0 2px 16px rgba(0,0,0,0.08)'
  );

  if (html !== orig) {
    fs.writeFileSync(file, html);
    console.log('✅ Updated:', file.replace('public/', ''));
    totalFixed++;
  } else {
    console.log('⚠️  No change:', file.replace('public/', ''));
  }
});

console.log(`\n🎉 Done! ${totalFixed} files updated.`);
console.log('Run: taskkill /F /IM node.exe && node server.js');
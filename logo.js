// add-platform-logo.js — node add-platform-logo.js
const fs = require('fs');
const path = require('path');

const files = [
  'public/index.html',
  'public/billing.html',
  'public/stock.html',
  'public/purchase.html',
  'public/customers.html',
  'public/prescriptions.html',
  'public/branches.html',
  'public/reports.html',
  'public/profile.html'
];

// Old navbar h1 patterns → replace with logo + text
const oldPatterns = [
  '<h1>💊 Dawa <span>Hisaab</span></h1>',
  '<h1 style="font-size:22px;font-weight:800;flex:1;">💊 Dawa <span>Hisaab</span></h1>',
  '<h1 style="font-size:22px;font-weight:800;flex:1;letter-spacing:-0.5px;">💊 Dawa <span>Hisaab</span></h1>',
  '<h1 style="font-size:22px; font-weight:800; flex:1;">💊 Dawa <span>Hisaab</span></h1>'
];

const newNavbarBrand = `<div style="display:flex;align-items:center;gap:10px;">
    <img id="dhLogo" src="/api/platform-logo-img" style="height:38px;width:auto;object-fit:contain;border-radius:6px;" onerror="this.style.display='none'" />
    <h1 style="font-size:20px;font-weight:800;margin:0;">Dawa <span>Hisaab</span></h1>
  </div>`;

// Script to load platform logo
const logoScript = `
<script>
// Load platform logo
fetch('/api/platform-logo').then(r=>r.json()).then(d=>{
  if(d.logo){
    const img=document.getElementById('dhLogo');
    if(img){img.src=d.logo;img.style.display='block';}
  }
}).catch(()=>{});
</script>`;

let totalFixed = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  // Replace h1 with logo + text
  let replaced = false;
  for (const pattern of oldPatterns) {
    if (html.includes(pattern)) {
      html = html.replace(pattern, newNavbarBrand);
      replaced = true;
      break;
    }
  }

  // Generic replacement - find h1 with 💊
  if (!replaced && html.includes('💊 Dawa')) {
    html = html.replace(/(<h1[^>]*>)💊 Dawa (<span>Hisaab<\/span><\/h1>)/g,
      `<div style="display:flex;align-items:center;gap:10px;"><img id="dhLogo" src="" style="height:38px;width:auto;object-fit:contain;border-radius:6px;display:none;" />$1Dawa $2</div>`
    );
    replaced = true;
  }

  // Add logo loader script before </body>
  if (replaced && !html.includes('/api/platform-logo')) {
    html = html.replace('</body>', logoScript + '\n</body>');
  }

  if (html !== orig) {
    fs.writeFileSync(file, html);
    console.log('✅ Fixed:', path.basename(file));
    totalFixed++;
  } else {
    console.log('⚠️  Skipped (pattern not found):', path.basename(file));
  }
});

console.log(`\n✅ Done! ${totalFixed} files updated.`);
console.log('📌 Next: node server.js restart karo');
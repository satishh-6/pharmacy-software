// fix-logo-navbar.js — node fix-logo-navbar.js
const fs = require('fs');

const files = [
  'public/index.html', 'public/billing.html', 'public/stock.html',
  'public/purchase.html', 'public/customers.html', 'public/prescriptions.html',
  'public/branches.html', 'public/reports.html', 'public/profile.html',
  'public/superadmin/index.html'
];

// Logo loader script to inject
const logoLoader = `
<script>
(function(){
  fetch('/api/platform-logo').then(r=>r.json()).then(d=>{
    if(!d.logo)return;
    // Navbar logo
    var els=document.querySelectorAll('.dh-platform-logo');
    els.forEach(function(el){el.src=d.logo;el.style.display='block';});
    // Replace emoji in h1
    document.querySelectorAll('h1').forEach(function(h){
      if(h.textContent.includes('Dawa') && h.textContent.includes('Hisaab')){
        if(!h.querySelector('.dh-platform-logo')){
          var img=document.createElement('img');
          img.src=d.logo;
          img.className='dh-platform-logo';
          img.style.cssText='height:36px;width:auto;object-fit:contain;vertical-align:middle;margin-right:8px;border-radius:6px;';
          h.insertBefore(img, h.firstChild);
          // Remove emoji if present
          h.childNodes.forEach(function(n){
            if(n.nodeType===3 && n.textContent.includes('💊')){
              n.textContent=n.textContent.replace('💊','').trim()+' ';
            }
          });
        }
      }
    });
  }).catch(function(){});
})();
</script>`;

let fixed = 0;
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('fix-logo-navbar')) return; // already done
  // Add before </body>
  if (html.includes('</body>')) {
    html = html.replace('</body>', logoLoader + '\n</body>');
    fs.writeFileSync(file, html);
    console.log('✅', file);
    fixed++;
  }
});
console.log('Done!', fixed, 'files updated');
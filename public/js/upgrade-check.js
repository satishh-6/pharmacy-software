(function(){
  const u    = JSON.parse(localStorage.getItem('user')||'{}');
const plan = (u.plan||'trial').toLowerCase();
if(plan==='pro'||plan==='enterprise'){
  localStorage.removeItem('isTrialExpired');
  localStorage.removeItem('showUpgrade');
  return;
}

// Basic plan chosen → alag UI dikhao
if(plan==='basic'){
  document.addEventListener('DOMContentLoaded', function(){
    // Navbar
    const navRight = document.querySelector('.nav-right');
    if(navRight && !document.getElementById('upgradeNavBtn')){
      const btn = document.createElement('div');
      btn.id = 'upgradeNavBtn';
      btn.innerHTML = `<a href="/profile.html" style="
        display:inline-flex;align-items:center;gap:5px;
        background:linear-gradient(135deg,#1a3a6b,#1e6b3a);
        color:white;padding:6px 14px;border-radius:20px;
        font-size:12px;font-weight:800;text-decoration:none;
        white-space:nowrap;">
        🔵 Free Plan — Upgrade Karo
      </a>`;
      const badge = navRight.querySelector('.nav-badge');
      if(badge) navRight.insertBefore(btn, badge);
      else navRight.prepend(btn);
    }
    // Bottom banner
    if(!document.getElementById('trialBanner')){
      const bar = document.createElement('div');
      bar.id = 'trialBanner';
      bar.innerHTML = `
        <span style="font-size:13px;font-weight:600;">
          🔵 <strong>Free Plan</strong> — Pro ya Enterprise lo aur sab features unlock karo!
        </span>
        <div style="display:flex;gap:8px;flex-shrink:0;">
          <a href="tel:+917620184623" style="background:white;color:#1a3a6b;
            padding:5px 14px;border-radius:20px;font-size:12px;
            font-weight:800;text-decoration:none;">
            📞 Call for Upgrade
          </a>
          <a href="https://wa.me/917620184623" target="_blank" style="background:white;color:#1E8449;
            padding:5px 14px;border-radius:20px;font-size:12px;
            font-weight:800;text-decoration:none;">
            💬 WhatsApp
          </a>
        </div>`;
      Object.assign(bar.style,{
        position:'fixed', bottom:'0',
        left: document.querySelector('.sidebar') ? '225px' : '0',
        right:'0', zIndex:'997',
        background:'linear-gradient(135deg,#1a3a6b,#154360)',
        color:'white', padding:'10px 24px',
        display:'flex', justifyContent:'space-between',
        alignItems:'center', gap:'16px',
        fontFamily:'Segoe UI,sans-serif',
        boxShadow:'0 -4px 16px rgba(0,0,0,0.2)'
      });
      document.body.appendChild(bar);
    }
  });
  return;
}

  const showUpgrade = localStorage.getItem('showUpgrade');
  const daysLeft    = parseInt(localStorage.getItem('trialDaysLeft')||'0');
  const isExpired   = localStorage.getItem('isTrialExpired')==='true';

  if(showUpgrade !== 'true') return;

  // ── EXPIRED → FULL BLOCK ──
  if(isExpired) return;


  // ── ACTIVE TRIAL → NAVBAR BUTTON + BANNER ──
  document.addEventListener('DOMContentLoaded', function(){

    // Navbar button
    const navRight = document.querySelector('.nav-right');
    if(navRight && !document.getElementById('upgradeNavBtn')){
      const btn = document.createElement('div');
      btn.id = 'upgradeNavBtn';
      btn.innerHTML = `
        <a href="/profile.html" style="
          display:inline-flex;align-items:center;gap:5px;
          background:linear-gradient(135deg,#e65100,#f57c00);
          color:white;padding:6px 14px;border-radius:20px;
          font-size:12px;font-weight:800;text-decoration:none;
          box-shadow:0 2px 8px rgba(230,81,0,0.4);
          white-space:nowrap;">
          ⚡ ${daysLeft}d Trial Left — Upgrade
        </a>`;
      const badge = navRight.querySelector('.nav-badge');
      if(badge) navRight.insertBefore(btn, badge);
      else navRight.prepend(btn);
    }

    // Bottom banner
    if(!document.getElementById('trialBanner')){
      const color = daysLeft <= 1 ? '#e65100' : '#B7770D';
      const bar = document.createElement('div');
      bar.id = 'trialBanner';
      bar.innerHTML = `
        <span style="font-size:13px;font-weight:600;">
          ⏳ <strong>${daysLeft} din</strong> trial bache hain — plan lo aur nischint raho!
        </span>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
          <a href="tel:7620184623" style="background:white;color:${color};padding:5px 14px;border-radius:20px;font-size:12px;font-weight:800;text-decoration:none;">
            📞 7620184623
          </a>
          <a href="/profile.html" style="background:white;color:${color};padding:5px 14px;border-radius:20px;font-size:12px;font-weight:800;text-decoration:none;">
            🚀 Upgrade
          </a>
        </div>`;
      Object.assign(bar.style,{
        position:'fixed', bottom:'0',
        left: document.querySelector('.sidebar') ? '225px' : '0',
        right:'0', zIndex:'997',
        background:color, color:'white',
        padding:'10px 24px',
        display:'flex', justifyContent:'space-between',
        alignItems:'center', gap:'16px',
        fontFamily:'Segoe UI,sans-serif',
        boxShadow:'0 -4px 16px rgba(0,0,0,0.2)'
      });
      document.body.appendChild(bar);
    }
  });

})();
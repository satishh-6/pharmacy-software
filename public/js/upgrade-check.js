(function(){
  const showUpgrade = localStorage.getItem('showUpgrade');
  const daysLeft    = parseInt(localStorage.getItem('trialDaysLeft')||'0');
  const isExpired   = localStorage.getItem('isTrialExpired')==='true';

  if(showUpgrade !== 'true') return;

  // ── EXPIRED → FULL BLOCK ──
  if(isExpired){
    document.addEventListener('DOMContentLoaded', function(){
      // Poori screen block karo
      const overlay = document.createElement('div');
      overlay.id = 'trialBlockOverlay';
      overlay.innerHTML = `
        <div style="
          background:white;border-radius:20px;
          padding:48px 40px;max-width:460px;width:90%;
          text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.3);">
          <div style="font-size:56px;margin-bottom:16px;">⏰</div>
          <div style="font-size:22px;font-weight:900;color:#1a2332;margin-bottom:8px;">
            Trial Period Over!
          </div>
          <div style="font-size:14px;color:#546e7a;line-height:1.7;margin-bottom:24px;">
            Aapka <strong>3 din ka free trial</strong> khatam ho gaya hai.<br>
            Dawa Hisaab ka plan lo aur kaam jari rakho.
          </div>

          <div style="
            background:#f0f4f8;border-radius:12px;
            padding:18px;margin-bottom:24px;">
            <div style="font-size:11px;color:#78909c;font-weight:700;
              text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
              📋 Humara Plans
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                <span>🔵 <strong>Basic</strong></span>
                <span style="color:#1a3a6b;font-weight:700;">₹500/year</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                <span>⭐ <strong>Pro</strong></span>
                <span style="color:#7D3C98;font-weight:700;">₹1500/year</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 12px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                <span>🚀 <strong>Enterprise</strong></span>
                <span style="color:#1E8449;font-weight:700;">₹3000/year</span>
              </div>
            </div>
          </div>

          <a href="tel:7620184623" style="
            display:block;
            background:linear-gradient(135deg,#1a3a6b,#1e6b3a);
            color:white;padding:14px;border-radius:12px;
            font-size:16px;font-weight:800;text-decoration:none;
            margin-bottom:12px;">
            📞 Call Now: 7620184623
          </a>
          <a href="https://wa.me/917620184623?text=Hi%2C%20I%20want%20to%20upgrade%20my%20Dawa%20Hisaab%20plan"
            target="_blank" style="
            display:block;
            background:linear-gradient(135deg,#25D366,#128C7E);
            color:white;padding:12px;border-radius:12px;
            font-size:14px;font-weight:800;text-decoration:none;
            margin-bottom:16px;">
            💬 WhatsApp pe Message Karo
          </a>
          <div style="font-size:12px;color:#90a4ae;">
            📞 7620184623 &nbsp;|&nbsp; Dawa Hisaab Support
          </div>
        </div>`;

      Object.assign(overlay.style,{
        position:'fixed', inset:'0', zIndex:'99999',
        background:'rgba(10,20,40,0.92)',
        display:'flex', alignItems:'center',
        justifyContent:'center',
        fontFamily:'Segoe UI,sans-serif',
        backdropFilter:'blur(6px)'
      });

      document.body.appendChild(overlay);

      // Scroll + click block
      document.body.style.overflow = 'hidden';
    });
    return; // Banner mat dikhao
  }

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
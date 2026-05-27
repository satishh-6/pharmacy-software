// ── DAWA HISAAB — PLAN ACCESS GUARD ──
(function(){

  const PLANS = {
    trial:      ['dashboard','stock','billing','purchase'],
    basic:      ['dashboard','stock','billing','purchase'],
    pro:        ['dashboard','stock','billing','purchase','customers','prescriptions','reports'],
    enterprise: ['dashboard','stock','billing','purchase','customers','prescriptions','reports','branches']
  };

  const PAGE_MAP = {
    'index.html':         'dashboard',
    'stock.html':         'stock',
    'billing.html':       'billing',
    'purchase.html':      'purchase',
    'customers.html':     'customers',
    'prescriptions.html': 'prescriptions',
    'branches.html':      'branches',
    'reports.html':       'reports',
  };

  const PLAN_LABELS = {
    customers:     { need:'pro',        icon:'👥', label:'Customers',     color:'#7D3C98' },
    prescriptions: { need:'pro',        icon:'📋', label:'Prescriptions', color:'#7D3C98' },
    reports:       { need:'pro',        icon:'📊', label:'Reports',       color:'#7D3C98' },
    branches:      { need:'enterprise', icon:'🏪', label:'Branches',      color:'#1E8449' },
  };

  // ── GET USER PLAN ──
  function getUserPlan(){
    try{
      const u = JSON.parse(localStorage.getItem('user')||'{}');
      return (u.plan || localStorage.getItem('userPlan') || 'trial').toLowerCase();
    }catch{ return 'trial'; }
  }

  const plan    = getUserPlan();
  const allowed = PLANS[plan] || PLANS['trial'];

  // ── CURRENT PAGE CHECK ──
  const page    = window.location.pathname.split('/').pop() || 'index.html';
  const feature = PAGE_MAP[page];

  // ── BLOCK CURRENT PAGE IF RESTRICTED ──
  if(feature && !allowed.includes(feature)){
    document.addEventListener('DOMContentLoaded', function(){
      const info = PLAN_LABELS[feature] || {};
      const needPlan = info.need || 'pro';

      const overlay = document.createElement('div');
      overlay.innerHTML = `
        <div style="background:white;border-radius:20px;padding:48px 40px;
          max-width:440px;width:90%;text-align:center;
          box-shadow:0 24px 60px rgba(0,0,0,0.3);">
          <div style="font-size:52px;margin-bottom:12px;">🔒</div>
          <div style="font-size:20px;font-weight:900;color:#1a2332;margin-bottom:8px;">
            ${info.icon||''} ${info.label||feature} Restricted
          </div>
          <div style="font-size:13px;color:#546e7a;line-height:1.7;margin-bottom:20px;">
            Yeh feature <strong style="color:${info.color||'#7D3C98'};">
            ${needPlan==='enterprise'?'Enterprise':'Pro / Enterprise'} Plan</strong>
            mein available hai.
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:20px;border:1px solid #e2e8f0;">
            ${needPlan==='enterprise'
              ?`<div style="font-size:13px;font-weight:700;color:#1E8449;">🚀 Enterprise — ₹3000/year</div>
                <div style="font-size:12px;color:#78909c;margin-top:4px;">Sab features + Branches + Multi-branch</div>`
              :`<div style="font-size:13px;font-weight:700;color:#7D3C98;">⭐ Pro — ₹1500/year</div>
                <div style="font-size:11px;color:#78909c;margin-top:2px;">Basic plan FREE hai</div>`
                <div style="font-size:12px;color:#78909c;margin-top:4px;">Customers, Reports, Prescriptions + sab basic features</div>`}
          </div>
          <a href="tel:7620184623" style="
            display:block;background:linear-gradient(135deg,#1a3a6b,#1e6b3a);
            color:white;padding:13px;border-radius:12px;
            font-size:15px;font-weight:800;text-decoration:none;margin-bottom:10px;">
            📞 Upgrade: 7620184623
          </a>
          <a href="https://wa.me/917620184623?text=Hi%2C+I+want+to+upgrade+Dawa+Hisaab+plan"
            target="_blank" style="
            display:block;background:linear-gradient(135deg,#25D366,#128C7E);
            color:white;padding:11px;border-radius:12px;
            font-size:14px;font-weight:800;text-decoration:none;margin-bottom:16px;">
            💬 WhatsApp Karo
          </a>
          <button onclick="history.back()" style="
            background:#f0f4f8;border:none;color:#546e7a;
            padding:10px 24px;border-radius:10px;cursor:pointer;
            font-size:13px;font-weight:700;">
            ← Wapas Jao
          </button>
        </div>`;
      Object.assign(overlay.style,{
        position:'fixed',inset:'0',zIndex:'99998',
        background:'rgba(10,20,40,0.88)',
        display:'flex',alignItems:'center',justifyContent:'center',
        fontFamily:'Segoe UI,sans-serif',backdropFilter:'blur(6px)'
      });
      document.body.appendChild(overlay);
      document.body.style.overflow='hidden';
    });
  }

  // ── SIDEBAR LOCK ICONS ──
  document.addEventListener('DOMContentLoaded', function(){
    const links = document.querySelectorAll('.sidebar a');
    links.forEach(link=>{
      const href = (link.getAttribute('href')||'').replace('./','');
      const feat = PAGE_MAP[href];
      if(!feat || allowed.includes(feat)) return;

      const info = PLAN_LABELS[feat];
      if(!info) return;

      // Lock style
      link.style.opacity = '0.6';
      link.style.cursor  = 'not-allowed';
      link.style.position = 'relative';

      // Lock badge
      const badge = document.createElement('span');
      badge.textContent = info.need==='enterprise' ? '🏢' : '⭐';
      badge.title = info.need==='enterprise'
        ? 'Enterprise plan required'
        : 'Pro plan required';
      Object.assign(badge.style,{
        marginLeft:'auto', fontSize:'12px',
        background: info.need==='enterprise' ? '#EAFAF1' : '#F4ECF7',
        color: info.color,
        padding:'2px 7px', borderRadius:'10px',
        fontWeight:'700', flexShrink:'0'
      });
      link.appendChild(badge);

      // Click intercept
      link.addEventListener('click', function(e){
        e.preventDefault();
        showUpgradeModal(info);
      });
    });
  });

  // ── UPGRADE MODAL (sidebar click pe) ──
  function showUpgradeModal(info){
    if(document.getElementById('planUpgradeModal')) return;
    const modal = document.createElement('div');
    modal.id = 'planUpgradeModal';
    modal.innerHTML = `
      <div style="background:white;border-radius:18px;padding:36px 32px;
        max-width:400px;width:90%;text-align:center;
        box-shadow:0 20px 50px rgba(0,0,0,0.25);">
        <div style="font-size:40px;margin-bottom:10px;">🔒</div>
        <div style="font-size:18px;font-weight:900;color:#1a2332;margin-bottom:6px;">
          ${info.icon} ${info.label} Locked
        </div>
        <div style="font-size:13px;color:#546e7a;margin-bottom:18px;line-height:1.6;">
          ${info.need==='enterprise'
            ?'Yeh feature sirf <strong>Enterprise Plan</strong> mein hai.'
            :'Yeh feature <strong>Pro / Enterprise Plan</strong> mein hai.'}
        </div>
        <a href="tel:7620184623" style="
          display:block;background:linear-gradient(135deg,#1a3a6b,#1e6b3a);
          color:white;padding:12px;border-radius:10px;
          font-size:14px;font-weight:800;text-decoration:none;margin-bottom:8px;">
          📞 7620184623
        </a>
        <a href="https://wa.me/917620184623" target="_blank" style="
          display:block;background:linear-gradient(135deg,#25D366,#128C7E);
          color:white;padding:10px;border-radius:10px;
          font-size:13px;font-weight:800;text-decoration:none;margin-bottom:14px;">
          💬 WhatsApp
        </a>
        <button onclick="document.getElementById('planUpgradeModal').remove()"
          style="background:#f0f4f8;border:none;color:#546e7a;
          padding:9px 22px;border-radius:9px;cursor:pointer;
          font-size:13px;font-weight:700;">
          Close
        </button>
      </div>`;
    Object.assign(modal.style,{
      position:'fixed',inset:'0',zIndex:'99997',
      background:'rgba(10,20,40,0.7)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontFamily:'Segoe UI,sans-serif'
    });
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){
      if(e.target===modal) modal.remove();
    });
  }

})();
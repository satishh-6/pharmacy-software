// ── DAWA HISAAB — PLAN ACCESS GUARD ──
(function(){

  var PAGE_MAP = {
    'index.html':         'dashboard',
    'stock.html':         'stock',
    'billing.html':       'billing',
    'purchase.html':      'purchase',
    'customers.html':     'customers',
    'prescriptions.html': 'prescriptions',
    'branches.html':      'branches',
    'reports.html':       'reports'
  };

  var PLANS = {
    trial:      ['dashboard','stock','billing','purchase','customers','prescriptions','reports','branches'],
    basic:      ['dashboard','stock','billing','purchase'],
    pro:        ['dashboard','stock','billing','purchase','customers','prescriptions','reports'],
    enterprise: ['dashboard','stock','billing','purchase','customers','prescriptions','reports','branches']
  };

  var FEATURE_INFO = {
    customers:     { need:'pro',        icon:'👥', label:'Customers'     },
    prescriptions: { need:'pro',        icon:'📋', label:'Prescriptions' },
    reports:       { need:'pro',        icon:'📊', label:'Reports'       },
    branches:      { need:'enterprise', icon:'🏪', label:'Branches'      }
  };

  // ── GET USER PLAN ──
// ── GET USER PLAN ──
  function getUserPlan(){
    try{
      var u    = JSON.parse(localStorage.getItem('user') || '{}');
      var plan = (u.plan || '').toLowerCase();

      // Plan missing → API se fetch karenge (async)
      if(!plan || plan === 'undefined'){
        fetchPlanFromAPI();
        return 'trial';
      }

      if(plan === 'pro' || plan === 'enterprise'){
        localStorage.removeItem('isTrialExpired');
        localStorage.removeItem('trialDaysLeft');
        localStorage.setItem('showUpgrade','false');
        return plan;
      }

      if(plan === 'basic') return 'basic';

      var expired = localStorage.getItem('isTrialExpired') === 'true';
      var days    = parseInt(localStorage.getItem('trialDaysLeft') || '3');
      if(expired || days <= 0) return 'basic_expired';
      return 'trial';
    }catch(e){ return 'trial'; }
  }

  // ── API SE PLAN FETCH ──
  function fetchPlanFromAPI(){
    var token = localStorage.getItem('tenantToken') || localStorage.getItem('token') || '';
    if(!token) return;
    fetch('/api/tenant-auth/trial-status', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
      var u = JSON.parse(localStorage.getItem('user') || '{}');
      u.plan = data.plan || 'trial';
      localStorage.setItem('user', JSON.stringify(u));
      var days = data.daysLeft || 0;
      localStorage.setItem('trialDaysLeft', String(days));
      if(data.plan === 'trial' && days <= 0){
        localStorage.setItem('isTrialExpired','true');
        localStorage.setItem('showUpgrade','true');
      } else if(data.plan === 'pro' || data.plan === 'enterprise'){
        localStorage.setItem('showUpgrade','false');
        localStorage.removeItem('isTrialExpired');
      } else {
        localStorage.setItem('showUpgrade','true');
      }
      location.reload();
    })
    .catch(function(e){ console.log('Plan fetch error:', e); });
  }

  var plan    = getUserPlan();
  var allowed = PLANS[plan] || PLANS['trial'];
  var page    = (window.location.pathname.split('/').pop() || 'index.html');
  var feature = PAGE_MAP[page];

  // ── TRIAL EXPIRED → PLAN SELECTION SCREEN ──
  if(plan === 'basic_expired'){
    document.addEventListener('DOMContentLoaded', function(){
      showPlanSelectionScreen();
    });
    return;
  }

  // ── BLOCK RESTRICTED PAGE ──
  if(feature && !allowed.includes(feature)){
    document.addEventListener('DOMContentLoaded', function(){
      var info = FEATURE_INFO[feature] || { need:'pro', icon:'🔒', label: feature };
      showLockedPageOverlay(info);
    });
  }

  // ── SIDEBAR LOCK ICONS ──
  document.addEventListener('DOMContentLoaded', function(){
    var links = document.querySelectorAll('.sidebar a');
    for(var i=0; i<links.length; i++){
      (function(link){
        var href = (link.getAttribute('href') || '').replace('./','');
        var feat = PAGE_MAP[href];
        if(!feat || allowed.includes(feat)) return;
        var info = FEATURE_INFO[feat];
        if(!info) return;

        link.style.opacity = '0.55';
        link.style.cursor  = 'not-allowed';

        var badge = document.createElement('span');
        badge.textContent = info.need === 'enterprise' ? '🏢' : '⭐';
        badge.style.cssText = 'margin-left:auto;font-size:11px;padding:2px 6px;border-radius:8px;font-weight:700;flex-shrink:0;background:#f0f4f8;';
        link.appendChild(badge);

        link.addEventListener('click', function(e){
          e.preventDefault();
          showSidebarModal(info);
        });
      })(links[i]);
    }
  });

  // ══════════════════════════════════════
  // PLAN SELECTION SCREEN
  // ══════════════════════════════════════
  function showPlanSelectionScreen(){
    if(document.getElementById('planSelectOverlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'planSelectOverlay';
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:99999',
      'background:rgba(10,20,40,0.92)',
      'display:flex','align-items:center','justify-content:center',
      'font-family:Segoe UI,sans-serif',
      'backdrop-filter:blur(6px)',
      'overflow-y:auto','padding:20px'
    ].join(';');

    var html = '';
    html += '<div style="background:white;border-radius:20px;padding:36px 32px;max-width:500px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,0.3);">';

    // Header
    html += '<div style="text-align:center;margin-bottom:24px;">';
    html += '<div style="font-size:42px;margin-bottom:8px;">⏰</div>';
    html += '<div style="font-size:20px;font-weight:900;color:#1a2332;margin-bottom:6px;">Trial Khatam Hua!</div>';
    html += '<div style="font-size:13px;color:#546e7a;line-height:1.6;">Apna plan choose karo aur kaam jari rakho</div>';
    html += '</div>';

    // Basic Plan
    html += '<div style="border:2px solid #D5F5E3;border-radius:14px;padding:18px;margin-bottom:12px;background:#F0FFF4;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div>';
    html += '<div style="font-size:15px;font-weight:800;color:#1a3a6b;">🔵 Basic Plan</div>';
    html += '<div style="font-size:13px;color:#1E8449;font-weight:800;margin-top:3px;">FREE — Hamesha</div>';
    html += '<div style="font-size:11px;color:#78909c;margin-top:4px;">Dashboard, Stock, Billing, Purchase</div>';
    html += '</div>';
    html += '<button id="selectBasicBtn" style="background:#1E8449;color:white;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:800;border:none;cursor:pointer;">Select →</button>';
    html += '</div></div>';

    // Pro Plan
    html += '<div style="border:2px solid #E8DAEF;border-radius:14px;padding:18px;margin-bottom:12px;background:#F9F5FF;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div>';
    html += '<div style="font-size:15px;font-weight:800;color:#7D3C98;">⭐ Pro Plan</div>';
    html += '<div style="font-size:13px;font-weight:900;color:#7D3C98;margin-top:3px;">Rs. 1,500/year</div>';
    html += '<div style="font-size:11px;color:#78909c;margin-top:4px;">+ Customers, Reports, Prescriptions</div>';
    html += '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:6px;">';
    html += '<a href="tel:+917620184623" style="display:block;background:#7D3C98;color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:800;text-decoration:none;text-align:center;">📞 Call</a>';
    html += '<a href="https://wa.me/917620184623?text=Hi+I+want+Pro+plan" target="_blank" style="display:block;background:#25D366;color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:800;text-decoration:none;text-align:center;">💬 WhatsApp</a>';
    html += '</div></div></div>';

    // Enterprise Plan
    html += '<div style="border:2px solid #A9DFBF;border-radius:14px;padding:18px;margin-bottom:20px;background:#EAFAF1;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div>';
    html += '<div style="font-size:15px;font-weight:800;color:#1E8449;">🚀 Enterprise Plan</div>';
    html += '<div style="font-size:13px;font-weight:900;color:#1E8449;margin-top:3px;">Rs. 3,000/year</div>';
    html += '<div style="font-size:11px;color:#78909c;margin-top:4px;">Sab features + Branches + Multi-branch</div>';
    html += '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:6px;">';
    html += '<a href="tel:+917620184623" style="display:block;background:#1E8449;color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:800;text-decoration:none;text-align:center;">📞 Call</a>';
    html += '<a href="https://wa.me/917620184623?text=Hi+I+want+Enterprise+plan" target="_blank" style="display:block;background:#25D366;color:white;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:800;text-decoration:none;text-align:center;">💬 WhatsApp</a>';
    html += '</div></div></div>';

    // Footer
    html += '<div style="text-align:center;font-size:11px;color:#90a4ae;">Support: 7620184623 | Mon-Sat 9am-7pm</div>';
    html += '</div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Basic button click — attach after DOM insert
    var basicBtn = document.getElementById('selectBasicBtn');
    if(basicBtn){
      basicBtn.addEventListener('click', function(){
        doSelectBasic();
      });
    }
  }

  // ── SELECT BASIC ──
  function doSelectBasic(){
    var u = JSON.parse(localStorage.getItem('user') || '{}');
    u.plan = 'basic';
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('chosenPlan', 'basic');
    localStorage.setItem('showUpgrade', 'true');
    localStorage.setItem('isTrialExpired', 'false');
    localStorage.removeItem('trialDaysLeft');
    var ov = document.getElementById('planSelectOverlay');
    if(ov){ ov.remove(); }
    document.body.style.overflow = '';
    location.reload();
  }

  // Global access bhi
  window.selectBasicPlan = doSelectBasic;

  // ── LOCKED PAGE OVERLAY ──
  function showLockedPageOverlay(info){
    var overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed','inset:0','z-index:99998',
      'background:rgba(10,20,40,0.88)',
      'display:flex','align-items:center','justify-content:center',
      'font-family:Segoe UI,sans-serif',
      'backdrop-filter:blur(6px)'
    ].join(';');

    var needPlan = info.need || 'pro';
    var html = '';
    html += '<div style="background:white;border-radius:20px;padding:40px 36px;max-width:420px;width:90%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.3);">';
    html += '<div style="font-size:48px;margin-bottom:12px;">🔒</div>';
    html += '<div style="font-size:20px;font-weight:900;color:#1a2332;margin-bottom:8px;">' + info.icon + ' ' + info.label + ' Restricted</div>';
    html += '<div style="font-size:13px;color:#546e7a;line-height:1.7;margin-bottom:20px;">';
    if(needPlan === 'enterprise'){
      html += 'Yeh feature sirf <strong style="color:#1E8449;">Enterprise Plan</strong> mein available hai.';
    } else {
      html += 'Yeh feature <strong style="color:#7D3C98;">Pro</strong> ya <strong style="color:#1E8449;">Enterprise Plan</strong> mein available hai.';
    }
    html += '</div>';
    html += '<a href="tel:+917620184623" style="display:block;background:linear-gradient(135deg,#1a3a6b,#1e6b3a);color:white;padding:13px;border-radius:12px;font-size:15px;font-weight:800;text-decoration:none;margin-bottom:10px;">📞 Upgrade: 7620184623</a>';
    html += '<a href="https://wa.me/917620184623?text=Hi+I+want+to+upgrade+Dawa+Hisaab" target="_blank" style="display:block;background:linear-gradient(135deg,#25D366,#128C7E);color:white;padding:11px;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none;margin-bottom:16px;">💬 WhatsApp Karo</a>';
    html += '<button onclick="history.back()" style="background:#f0f4f8;border:none;color:#546e7a;padding:10px 24px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;">← Wapas Jao</button>';
    html += '</div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  // ── SIDEBAR MODAL ──
  function showSidebarModal(info){
    if(document.getElementById('sidebarLockModal')) return;
    var needPlan = info.need || 'pro';
    var modal = document.createElement('div');
    modal.id = 'sidebarLockModal';
    modal.style.cssText = [
      'position:fixed','inset:0','z-index:99997',
      'background:rgba(10,20,40,0.7)',
      'display:flex','align-items:center','justify-content:center',
      'font-family:Segoe UI,sans-serif'
    ].join(';');

    var html = '';
    html += '<div style="background:white;border-radius:18px;padding:32px 28px;max-width:380px;width:90%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.25);">';
    html += '<div style="font-size:36px;margin-bottom:10px;">🔒</div>';
    html += '<div style="font-size:17px;font-weight:900;color:#1a2332;margin-bottom:6px;">' + info.icon + ' ' + info.label + ' Locked</div>';
    if(needPlan === 'enterprise'){
      html += '<div style="font-size:13px;color:#546e7a;margin-bottom:18px;">Sirf Enterprise Plan mein available hai.</div>';
    } else {
      html += '<div style="font-size:13px;color:#546e7a;margin-bottom:18px;">Pro ya Enterprise Plan lo aur unlock karo.</div>';
    }
    html += '<a href="tel:+917620184623" style="display:block;background:linear-gradient(135deg,#1a3a6b,#1e6b3a);color:white;padding:11px;border-radius:10px;font-size:14px;font-weight:800;text-decoration:none;margin-bottom:8px;">📞 7620184623</a>';
    html += '<a href="https://wa.me/917620184623" target="_blank" style="display:block;background:linear-gradient(135deg,#25D366,#128C7E);color:white;padding:10px;border-radius:10px;font-size:13px;font-weight:800;text-decoration:none;margin-bottom:14px;">💬 WhatsApp</a>';
    html += '<button id="closeSidebarModal" style="background:#f0f4f8;border:none;color:#546e7a;padding:9px 22px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;">Close</button>';
    html += '</div>';

    modal.innerHTML = html;
    document.body.appendChild(modal);

    document.getElementById('closeSidebarModal').addEventListener('click', function(){
      modal.remove();
    });
    modal.addEventListener('click', function(e){
      if(e.target === modal) modal.remove();
    });
  }

})();
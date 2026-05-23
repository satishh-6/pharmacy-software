// ══════════════════════════════════════════════════════════
//  Dawa Hisaab — Central AI Module (Gemini 2.5 Flash Free)
//  public/js/ai.js
// ══════════════════════════════════════════════════════════

const DH_AI = (() => {

  // ── CONFIG ──
const MODEL = 'gemini-2.5-flash';
  const BASE  = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';

  function getKey() {
    return localStorage.getItem('geminiApiKey') || '';
  }

  // ── CORE API CALL ──
  // ── CORE API CALL mein replace karo ──
async function ask(prompt, jsonMode = true, retryCount = 0) {
  const key = getKey();
  if (!key) { showAISetup(); throw new Error('Gemini API Key nahi hai'); }

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {})
    }
  };

  const res = await fetch(`${BASE}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (res.status === 429 && retryCount < 2) {
    // Rate limit — wait and retry
    showNotif('⏳ AI limit reached — 60 sec mein retry ho raha hai...', false);
    await new Promise(r => setTimeout(r, 62000));
    return ask(prompt, jsonMode, retryCount + 1);
  }

  if (!res.ok) {
    const err = await res.json();
    const msg = err?.error?.message || 'AI Error';
    if (msg.includes('quota') || msg.includes('rate')) {
      throw new Error('⏳ AI limit exceed — 1 minute baad try karo');
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!jsonMode) return text;
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch { return { raw: text }; }
}

  // ── SHOW AI SETUP MODAL ──
  function showAISetup() {
    let modal = document.getElementById('aiSetupModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'aiSetupModal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div style="background:white;border-radius:16px;padding:28px;width:440px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <span style="font-size:28px;">🤖</span>
            <div>
              <div style="font-size:18px;font-weight:800;color:#1a2332;">AI Setup</div>
              <div style="font-size:12px;color:#78909c;">Gemini API Key chahiye</div>
            </div>
          </div>
          <div style="background:#f0fdf4;border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:#1e6b3a;line-height:1.7;">
            1. <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#1a3a6b;font-weight:700;">aistudio.google.com</a> pe jao<br>
            2. "Create API Key" click karo<br>
            3. Key neeche paste karo — Free hai!
          </div>
          <input id="aiKeyInput" placeholder="AIzaSy..." 
            style="width:100%;padding:12px;border:2px solid #1a3a6b;border-radius:10px;font-size:14px;outline:none;margin-bottom:12px;" />
          <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('aiSetupModal').remove()"
              style="flex:1;padding:11px;background:#f0f4f8;border:none;border-radius:8px;cursor:pointer;font-weight:700;color:#546e7a;">
              Cancel
            </button>
            <button onclick="DH_AI.saveKey()"
              style="flex:2;padding:11px;background:linear-gradient(135deg,#1a3a6b,#1e6b3a);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700;">
              ✅ Save & Activate AI
            </button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    modal.style.display = 'flex';
    setTimeout(() => document.getElementById('aiKeyInput')?.focus(), 200);
  }

  function saveKey() {
    const key = document.getElementById('aiKeyInput')?.value?.trim();
    if (!key) { alert('Key enter karo!'); return; }
    localStorage.setItem('geminiApiKey', key);
    document.getElementById('aiSetupModal')?.remove();
    showNotif('🤖 AI Activated! Gemini ready hai.', true);
  }

  // ── NOTIFICATION ──
  function showNotif(msg, ok = true) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:74px;right:20px;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;color:white;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.22);background:${ok ? '#1E8449' : '#C0392B'};max-width:320px;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
  }

  // ── AI LOADING INDICATOR ──
  function showLoader(text = '🤖 AI soch raha hai...') {
    let loader = document.getElementById('aiLoader');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'aiLoader';
      loader.style.cssText = 'position:fixed;top:74px;right:20px;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:700;color:white;z-index:9998;box-shadow:0 4px 16px rgba(0,0,0,0.22);background:#7D3C98;max-width:320px;display:flex;align-items:center;gap:8px;';
      document.body.appendChild(loader);
    }
    loader.innerHTML = `<span style="animation:spin 1s linear infinite;display:inline-block;">⟳</span> ${text}`;
    loader.style.display = 'flex';
  }

  function hideLoader() {
    const loader = document.getElementById('aiLoader');
    if (loader) loader.style.display = 'none';
  }

  // ════════════════════════════════════
  //  1. DRUG INTERACTION CHECK
  // ════════════════════════════════════
  async function checkDrugInteraction(medicines) {
    if (medicines.length < 2) return null;
    showLoader('🔬 Drug interactions check ho rahi hain...');
    try {
      const medList = medicines.map(m => m.name + (m.generic ? ` (${m.generic})` : '')).join(', ');
      const result = await ask(`
You are a clinical pharmacist. Check drug interactions for these medicines being dispensed together:
${medList}

Respond in JSON format:
{
  "hasInteraction": true/false,
  "severity": "none" | "mild" | "moderate" | "severe",
  "interactions": [
    {
      "drug1": "medicine name",
      "drug2": "medicine name", 
      "effect": "what happens",
      "severity": "mild/moderate/severe",
      "advice": "pharmacist advice in Hindi/English"
    }
  ],
  "overallAdvice": "overall recommendation"
}
If no interactions found, return hasInteraction: false with empty interactions array.
Be concise. Focus on clinically significant interactions only.`);
      return result;
    } finally {
      hideLoader();
    }
  }

  // ════════════════════════════════════
  //  2. MEDICINE AUTO INFO FILL
  // ════════════════════════════════════
  async function getMedicineInfo(medicineName) {
    showLoader('📋 Medicine info fetch ho rahi hai...');
    try {
      return await ask(`
You are a pharmacy database. Provide information about: "${medicineName}"

Return JSON:
{
  "generic": "generic/salt name",
  "composition": ["Drug1 Xmg", "Drug2 Ymg"],
  "category": "medicine",
  "hsnCode": "8-digit HSN code for India",
  "gstPercent": 5 or 12 or 18,
  "uses": "primary uses in 1 line",
  "sideEffects": "common side effects in 1 line",
  "storageTemp": "storage instructions",
  "schedule": "OTC / Schedule H / Schedule H1 / Schedule X",
  "suggestedMrp": null
}
If not a medicine, return category as "fmcg" or "other" with available fields only.`);
    } finally {
      hideLoader();
    }
  }

  // ════════════════════════════════════
  //  3. SMART SUBSTITUTE FINDER
  // ════════════════════════════════════
  async function findSubstitute(medicine, stockList) {
    showLoader('🔄 AI substitutes dhundh raha hai...');
    try {
      const stockNames = stockList
        .filter(p => p.category === 'medicine')
        .map(p => `${p.name} (${(p.composition || []).join('+') || p.generic || 'unknown'}) — stock:${p.stock || 0}`)
        .join('\n');

      return await ask(`
Patient needs: "${medicine.name}" (${medicine.generic || medicine.composition?.join('+') || 'unknown composition'})
It is OUT OF STOCK.

Available medicines in pharmacy stock:
${stockNames || 'No medicines in stock'}

Find best substitutes from available stock. Consider:
1. Same salt/composition = best substitute
2. Same therapeutic class = acceptable substitute
3. Only suggest if stock > 0

Return JSON:
{
  "substitutes": [
    {
      "name": "medicine name exactly as in stock list",
      "matchType": "exact" | "therapeutic",
      "reason": "why it is a substitute",
      "confidence": 0-100,
      "caution": "any precaution if different dose/salt"
    }
  ],
  "pharmacistNote": "advice for pharmacist"
}`);
    } finally {
      hideLoader();
    }
  }

  // ════════════════════════════════════
  //  4. SMART MONTHLY REPORT
  // ════════════════════════════════════
  async function generateMonthlyReport(salesData, stockData, purchaseData) {
    showLoader('📊 AI report generate ho rahi hai...');
    try {
      const summary = {
        totalSales: salesData.length,
        totalRevenue: salesData.reduce((a, s) => a + (s.totalAmount || 0), 0),
        topMedicines: {},
        paymentModes: {}
      };
      salesData.forEach(sale => {
        (sale.items || []).forEach(item => {
          summary.topMedicines[item.productName] = (summary.topMedicines[item.productName] || 0) + item.qty;
        });
        summary.paymentModes[sale.paymentMode] = (summary.paymentModes[sale.paymentMode] || 0) + 1;
      });

      return await ask(`
You are a pharmacy business analyst. Analyze this pharmacy data and provide insights:

Sales Summary:
- Total Bills: ${summary.totalSales}
- Total Revenue: ₹${summary.totalRevenue.toFixed(0)}
- Top selling items: ${JSON.stringify(Object.entries(summary.topMedicines).sort((a,b)=>b[1]-a[1]).slice(0,5))}
- Payment modes: ${JSON.stringify(summary.paymentModes)}
- Low stock items: ${stockData.filter(p=>(p.stock||0)<=(p.minStock||10)).length}
- Out of stock: ${stockData.filter(p=>(p.stock||0)===0).length}

Provide actionable insights in JSON:
{
  "headline": "one line month summary",
  "insights": [
    {"icon": "emoji", "title": "insight title", "detail": "explanation", "action": "what to do"}
  ],
  "topSellers": ["medicine1", "medicine2", "medicine3"],
  "slowMovers": ["medicine1", "medicine2"],
  "reorderAlert": ["medicines to reorder urgently"],
  "revenueInsight": "revenue analysis",
  "recommendation": "top 1 business recommendation"
}
Keep insights practical for Indian pharmacy owner. Max 5 insights. In simple language.`, true);
    } finally {
      hideLoader();
    }
  }

  // ════════════════════════════════════
  //  5. SMART REORDER SUGGESTION
  // ════════════════════════════════════
  async function getReorderSuggestions(stockData, recentSales) {
    showLoader('📦 AI reorder analyze kar raha hai...');
    try {
      const lowItems = stockData
        .filter(p => (p.stock || 0) <= (p.minStock || 10))
        .map(p => ({ name: p.name, stock: p.stock || 0, min: p.minStock || 10, category: p.category }));

      const salesFreq = {};
      recentSales.forEach(sale => {
        (sale.items || []).forEach(item => {
          salesFreq[item.productName] = (salesFreq[item.productName] || 0) + item.qty;
        });
      });

      return await ask(`
Pharmacy inventory analysis for reorder:

Low/Out of Stock Items:
${JSON.stringify(lowItems.slice(0, 20))}

Sales frequency (last month):
${JSON.stringify(Object.entries(salesFreq).sort((a,b)=>b[1]-a[1]).slice(0, 15))}

Return reorder recommendations JSON:
{
  "urgent": [
    {"name": "medicine", "reason": "why urgent", "suggestedQty": number, "estimatedDaysLeft": number}
  ],
  "recommended": [
    {"name": "medicine", "reason": "why recommended", "suggestedQty": number}
  ],
  "totalEstimatedCost": "approximate range",
  "priorityNote": "overall advice"
}`);
    } finally {
      hideLoader();
    }
  }

  // ════════════════════════════════════
  //  6. PRESCRIPTION READER (VISION)
  // ════════════════════════════════════
async function readPrescription(imageBase64, mimeType = 'image/jpeg') {
  const key = getKey();
  if (!key) { showAISetup(); throw new Error('API Key nahi hai'); }
  showLoader('📋 Prescription pad raha hai...');
  const VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  try {
    const body = {
      contents: [{
        parts: [
          {
            text: `This is a doctor's prescription. Read ALL medicine names written on it.
List EVERY single medicine name you can see, one per line.
Write ONLY the medicine names - nothing else.
No numbers, no doses, no dashes, no explanations.
Start directly with medicine names.

If you see 4 medicines, write 4 lines.
If you see 6 medicines, write 6 lines.
Read carefully and list ALL of them.`
          },
          { inlineData: { mimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: { temperature: 0.0, maxOutputTokens: 1000 }
    };

    const res = await fetch(`${VISION_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'API Error: ' + res.status);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('AI Raw Response:', text);

    if (!text.trim()) throw new Error('AI se response nahi aaya');

    // Simple: har line = ek medicine
    const medicines = text
      .split('\n')
      .map(l => l
        .replace(/^[-•*\d.\s]+/, '')  // Remove bullets/numbers
        .replace(/\|.*$/, '')          // Remove anything after |
        .replace(/\b(tab|tablet|cap|syrup|inj|drop|gel|cream)\b/gi, '')  // Remove common prefixes
        .trim()
      )
      .filter(l => l.length > 2 && l.length < 80 && !l.toLowerCase().includes('medicine') && !l.toLowerCase().includes('prescription') && !l.toLowerCase().includes('here'))
      .map(name => ({ name, dosage: '', frequency: '', duration: '', qty: 1 }));

    console.log('Detected medicines:', medicines);

    if (!medicines.length) throw new Error('Koi medicine detect nahi hui — clearer photo try karo');

    return { patientName: null, doctorName: null, medicines, instructions: '' };

  } finally {
    hideLoader();
  }
}
  // ════════════════════════════════════
  //  7. CUSTOMER CREDIT ANALYSIS
  // ════════════════════════════════════
  async function analyzeCreditRisk(customer, billHistory) {
    showLoader('💳 Credit analysis ho rahi hai...');
    try {
      const totalDue = billHistory.reduce((a, b) => a + Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0)), 0);
      const creditBills = billHistory.filter(b => b.paymentMode === 'credit').length;
      return await ask(`
Analyze credit risk for pharmacy customer:
- Name: ${customer.name}
- Total Bills: ${billHistory.length}
- Credit Bills: ${creditBills}
- Total Amount Due: ₹${totalDue.toFixed(0)}
- Oldest Due: ${billHistory.find(b => (b.totalAmount - b.paidAmount) > 0)?.date || 'N/A'}

Return JSON:
{
  "riskLevel": "low" | "medium" | "high",
  "recommendation": "allow_credit" | "collect_first" | "cash_only",
  "message": "message to show pharmacist in Hindi/English",
  "dueAmount": ${totalDue.toFixed(0)},
  "advice": "one line advice"
}`);
    } finally {
      hideLoader();
    }
  }

  // ════════════════════════════════════
  //  8. EXPIRY RISK ANALYSIS
  // ════════════════════════════════════
  async function analyzeExpiryRisk(expiringItems) {
    showLoader('⏰ Expiry analysis ho rahi hai...');
    try {
      return await ask(`
These medicines are expiring soon in a pharmacy:
${expiringItems.map(p => `${p.name}: ${p.stock} units, expires ${p.expiry}, cost ₹${(p.purchasePrice || 0) * (p.stock || 0)}`).join('\n')}

Return JSON:
{
  "totalAtRisk": calculated_value,
  "actions": [
    {
      "medicine": "name",
      "action": "what to do",
      "reason": "why",
      "priority": "urgent/normal"
    }
  ],
  "discountStrategy": "suggest discount strategy to sell before expiry",
  "returnPossible": "which medicines might be returnable to supplier",
  "totalLossIfExpired": estimated_total
}`);
    } finally {
      hideLoader();
    }
  }

  // ── CSS ANIMATION ──
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .ai-badge { background:linear-gradient(135deg,#7D3C98,#1a3a6b); color:white; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; display:inline-flex; align-items:center; gap:4px; }
  .ai-btn { background:linear-gradient(135deg,#7D3C98,#5B2C6F); color:white; border:none; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:6px; transition:all 0.2s; }
  .ai-btn:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(125,60,152,0.4); }
  .ai-result { background:#f9f0ff; border:1px solid #E8D5F5; border-radius:10px; padding:14px; margin-top:10px; }
  .ai-warn { background:#fff8e1; border:1px solid #FFD54F; border-radius:10px; padding:12px; }
  .ai-danger { background:#FDEDEC; border:1px solid #F1948A; border-radius:10px; padding:12px; }
  .ai-safe { background:#EAFAF1; border:1px solid #A9DFBF; border-radius:10px; padding:12px; }`;
  document.head.appendChild(style);

  // ── PUBLIC API ──
  return {
    ask,
    saveKey,
    showSetup: showAISetup,
    getKey,
    showNotif,
    showLoader,
    hideLoader,
    checkDrugInteraction,
    getMedicineInfo,
    findSubstitute,
    generateMonthlyReport,
    getReorderSuggestions,
    readPrescription,
    analyzeCreditRisk,
    analyzeExpiryRisk,
    isReady: () => !!getKey()
  };
})();
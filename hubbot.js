(function(){
  if (window.__HubBotLoaded) return; window.__HubBotLoaded = true;

  // Config from script tag attributes (optional)
  const currentScript = document.currentScript || (function(){
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  const dataSrc = currentScript && currentScript.getAttribute('data-links');
  const faqSrc = currentScript && currentScript.getAttribute('data-faqs');
  const placement = (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';
  const brandTitle = (currentScript && currentScript.getAttribute('data-title')) || 'Company Hub Chat';

  // Shadow root container
  const host = document.createElement('div');
  host.setAttribute('id', 'hubbot-root');
  host.style.all = 'initial';
  host.style.position = 'fixed';
  const pos = placement.split('-');
  host.style[pos[0]] = '20px';
  host.style[pos[1]] = '20px';
  host.style.zIndex = '2147483647';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; }
    .button { all: unset; }
    .widget { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color: #e2e8f0; }
    .badge { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(180deg,#7c3aed,#6d28d9); display: grid; place-items: center; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
    .panel { width: 340px; max-height: 520px; border-radius: 16px; background:#0f172a; border:1px solid #1f2937; display:none; overflow:hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
    .header { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid #1f2937; background: rgba(15,23,42,0.8); position: sticky; top:0; }
    .title { font-size: 14px; font-weight: 600; }
    .chat { padding: 10px; overflow:auto; height: 360px; }
    .composer { display:grid; grid-template-columns: 1fr auto; gap:8px; padding:10px; border-top:1px solid #1f2937; }
    .input { all: unset; background:#0b1220; border:1px solid #1f2937; padding:10px 12px; border-radius:12px; font-size: 13px; }
    .send { all: unset; background: linear-gradient(180deg,#7c3aed,#6d28d9); color: white; padding: 0 12px; border-radius:12px; font-weight:600; cursor:pointer; }
    .message { display:grid; grid-template-columns: 28px 1fr; gap:8px; padding:6px; }
    .avatar { width:28px; height:28px; border-radius:50%; background:#1e293b; display:grid; place-items:center; font-size:12px; }
    .meta { color:#94a3b8; font-size:11px; margin-top:4px; }
    .content a { color:#22c55e; text-decoration:none; }
    .content a:hover { text-decoration: underline; }
    .suggestions { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
    .suggestion { all: unset; border:1px solid #1f2937; background:#0f172a; color:#e2e8f0; padding:6px 10px; border-radius:999px; font-size:11px; cursor:pointer; }
  `;
  const container = document.createElement('div');
  container.className = 'widget';
  container.innerHTML = `
    <div class="badge" id="hubbot-toggle" title="Open Hub Chat">💬</div>
    <div class="panel" id="hubbot-panel" role="dialog" aria-label="${brandTitle}">
      <div class="header"><div class="title">${brandTitle}</div></div>
      <div class="chat" id="hubbot-messages" aria-live="polite"></div>
      <form class="composer" id="hubbot-form" autocomplete="off">
        <input class="input" id="hubbot-input" placeholder="Ask for links… e.g., PTO policy" />
        <button class="send" type="submit">Send</button>
      </form>
    </div>
  `;
  shadow.appendChild(style);
  shadow.appendChild(container);

  const badge = shadow.getElementById('hubbot-toggle');
  const panel = shadow.getElementById('hubbot-panel');
  const messages = shadow.getElementById('hubbot-messages');
  const form = shadow.getElementById('hubbot-form');
  const input = shadow.getElementById('hubbot-input');

  function setOpen(isOpen){ panel.style.display = isOpen ? 'grid' : 'none'; }
  let open = false;
  badge.addEventListener('click', function(){ open = !open; setOpen(open); if (open && messages.children.length === 0) welcome(); });

  function now(){ const d=new Date(); return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); }
  function escapeHtml(text){ const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }; return (text||'').toString().replace(/[&<>"']/g, m=>map[m]); }
  function renderMessage(role, html){ const el = document.createElement('div'); el.className='message'; el.innerHTML = `<div class="avatar">${role==='user'?'👤':'🤖'}</div><div class="content"><div>${html}</div><div class="meta">${role==='user'?'You':'HubBot'} • ${now()}</div></div>`; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; }

  function formatResults(results){
    if (!results.length) return `I couldn't find anything for that. Try asking “VPN setup”, “PTO policy”, or use keywords.`;
    const items = results.map(r=> `<div>• <a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>${r.description?` — ${escapeHtml(r.description)}`:''}</div>`).join('');
    return `Here are some matches:<div>${items}</div>`;
  }

  function formatAnswerWithResources(faq, links){
    const answer = faq ? `<div><strong>Answer:</strong> ${escapeHtml(faq.answer)}</div>` : '';
    const res = (links && links.length) ? `<div style="margin-top:6px"><strong>Resources:</strong>${links.map(r=>` <div>• <a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>${r.description?` — ${escapeHtml(r.description)}`:''}</div>`).join('')}</div>` : '';
    return answer + res;
  }

  function welcome(){
    const examples = ['PTO policy','Benefits portal','IT helpdesk','VPN setup','Engineering handbook'];
    const chips = examples.map(e=>`<button class="suggestion" data-q="${escapeHtml(e)}" type="button">${escapeHtml(e)}</button>`).join('');
    renderMessage('assistant', `Hi! I can fetch internal links by keyword. Try:<div class="suggestions">${chips}</div>`);
  }

  function attachSuggest(){
    messages.addEventListener('click', function(e){ const el = e.target.closest('.suggestion'); if (!el) return; input.value = el.getAttribute('data-q')||''; form.requestSubmit(); });
  }

  attachSuggest();

  // Data handling: either from global window.HUB_LINKS or external file
  function ensureData(then){
    let linksReady = false, faqsReady = false;
    function maybe(){ if (linksReady && faqsReady) then({ links: window.HUB_LINKS || [], faqs: window.HUB_FAQS || [] }); }
    // links
    if (Array.isArray(window.HUB_LINKS)) { linksReady = true; } else if (dataSrc) {
      const s = document.createElement('script'); s.src = dataSrc; s.onload = function(){ linksReady = true; maybe(); }; s.onerror = function(){ linksReady = true; maybe(); }; document.head.appendChild(s);
    } else { linksReady = true; }
    // faqs
    if (Array.isArray(window.HUB_FAQS)) { faqsReady = true; } else if (faqSrc) {
      const f = document.createElement('script'); f.src = faqSrc; f.onload = function(){ faqsReady = true; maybe(); }; f.onerror = function(){ faqsReady = true; maybe(); }; document.head.appendChild(f);
    } else { faqsReady = true; }
    maybe();
  }

  function searchLinks(links, query){
    const q = (query||'').toLowerCase().trim(); if (!q) return [];
    const terms = q.split(/\s+|,|\./).filter(Boolean);
    return links.map(item=>{
      const haystack = [item.title, item.description, ...(item.tags||[])].join(' ').toLowerCase();
      let score = 0;
      for (const t of terms){ if (haystack.includes(t)) score += 2; if ((item.title||'').toLowerCase().includes(t)) score += 3; }
      for (const t of terms){ const rx = new RegExp('\\b'+t.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')); if (rx.test(haystack)) score += 1; }
      return {item, score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>x.item);
  }

  function searchFaqs(faqs, query){
    const q = (query||'').toLowerCase().trim(); if (!q) return [];
    const terms = q.split(/\s+|,|\./).filter(Boolean);
    return faqs.map(item=>{
      const haystack = [item.question, item.answer, ...(item.tags||[])].join(' ').toLowerCase();
      let score = 0;
      for (const t of terms){ if (haystack.includes(t)) score += 2; if ((item.question||'').toLowerCase().includes(t)) score += 3; }
      for (const t of terms){ const rx = new RegExp('\\b'+t.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')); if (rx.test(haystack)) score += 1; }
      return {item, score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.item);
  }

  let LINKS_CACHE = [];
  let FAQS_CACHE = [];
  ensureData(function(data){ LINKS_CACHE = data.links || []; FAQS_CACHE = data.faqs || []; });

  form.addEventListener('submit', function(e){
    e.preventDefault(); const q = input.value.trim(); if (!q) return;
    renderMessage('user', escapeHtml(q)); input.value='';
    const faqMatches = searchFaqs(FAQS_CACHE||[], q);
    if (faqMatches.length){
      const top = faqMatches[0];
      const tagSet = new Set([...(top.tags||[])]);
      const explicit = new Set([...(top.relatedLinks||[])]);
      const related = (LINKS_CACHE||[]).filter(l => (l.tags||[]).some(t=>tagSet.has(t)) || explicit.has(l.url)).slice(0,5);
      renderMessage('assistant', formatAnswerWithResources(top, related));
    } else {
      const results = searchLinks(LINKS_CACHE||[], q);
      renderMessage('assistant', formatResults(results));
    }
  });
})();



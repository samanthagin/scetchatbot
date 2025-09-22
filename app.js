(function () {
  const messages = document.getElementById('messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('user-input');
  const quickHelp = document.getElementById('quick-help');

  function now() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderMessage({ role, html }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'message';
    wrapper.innerHTML = `
      <div class="avatar">${role === 'user' ? '👤' : '🤖'}</div>
      <div class="content">
        <div>${html}</div>
        <div class="meta">${role === 'user' ? 'You' : 'HubBot'} • ${now()}</div>
      </div>
    `;
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  function searchLinks(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Tokenize and score by term matches across title, tags, description.
    const terms = q.split(/\s+|,|\./).filter(Boolean);
    return (window.HUB_LINKS || [])
      .map(item => {
        const haystack = [
          item.title,
          item.description,
          ...(item.tags || [])
        ].join(' ').toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (haystack.includes(t)) score += 2;
          if (item.title.toLowerCase().includes(t)) score += 3; // title boost
        }
        // fuzzy: prefix match
        for (const t of terms) {
          const rx = new RegExp('\\b' + t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
          if (rx.test(haystack)) score += 1;
        }
        return { item, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.item);
  }

  function searchFaqs(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+|,|\./).filter(Boolean);
    return (window.HUB_FAQS || [])
      .map(item => {
        const haystack = [item.question, item.answer, ...(item.tags || [])].join(' ').toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (haystack.includes(t)) score += 2;
          if ((item.question || '').toLowerCase().includes(t)) score += 3;
        }
        for (const t of terms) {
          const rx = new RegExp('\\b' + t.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
          if (rx.test(haystack)) score += 1;
        }
        return { item, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.item);
  }

  function formatAnswerWithResources(faq, links) {
    const answer = faq ? `<div><strong>Answer:</strong> ${escapeHtml(faq.answer)}</div>` : '';
    const res = (links && links.length)
      ? `<div style="margin-top:6px"><strong>Resources:</strong>${links.map(r => ` <div>• <a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>${r.description ? ` — ${escapeHtml(r.description)}` : ''}</div>`).join('')}</div>`
      : '';
    return answer + res;
  }

  function formatResults(results) {
    if (!results.length) {
      return `I couldn't find anything for that. Try categories via the button below or ask like “VPN setup” or “PTO policy”.`;
    }
    const items = results.map(r => {
      const desc = r.description ? ` — ${escapeHtml(r.description)}` : '';
      return `<div>• <a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.title)}</a>${desc}</div>`;
    }).join('');
    return `Here are some matches:<div class="results">${items}</div>`;
  }

  function showWelcome() {
    const examples = [
      'PTO policy',
      'Benefits portal',
      'Engineering handbook',
      'IT helpdesk',
      'VPN setup'
    ];
    const chips = examples.map(e => `<button class="suggestion" data-q="${escapeHtml(e)}" type="button">${escapeHtml(e)}</button>`).join('');
    renderMessage({ role: 'assistant', html: `Hi! I can fetch internal links by keyword. Try one of these:<div class="suggestions">${chips}</div>` });
  }

  function showCategories() {
    const categories = new Map();
    (window.HUB_LINKS || []).forEach(link => {
      (link.tags || []).forEach(tag => {
        const list = categories.get(tag) || [];
        list.push(link);
        categories.set(tag, list);
      });
    });
    const popular = Array.from(categories.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .map(([tag]) => tag);
    const chips = popular.map(t => `<button class="suggestion" data-q="${escapeHtml(t)}" type="button">${escapeHtml(t)}</button>`).join('');
    renderMessage({ role: 'assistant', html: `Top categories:<div class="suggestions">${chips}</div>` });
  }

  function handleSuggestClick(e) {
    const el = e.target.closest('.suggestion');
    if (!el) return;
    input.value = el.getAttribute('data-q') || '';
    form.requestSubmit();
  }

  messages.addEventListener('click', handleSuggestClick);
  quickHelp.addEventListener('click', showCategories);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    renderMessage({ role: 'user', html: escapeHtml(q) });
    input.value = '';
    const faqMatches = searchFaqs(q);
    if (faqMatches.length) {
      const top = faqMatches[0];
      // gather related links by tags + explicit relatedLinks
      const tagSet = new Set([...(top.tags || [])]);
      const explicitUrls = new Set([...(top.relatedLinks || [])]);
      const related = (window.HUB_LINKS || []).filter(l =>
        (l.tags || []).some(t => tagSet.has(t)) || explicitUrls.has(l.url)
      ).slice(0, 5);
      renderMessage({ role: 'assistant', html: formatAnswerWithResources(top, related) });
    } else {
      const results = searchLinks(q);
      renderMessage({ role: 'assistant', html: formatResults(results) });
    }
  });

  // Initial state
  if (messages && messages.children.length === 0) {
    showWelcome();
  }
})();



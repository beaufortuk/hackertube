'use strict';
const PAGE = 60, RELATED_SHOWN = 8;
const $ = id => document.getElementById(id);
const view = $('view'), search = $('search');
let D, byVid, filters = { q: '', area: '', cat: '', news: false }, observer;

// Builds a DOM node; all data goes through text nodes and properties, never innerHTML.
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs || {})) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), val);
    else if (val != null) el[k] = val;
  }
  el.append(...kids.flat().filter(k => k != null));
  return el;
}
const external = (href, ...kids) => h('a', { href, target: '_blank', rel: 'noopener' }, ...kids);
const num = n => n.toLocaleString('en-US');

/* Saved lists. A 'storage' listener keeps tabs in sync so one tab can't overwrite another's marks. */
function loadList(key) {
  try { const a = JSON.parse(localStorage.getItem(key)); return Array.isArray(a) ? a : []; } catch { return []; }
}
const lists = { later: 'hackertube.later', watched: 'hackertube.watched' };
const saved = {};
function syncLists() { for (const n in lists) saved[n] = new Set(loadList(lists[n])); updateNav(); }
function toggle(name, vid) {
  const set = saved[name];
  if (!set.delete(vid)) set.add(vid);
  try { localStorage.setItem(lists[name], JSON.stringify([...set])); } catch { /* storage full or blocked */ }
  updateNav();
  document.querySelectorAll(`[data-vid="${vid}"]`).forEach(paint);
  if (route().page === name) render();
}
function updateNav() {
  $('nav-later').textContent = `Watch later (${saved.later.size})`;
  $('nav-watched').textContent = `Watched (${saved.watched.size})`;
}
function paint(el) {
  const vid = el.dataset.vid;
  el.classList.toggle('seen', el.classList.contains('card') && saved.watched.has(vid));
  el.querySelectorAll('[data-list]').forEach(b => {
    const on = saved[b.dataset.list].has(vid);
    b.classList.toggle('on', on);
    b.textContent = b.dataset.list === 'later' ? (on ? '✓ Watch later' : '+ Watch later') : (on ? '✓ Watched' : 'Mark watched');
  });
}
function actionButtons(vid) {
  return ['later', 'watched'].map(name => {
    const b = h('button', { onclick: () => toggle(name, vid) });
    b.dataset.list = name;
    return b;
  });
}

/* Routing: #/ with filters in the query, #/v/<vid>, #/later, #/watched. */
function route() {
  const [path, query] = location.hash.slice(1).split('?');
  const parts = (path || '/').split('/').filter(Boolean);
  if (parts[0] === 'v') return { page: 'video', vid: parts[1] };
  if (parts[0] === 'later' || parts[0] === 'watched') return { page: parts[0] };
  const q = new URLSearchParams(query);
  return { page: 'home', filters: { q: q.get('q') || '', area: q.get('area') || '', cat: q.get('cat') || '', news: q.get('news') === '1' } };
}
function homeHash(f) {
  const q = new URLSearchParams();
  if (f.q) q.set('q', f.q);
  if (f.cat) q.set('cat', f.cat);
  else if (f.area) q.set('area', f.area);
  if (f.news) q.set('news', '1');
  const s = q.toString();
  return '#/' + (s ? '?' + s : '');
}

/* Filtering */
const haystack = v => v._s || (v._s = `${v.t} ${v.c} ${v.s}`.toLowerCase());
function matcher(f, { useArea = true, useCat = true } = {}) {
  const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const cat = useCat && f.cat ? D.cats.findIndex(c => c.id === f.cat) : -1;
  const area = useArea && activeArea(f);
  return v => (f.news || !v.n)
    && (cat < 0 || v.k.includes(cat))
    && (!area || v.k.some(k => D.areas[D.cats[k].a].id === area))
    && terms.every(t => haystack(v).includes(t));
}
function activeArea(f) {
  const c = D.cats.find(c => c.id === f.cat);
  return c ? D.areas[c.a].id : f.area;
}

/* Components */
function card(v) {
  const el = h('div', { className: 'card' },
    thumb(v),
    h('a', { href: `#/v/${v.v}` }, h('h3', {}, v.t)),
    h('div', { className: 'meta' }, v.c),
    h('div', { className: 'meta' }, `${v.ct} · ${v.rc ? `${v.rc} HN recommender${v.rc > 1 ? 's' : ''}` : 'cited, not recommended'}`),
    h('div', { className: 'actions' }, actionButtons(v.v)));
  el.dataset.vid = v.v;
  paint(el);
  return el;
}
function thumb(v) {
  return h('a', { className: 'thumb', href: `#/v/${v.v}` },
    h('img', { src: `https://i.ytimg.com/vi/${v.v}/hqdefault.jpg`, alt: '', loading: 'lazy', onerror: e => e.target.remove() }),
    h('span', { className: 'badge', title: 'HackerTube score' }, `★ ${v.sc}`));
}
function chip(label, count, href, on) {
  return h('a', { className: 'chip' + (on ? ' on' : ''), href }, label, count == null ? null : h('small', {}, num(count)));
}
function grid(items, shownFrom) {
  const g = h('div', { className: 'grid' });
  let shown = 0;
  const sentinel = h('div');
  const more = n => {
    g.append(...items.slice(shown, shown + n).map(card));
    shown = Math.min(items.length, shown + n);
    gridState.shown = shown;
    if (shown >= items.length) observer && observer.disconnect();
  };
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    observer.unobserve(sentinel);
    more(PAGE);
    if (shown < items.length) observer.observe(sentinel); // re-observing re-fires if it's still in view
  }, { rootMargin: '800px' });
  more(Math.max(PAGE, shownFrom || 0));
  if (shown < items.length) observer.observe(sentinel);
  return [g, sentinel];
}

/* Views */
function renderHome(f, memo) {
  const base = D.videos.filter(matcher(f, { useArea: false, useCat: false }));
  const area = activeArea(f);
  const areaIdx = D.areas.findIndex(a => a.id === area);
  const areaCounts = new Map(), catCounts = new Map();
  for (const v of base) {
    new Set(v.k.map(k => D.cats[k].a)).forEach(a => areaCounts.set(a, (areaCounts.get(a) || 0) + 1));
    v.k.forEach(k => catCounts.set(k, (catCounts.get(k) || 0) + 1));
  }
  const items = D.videos.filter(matcher(f));
  const newsTotal = D.videos.filter(matcher({ ...f, news: true })).filter(v => v.n).length;
  const areaChips = [chip('All', base.length, homeHash({ ...f, area: '', cat: '' }), !area),
    ...D.areas.map((a, i) => (areaCounts.get(i) || i === areaIdx)
      ? chip(a.name, areaCounts.get(i) || 0, homeHash({ ...f, area: a.id, cat: '' }), i === areaIdx) : null)];
  const catChips = areaIdx < 0 ? [] : D.cats.map((c, i) => (c.a === areaIdx && (catCounts.get(i) || c.id === f.cat))
    ? chip(c.name, catCounts.get(i) || 0, homeHash(c.id === f.cat ? { ...f, area, cat: '' } : { ...f, cat: c.id }), c.id === f.cat) : null);
  const news = h('label', {}, h('input', { type: 'checkbox', checked: f.news,
    onchange: e => { location.hash = homeHash({ ...f, news: e.target.checked }); } }), ` Show news (${num(newsTotal)})`);
  view.replaceChildren(
    h('div', { className: 'chips' }, areaChips),
    catChips.length ? h('div', { className: 'chips' }, catChips) : '',
    h('div', { className: 'bar' }, h('span', {}, `${num(items.length)} videos, best first`), news),
    ...(items.length ? grid(items, memo && memo.shown) : [h('p', { className: 'note' }, 'Nothing matches those filters.')]));
}
function renderList(name) {
  const set = saved[name];
  const items = [...set].reverse().map(vid => byVid.get(vid)).filter(Boolean);
  view.replaceChildren(
    h('div', { className: 'bar' }, h('span', {}, `${name === 'later' ? 'Watch later' : 'Watched'}: ${num(items.length)} videos`)),
    ...(items.length ? grid(items, items.length) : [h('p', { className: 'note' },
      name === 'later' ? 'Nothing saved yet. Use “+ Watch later” on any video.' : 'Nothing marked as watched yet.')]));
}
function renderVideo(vid) {
  const v = byVid.get(vid);
  if (!v) return view.replaceChildren(h('p', { className: 'note' }, 'Video not found. ', h('a', { href: '#/' }, 'Back to all videos')));
  const showNews = filters.news;
  const related = v.r.map(i => D.videos[i]).filter(r => showNews || !r.n || v.n).slice(0, RELATED_SHOWN);
  const actions = h('div', { className: 'actions' }, actionButtons(v.v),
    external(`https://www.youtube.com/watch?v=${v.v}`, 'Open on YouTube ↗'));
  actions.dataset.vid = v.v;
  paint(actions);
  const years = v.y[0] === v.y[1] ? v.y[0] : `${v.y[0]}–${v.y[1]}`;
  document.title = `${v.t} — HackerTube`;
  view.replaceChildren(h('div', { className: 'page' },
    h('div', {},
      h('iframe', { className: 'player', title: v.t, src: `https://www.youtube-nocookie.com/embed/${v.v}`, allowFullscreen: true,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        referrerPolicy: 'strict-origin-when-cross-origin' }),
      h('h1', {}, v.t),
      h('div', { className: 'meta' }, `${v.c} · ${v.ct} · ★ ${v.sc} · ${v.rc} HN recommender${v.rc === 1 ? '' : 's'} · mentioned ${years}`),
      actions,
      h('div', { className: 'chips' }, v.k.map(k => chip(D.cats[k].name, null, homeHash({ q: '', cat: D.cats[k].id, news: filters.news })))),
      h('div', { className: 'box' }, h('p', {}, v.s), h('p', {}, h('b', {}, 'Why HN: '), v.w)),
      h('h2', {}, 'Top HN recommendations'),
      v.m.length ? v.m.map(comment) : h('p', { className: 'note' }, 'Nobody on HN outright recommended this one; it was only cited in passing.')),
    h('aside', {},
      h('h2', {}, 'Related'),
      related.map(mini))));
}
function comment(m) {
  return h('div', { className: 'comment' },
    h('div', { className: 'meta' },
      m.s ? h('span', { className: 'strong' }, 'Strong rec · ') : null,
      external(`https://news.ycombinator.com/user?id=${encodeURIComponent(m.a)}`, m.a), ` · ${m.d}`,
      m.st ? ` · in “${m.st}”` : null),
    h('div', { className: 'text' }, m.x.replace(/\[VIDEO\]/g, '[this video]').replace(/\[LINK\]/g, '[link]')),
    external(`https://news.ycombinator.com/item?id=${m.id}`, 'Read on Hacker News ↗'));
}
function mini(v) {
  const el = h('div', { className: 'mini card' }, thumb(v),
    h('div', {}, h('a', { href: `#/v/${v.v}` }, h('h3', {}, v.t)), h('div', { className: 'meta' }, v.c)));
  el.dataset.vid = v.v;
  paint(el);
  return el;
}

/* Surprise me: weighted by score. Zero-score (never recommended) videos can't come up. */
function surprise() {
  const current = route().vid;
  const m = matcher(filters);
  const pool = D.videos.filter(v => v.sc > 0 && m(v) && !saved.watched.has(v.v) && v.v !== current);
  if (!pool.length) return alert('Nothing left to pick from under the current filters.');
  let r = Math.random() * pool.reduce((sum, v) => sum + v.sc, 0);
  const pick = pool.find(v => (r -= v.sc) < 0) || pool[pool.length - 1];
  fresh = true;
  location.hash = `#/v/${pick.v}`;
}

/* Render loop; scroll position and grid depth are restored only for back/forward navigation. */
const memos = new Map();
let gridState = {}, fresh = false;
function render() {
  const r = route();
  document.title = "HackerTube — Chris's edition";
  $('nav-later').classList.toggle('on', r.page === 'later');
  $('nav-watched').classList.toggle('on', r.page === 'watched');
  if (observer) observer.disconnect();
  gridState = {};
  if (r.page === 'home') {
    filters = r.filters;
    if (document.activeElement !== search) search.value = filters.q;
    renderHome(filters, memos.get(location.hash));
  } else if (r.page === 'video') {
    renderVideo(r.vid);
  } else {
    renderList(r.page);
  }
}
addEventListener('hashchange', e => {
  const old = new URL(e.oldURL).hash || '#/';
  memos.set(old, { y: scrollY, shown: gridState.shown });
  const memo = fresh ? null : memos.get(location.hash || '#/');
  if (fresh) memos.delete(location.hash || '#/');
  render();
  scrollTo(0, memo ? memo.y : 0);
  fresh = false;
});
document.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) fresh = true; }, true);
history.scrollRestoration = 'manual';

let typing;
search.addEventListener('input', () => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    const r = route();
    const next = homeHash({ ...(r.page === 'home' ? r.filters : filters), q: search.value.trim() });
    fresh = true;
    if (r.page === 'home') { history.replaceState(null, '', next); render(); scrollTo(0, 0); fresh = false; }
    else location.hash = next;
  }, 120);
});
$('surprise').addEventListener('click', surprise);
addEventListener('storage', () => D && syncLists());

fetch('data/videos.json')
  .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
  .then(data => {
    D = data;
    byVid = new Map(D.videos.map(v => [v.v, v]));
    syncLists();
    render();
  })
  .catch(err => {
    view.replaceChildren(h('p', { className: 'note' },
      `Could not load data/videos.json (${err.message}). Run python3 build.py, then python3 -m http.server from ./app.`));
  });

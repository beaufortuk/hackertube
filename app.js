'use strict';
const PAGE = 60, RELATED_SHOWN = 12;
const SITE_TITLE = "HackerTube — Chris's edition";
const $ = id => document.getElementById(id);
const root = document.documentElement;
const view = $('view'), search = $('search'), side = $('side');
const NEWS_KEY = 'hackertube.hideNews';
function showNewsByDefault() { // news stays hidden unless turned on in Settings
  try { return localStorage.getItem(NEWS_KEY) === '0'; } catch { return false; }
}
const baseFilters = () => ({ page: 'home', q: '', area: '', cat: '', sort: 'score', len: '', news: showNewsByDefault() });
let D, byVid, filters = baseFilters(), filtersOpen = false, observer;

const ICONS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM16.2 16.2L21 21',
  home: 'M3 11.5L12 4l9 7.5M6 9.500V20h4v-6h4v6h4V9.500',
  long: 'M3 5h18v14H3zM10 9l5 3-5 3z',
  gem: 'M7 4h10l4 6-9 10.500L3 10zM3 10h18M9.500 4L8 10l4 10.500L16 10l-1.500-6',
  recent: 'M4 6h16v14H4zM4 10.500h16M8.500 3v4.500M15.500 3v4.500',
  later: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 7.500V12l3.500 2',
  watched: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM8 12.500l3 3 5-6.500',
  categories: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  about: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 11v5.500M12 7.500v.500',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM12 2.500v2M12 19.500v2M2.500 12h2M19.500 12h2M5.300 5.300l1.400 1.400M17.300 17.300l1.400 1.400M5.300 18.700l1.400-1.400M17.300 6.700l1.400-1.400',
  moon: 'M20 14.500A8.500 8.500 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z',
  shuffle: 'M3 7h3c5.500 0 6.500 10 12 10h3M3 17h3c2 0 3.300-1.300 4.400-3M13.600 10C14.700 8.300 16 7 18 7h3M18.500 4.500L21 7l-2.500 2.500M18.500 14.500L21 17l-2.500 2.500',
  filters: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  cast: 'M3 18a3 3 0 0 1 3 3M3 14a7 7 0 0 1 7 7M3 10a11 11 0 0 1 11 11M3 7V4.500h18v15h-4.500',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  close: 'M6 6l12 12M18 6L6 18',
  like: 'M7 10v10H4V10zM7 10l4-7c1.500 0 2.500 1 2.500 2.500V9H19a2 2 0 0 1 2 2.300l-1.200 6.700a2 2 0 0 1-2 1.700H7',
  dislike: 'M7 14V4H4v10zM7 14l4 7c1.500 0 2.500-1 2.500-2.500V15H19a2 2 0 0 0 2-2.300l-1.200-6.700a2 2 0 0 0-2-1.700H7',
  save: 'M4 7h12M4 12h12M4 17h7M17 14v6M14 17h6',
  playlist: 'M4 6h16M4 11h16M4 16h8M15 14.500v5l4.500-2.500z',
  collections: 'M4 9h16v11H4zM6.500 6h11M9 3h6',
  settings: 'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M5.600 18.400l2.100-2.100M16.300 7.700l2.100-2.100',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
};
function icon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

// Builds a DOM node; all data goes through text nodes and properties, never innerHTML.
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs || {})) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), val);
    else if (val == null) continue;
    else if (k.includes('-')) el.setAttribute(k, val);
    else el[k] = val;
  }
  el.append(...kids.flat().filter(k => k != null));
  return el;
}
const safeUrl = u => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch { return null; } };
const external = (href, ...kids) => safeUrl(href) ? h('a', { href: safeUrl(href), target: '_blank', rel: 'noopener noreferrer' }, ...kids) : h('span', {}, ...kids);
const num = n => n.toLocaleString('en-US');
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;
const shortNum = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
function clock(seconds) {
  const hrs = Math.floor(seconds / 3600), min = Math.floor(seconds / 60) % 60, sec = String(seconds % 60).padStart(2, '0');
  return hrs ? `${hrs}:${String(min).padStart(2, '0')}:${sec}` : `${min}:${sec}`;
}
const monthIndex = m => { const [y, mo] = m.split('-').map(Number); return y * 12 + mo - 1; };
function ago(month) { // takes YYYY-MM or YYYY-MM-DD
  const now = new Date();
  const n = Math.max(0, now.getFullYear() * 12 + now.getMonth() - monthIndex(month));
  if (n < 1) return 'this month';
  return n < 12 ? `${plural(n, 'month')} ago` : `${plural(Math.floor(n / 12), 'year')} ago`;
}

/* Saved lists. A 'storage' listener keeps tabs in sync so one tab can't overwrite another's marks. */
function loadList(key) {
  try { const a = JSON.parse(localStorage.getItem(key)); return Array.isArray(a) ? a : []; } catch { return []; }
}
const lists = { later: 'hackertube.later', watched: 'hackertube.watched', liked: 'hackertube.liked', disliked: 'hackertube.disliked' };
const OPPOSITE = { liked: 'disliked', disliked: 'liked' };
const LIST_UI = {
  later: { label: 'Watch later', icon: 'later', off: '+ Watch later', on: '✓ Watch later' },
  watched: { label: 'Watched', icon: 'watched', off: 'Mark watched', on: '✓ Watched' },
  liked: { label: 'Liked', action: 'Like', icon: 'like', off: 'Like', on: 'Liked' },
  disliked: { label: 'Disliked', action: 'Dislike', icon: 'dislike', off: 'Dislike', on: 'Disliked' },
};
const saved = {};
function syncLists() {
  for (const n in lists) saved[n] = new Set(loadList(lists[n]));
  playlists = cleanPlaylists(readJson(PLAYLISTS_KEY));
  updateNav();
}
function storeList(name) { return writeJson(lists[name], [...saved[name]]); }
function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } // storage full or blocked
}
function toggle(name, vid) {
  const set = saved[name];
  if (!set.delete(vid)) {
    set.add(vid);
    if (OPPOSITE[name] && saved[OPPOSITE[name]].delete(vid)) storeList(OPPOSITE[name]); // a video can't be both liked and disliked
  }
  storeList(name);
  updateNav();
  document.querySelectorAll(`[data-vid="${vid}"]`).forEach(paint);
  if (route().page === name) {
    render();
    if (document.activeElement === document.body) settleFocus(); // the button went with its card
  }
}
function updateNav() {
  $('nav-later').textContent = saved.later.size || '';
  $('nav-watched').textContent = saved.watched.size || '';
  $('nav-liked').textContent = saved.liked.size || '';
  $('nav-playlists').textContent = playlists.length || '';
}
function paint(el) {
  const vid = el.dataset.vid;
  el.classList.toggle('seen', el.classList.contains('card') && saved.watched.has(vid));
  el.querySelectorAll('[data-list]').forEach(b => {
    const name = b.dataset.list, on = saved[name].has(vid), label = b.querySelector('.lbl');
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    if (label) label.textContent = on ? LIST_UI[name].on : LIST_UI[name].off;
    else b.title = on ? LIST_UI[name].on : LIST_UI[name].off;
  });
  const save = el.querySelector('#save-btn');
  if (save) save.classList.toggle('on', playlists.some(p => p.vids.includes(vid)));
}
function actionButtons(v, compact, names = ['later', 'watched']) {
  return names.map(name => {
    const b = h('button', { type: 'button', className: compact ? 'iconbtn small' : 'pill', 'aria-label': `${LIST_UI[name].action || LIST_UI[name].label}: ${v.t}`, onclick: () => toggle(name, v.v) },
      icon(LIST_UI[name].icon), compact ? null : h('span', { className: 'lbl' }));
    b.dataset.list = name;
    return b;
  });
}

/* Playlists keep their own order, oldest addition first, and names are unique so the Save menu never shows two alike. */
const PLAYLISTS_KEY = 'hackertube.playlists';
const VID_RE = /^[\w-]{11}$/;
const MAX_NAME = 80;
let playlists = [];
const cleanVids = a => Array.isArray(a) ? [...new Set(a.filter(vid => typeof vid === 'string' && VID_RE.test(vid)))] : [];
function cleanPlaylists(a) {
  if (!Array.isArray(a)) return [];
  return a.filter(p => p && typeof p.id === 'string' && /^[\w-]{1,40}$/.test(p.id) && typeof p.name === 'string' && p.name.trim())
    .map(p => ({ id: p.id, name: p.name.trim().slice(0, MAX_NAME), vids: cleanVids(p.vids) }));
}
const findPlaylist = id => playlists.find(p => p.id === id);
const namedPlaylist = name => playlists.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
function storePlaylists() {
  const ok = writeJson(PLAYLISTS_KEY, playlists);
  updateNav();
  return ok;
}
function createPlaylist(name) { // returns the playlist of that name if there already is one
  const clean = name.trim().slice(0, MAX_NAME);
  if (!clean) return null;
  let p = namedPlaylist(clean);
  if (!p) {
    p = { id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`, name: clean, vids: [] };
    playlists.push(p);
    storePlaylists();
  }
  return p;
}
function setInPlaylist(p, vid, on) {
  p.vids = p.vids.filter(x => x !== vid);
  if (on) p.vids.push(vid);
  storePlaylists();
  document.querySelectorAll(`[data-vid="${vid}"]`).forEach(paint);
}

const defaultSort = page => page === 'recent' ? 'recent' : 'score';

/* Routing: every view has its own hash. Filters live in the query, so they survive back/forward and can be linked to. */
function route() {
  const [path, query] = location.hash.slice(1).split('?');
  const parts = (path || '/').split('/').filter(Boolean);
  const [page = 'home', id] = parts;
  const q = new URLSearchParams(query);
  const opts = { ...baseFilters(), news: q.has('news') ? q.get('news') === '1' : showNewsByDefault(),
    sort: ['score', 'recent'].includes(q.get('sort')) ? q.get('sort') : defaultSort(page),
    len: ['long', 'short'].includes(q.get('len')) && page !== 'long' ? q.get('len') : '' };
  if (page === 'home' && !parts.length && (q.has('q') || q.has('cat') || q.has('area'))) { // links from before these routes existed
    if (q.has('q')) return { redirect: listHash({ ...opts, page: 'search', q: q.get('q'), cat: q.get('cat') || '', area: q.get('area') || '' }) };
    if (q.has('cat')) return { redirect: listHash({ ...opts, page: 'c', id: q.get('cat') }) };
    return { redirect: listHash({ ...opts, page: 'a', id: q.get('area') }) };
  }
  if (parts.length === 2 && page === 'v') return { page: 'video', vid: id };
  if (parts.length === 2 && page === 'c') return { ...opts, page, id, cat: id };
  if (parts.length === 2 && page === 'a') return { ...opts, page, id, area: id };
  if (parts.length < 2) {
    if (page === 'search') return { ...opts, page, q: q.get('q') || '', cat: q.get('cat') || '', area: q.get('area') || '' };
    if (Object.hasOwn(PRESETS, page)) return { ...opts, page };
    if (['later', 'watched', 'liked', 'playlists', 'collections', 'categories', 'settings', 'about'].includes(page)) return { page };
    if (page === 'help') return { redirect: '#/about' };
  }
  if (parts.length === 2 && (page === 'playlists' || page === 'collections')) return { page, id };
  return { page: '404' };
}
function listHash(f) {
  const q = new URLSearchParams();
  if (f.page === 'search') {
    if (f.q) q.set('q', f.q);
    if (f.cat) q.set('cat', f.cat);
    else if (f.area) q.set('area', f.area);
  }
  if (f.sort && f.sort !== defaultSort(f.page)) q.set('sort', f.sort);
  if (f.len) q.set('len', f.len);
  if (f.news !== showNewsByDefault()) q.set('news', f.news ? '1' : '0');
  const path = f.page === 'home' ? '/' : (f.page === 'c' || f.page === 'a') ? `/${f.page}/${f.id}` : `/${f.page}`;
  const s = q.toString();
  return `#${path}${s ? '?' + s : ''}`;
}

/* Filtering */
// Running times come from yt_meta.json and only cover some videos; for the rest, length goes by format.
const LONG_SECONDS = 20 * 60;
const LONG_FORMATS = new Set(['talk', 'lecture', 'course', 'documentary', 'interview', 'podcast']);
const isLong = v => v.ln ? v.ln >= LONG_SECONDS : LONG_FORMATS.has(v.ct);
const LONG_RULE = 'Long means 20 minutes or more. Where the running time isn’t known, it goes by format: talks, lectures, courses, documentaries, interviews and podcasts count as long.';
const RECENT_MONTHS = 12;
const PRESETS = {
  home: { heading: 'Most recommended on Hacker News', title: '' },
  long: { heading: 'Long watches', tip: LONG_RULE, test: isLong },
  gems: { heading: 'Hidden gems', tip: 'Few recommenders, but at least two of them enthusiastic.', test: v => v.rc >= 2 && v.rc <= 5 && v.ss >= 2 },
  recent: { heading: 'Recent', tip: `Recommended on Hacker News in the last ${RECENT_MONTHS} months of the data.`, test: v => v.rc > 0 && D.latest - monthIndex(v.lm) < RECENT_MONTHS },
};
const haystack = v => v._s || (v._s = `${v.t} ${v.c} ${v.s}`);
// Whole words only; lookarounds rather than \b so terms like "c++" and ".net" still match.
const wordRegex = t => new RegExp(`(?<![\\p{L}\\p{N}_])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`, 'iu');
function matcher(f) {
  const terms = f.q.split(/\s+/).filter(Boolean).map(wordRegex);
  const cat = f.cat ? D.cats.findIndex(c => c.id === f.cat) : -1;
  const area = f.area ? D.areas.findIndex(a => a.id === f.area) : -1;
  const preset = (PRESETS[f.page] || {}).test;
  return v => (f.news || !v.n)
    && (!preset || preset(v))
    && (!f.len || isLong(v) === (f.len === 'long'))
    && (cat < 0 || v.k.includes(cat))
    && (area < 0 || v.k.some(k => D.cats[k].a === area))
    && terms.every(t => t.test(haystack(v)));
}
function activeAreaIndex(f) {
  const c = D.cats.find(c => c.id === f.cat);
  return c ? c.a : D.areas.findIndex(a => a.id === f.area);
}

/* Google Cast. The SDK loads once, on the first video page, so requestSession() still runs inside the click's user gesture. */
let castSdk;
function loadCast() {
  return castSdk || (castSdk = new Promise(resolve => {
    window.__onGCastApiAvailable = ok => {
      ok = ok && window.cast && cast.framework; // ok can be true even when the framework script failed
      if (ok) cast.framework.CastContext.getInstance().setOptions({ receiverApplicationId: '233637DE', autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED });
      resolve(!!ok);
    };
    document.head.append(h('script', { src: 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1', onerror: () => resolve(false) }));
  }));
}
async function castVideo(vid) {
  if (!await loadCast()) return;
  const ctx = cast.framework.CastContext.getInstance();
  try {
    if (!ctx.getCurrentSession()) await ctx.requestSession();
    await ctx.getCurrentSession().sendMessage('urn:x-cast:com.google.youtube.mdx', { type: 'flingVideo', data: { currentTime: 0, videoId: vid } });
    toast('Sent to TV');
  } catch (e) {
    const code = e.code || e;
    if (code !== 'cancel') toast(code === 'receiver_unavailable' ? 'No Cast device found' : 'Cast failed');
  }
}

/* Components */
function recLine(v) {
  return v.rc ? `${v.rc} HN rec${v.rc > 1 ? 's' : ''} · last rec ${ago(v.lm)}` : `cited, not recommended · ${ago(v.lm)}`;
}
function viewLine(v, exact) { // "N views · X years ago", empty when YouTube's numbers aren't known
  const views = v.vw == null ? null : `${exact ? num(v.vw) : shortNum.format(v.vw)} view${v.vw === 1 ? '' : 's'}`;
  return [views, v.pb ? ago(v.pb) : null].filter(Boolean).join(' · ');
}
function card(v, extra) {
  const el = h('div', { className: 'card' },
    thumb(v),
    h('div', { className: 'card-body' },
      h('div', { className: 'card-text' },
        h('a', { href: `#/v/${v.v}` }, h('h2', {}, v.t)),
        h('div', { className: 'meta' }, v.c),
        h('div', { className: 'meta' }, viewLine(v) || `${v.ct} · ${recLine(v)}`),
        extra),
      h('div', { className: 'card-actions' }, actionButtons(v, true))));
  el.dataset.vid = v.v;
  paint(el);
  return el;
}
function thumb(v) { // Out of the tab order and hidden from screen readers: the title link next to it goes to the same place.
  return h('a', { className: 'thumb', href: `#/v/${v.v}`, tabIndex: -1, 'aria-hidden': 'true' },
    thumbImage(v.v),
    h('span', { className: 'badge score', title: 'HackerTube score' }, `★ ${v.sc}`),
    v.ln ? h('span', { className: 'badge', title: 'Running time' }, clock(v.ln)) : null);
}
function thumbImage(vid) {
  return h('img', { src: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, alt: '', loading: 'lazy', onerror: e => e.target.remove() });
}
function tile(href, title, sub, firstVid) { // a playlist or collection in a grid, shown by its first video
  return h('div', { className: 'card tile' },
    h('a', { className: 'thumb', href, tabIndex: -1, 'aria-hidden': 'true' }, firstVid ? thumbImage(firstVid) : icon('playlist')),
    h('div', { className: 'card-body' }, h('div', { className: 'card-text' },
      h('a', { href }, h('h2', {}, title)),
      h('div', { className: 'meta' }, sub))));
}
function chip(label, count, href, on) {
  return h('a', { className: 'chip' + (on ? ' on' : ''), href, 'aria-current': on ? 'true' : null }, label, count == null ? null : h('small', {}, num(count)));
}
function grid(items, shownFrom, makeCard = card) {
  const g = h('div', { className: 'grid' });
  let shown = 0;
  const sentinel = h('div');
  const more = n => {
    g.append(...items.slice(shown, shown + n).map(v => makeCard(v)));
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
function setTitle(title) { document.title = title ? `${title} — ${SITE_TITLE}` : SITE_TITLE; }
function heading(text, sub, tip) {
  return h('div', { className: 'head' }, h('h1', { tabIndex: -1, title: tip }, text), sub ? h('p', { className: 'sub' }, sub) : null);
}
function emptyView(title) {
  setTitle(title);
  view.replaceChildren(h('div', { className: 'empty' }, h('h1', { tabIndex: -1 }, title),
    h('div', { className: 'links' }, h('a', { className: 'pill', href: '#/' }, 'Go home'), h('a', { className: 'pill', href: '#/categories' }, 'Browse categories'))));
}

/* Views */
function listSpec(r) {
  if (r.page === 'search') return r.q ? { heading: `Results for “${r.q}”`, title: `“${r.q}”` } : { heading: 'Search', title: 'Search' };
  if (r.page === 'c') {
    const c = D.cats.find(c => c.id === r.id);
    return c && { heading: c.name, title: c.name, crumbs: [D.areas[c.a]] };
  }
  if (r.page === 'a') {
    const a = D.areas.find(a => a.id === r.id);
    return a && { heading: a.name, title: a.name, crumbs: [] };
  }
  return PRESETS[r.page];
}
function breadcrumbs(areas) {
  return h('nav', { className: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href: '#/categories' }, 'Categories'),
    areas.flatMap(a => [' › ', h('a', { href: `#/a/${a.id}` }, a.name)]));
}
function facets(r) {
  const base = D.videos.filter(matcher({ ...r, area: '', cat: '' }));
  const areaIdx = activeAreaIndex(r);
  const areaCounts = new Map(), catCounts = new Map();
  for (const v of base) {
    new Set(v.k.map(k => D.cats[k].a)).forEach(a => areaCounts.set(a, (areaCounts.get(a) || 0) + 1));
    v.k.forEach(k => catCounts.set(k, (catCounts.get(k) || 0) + 1));
  }
  const inSearch = r.page === 'search';
  const areaHref = a => inSearch ? listHash({ ...r, area: a ? a.id : '', cat: '' }) : a ? listHash({ ...r, page: 'a', id: a.id }) : listHash({ ...r, page: 'home' });
  const catHref = c => inSearch ? listHash({ ...r, cat: c.id }) : listHash({ ...r, page: 'c', id: c.id });
  const rows = [];
  if (r.page === 'home' || inSearch) {
    rows.push(chip('All', base.length, areaHref(null), areaIdx < 0),
      ...D.areas.map((a, i) => (areaCounts.get(i) || i === areaIdx) ? chip(a.name, areaCounts.get(i) || 0, areaHref(a), i === areaIdx) : null));
  }
  if (areaIdx >= 0) {
    if (!inSearch) rows.push(chip(`All in ${D.areas[areaIdx].name}`, areaCounts.get(areaIdx) || 0, areaHref(D.areas[areaIdx]), !r.cat));
    D.cats.forEach((c, i) => {
      if (c.a === areaIdx && (catCounts.get(i) || c.id === r.cat)) rows.push(chip(c.name, catCounts.get(i) || 0, c.id === r.cat && inSearch ? areaHref(D.areas[areaIdx]) : catHref(c), c.id === r.cat));
    });
  }
  return rows.filter(Boolean);
}
function filterPanel(r, newsTotal) {
  const go = (change, focusId) => { refocus = focusId; location.hash = listHash({ ...r, ...change }); };
  const select = (id, label, value, options, onchange, title) => h('label', { title }, label,
    h('select', { id, onchange }, options.map(([val, text]) => h('option', { value: val, selected: val === value }, text))));
  const dirty = r.sort !== defaultSort(r.page) || r.len || r.news !== showNewsByDefault();
  return h('div', { id: 'filters-panel', className: 'panel', hidden: !filtersOpen, role: 'group', 'aria-label': 'Filters' },
    select('f-sort', 'Sort by', r.sort, [['score', 'Best (HN score)'], ['recent', 'Recently recommended']], e => go({ sort: e.target.value }, 'f-sort')),
    r.page === 'long' ? null : select('f-len', 'Length', r.len, [['', 'Any length'], ['long', 'Long'], ['short', 'Shorter']], e => go({ len: e.target.value }, 'f-len'), LONG_RULE),
    h('label', { className: 'check' }, h('input', { id: 'f-news', type: 'checkbox', checked: r.news, onchange: e => go({ news: e.target.checked }, 'f-news') }), `Show news (${num(newsTotal)})`),
    dirty ? h('a', { className: 'reset', href: listHash({ ...r, sort: '', len: '', news: showNewsByDefault() }) }, 'Reset') : null);
}
function setFiltersOpen(open) {
  const panel = $('filters-panel');
  filtersOpen = open;
  if (!panel) return;
  panel.hidden = !open;
  $('filters-btn').setAttribute('aria-expanded', open);
}
function renderBrowse(r, memo) {
  const spec = listSpec(r);
  if (!spec) return emptyView('Page not found');
  filters = r;
  setTitle(spec.title ?? spec.heading);
  let items = D.videos.filter(matcher(r));
  if (r.sort === 'recent') items = [...items].sort((a, b) => monthIndex(b.lm) - monthIndex(a.lm)); // stable: ties stay best-first
  const newsTotal = D.videos.filter(matcher({ ...r, news: true })).filter(v => v.n).length;
  const active = (r.sort !== defaultSort(r.page) ? 1 : 0) + (r.len ? 1 : 0) + (r.news !== showNewsByDefault() ? 1 : 0);
  const chips = facets(r);
  const count = `${plural(items.length, 'video')}, ${r.sort === 'recent' ? 'most recently recommended first' : 'best first'}`;
  $('announce').textContent = plural(items.length, 'video');
  view.replaceChildren(
    spec.crumbs ? breadcrumbs(spec.crumbs) : '',
    heading(spec.heading, null, spec.tip),
    h('div', { className: 'toolbar' },
      h('button', { id: 'filters-btn', type: 'button', className: 'pill', 'aria-expanded': filtersOpen, 'aria-controls': 'filters-panel', onclick: () => setFiltersOpen(!filtersOpen) },
        icon('filters'), 'Filters', active ? h('span', { className: 'tally', 'aria-label': `${active} active` }, active) : null),
      chips.length ? h('nav', { className: 'chips', 'aria-label': 'Narrow by topic' }, chips) : null),
    filterPanel(r, newsTotal),
    h('p', { className: 'meta' }, count),
    ...(items.length ? grid(items, memo && memo.shown) : [h('p', { className: 'note' }, 'Nothing matches those filters. ',
      newsTotal && !r.news ? h('a', { href: listHash({ ...r, news: true }) }, `Show ${plural(newsTotal, 'news video')}`) : null)]));
}
function renderList(name) {
  const set = saved[name];
  const label = LIST_UI[name].label;
  const items = [...set].reverse().map(vid => byVid.get(vid)).filter(Boolean);
  setTitle(label);
  view.replaceChildren(
    heading(label, plural(items.length, 'video')),
    ...(items.length ? grid(items, items.length) : [h('p', { className: 'note' }, 'Nothing here yet')]));
}
function crumbTo(href, label) {
  return h('nav', { className: 'crumbs', 'aria-label': 'Breadcrumb' }, h('a', { href }, label));
}
function newPlaylistForm(id, onCreate) {
  const input = h('input', { id, type: 'text', maxLength: MAX_NAME, placeholder: 'New playlist name', autocomplete: 'off', 'aria-label': 'New playlist name', required: true });
  return h('form', { className: 'inline-form', onsubmit: e => {
    e.preventDefault();
    const p = createPlaylist(input.value);
    if (!p) return input.focus();
    input.value = '';
    onCreate(p);
  } }, input, h('button', { type: 'submit', className: 'pill' }, 'Create'));
}
function renderPlaylists() {
  setTitle('Playlists');
  view.replaceChildren(
    heading('Playlists', plural(playlists.length, 'playlist')),
    newPlaylistForm('new-playlist', p => { location.hash = `#/playlists/${p.id}`; }),
    playlists.length
      ? h('div', { className: 'grid' }, playlists.map(p => tile(`#/playlists/${p.id}`, p.name, plural(p.vids.length, 'video'), p.vids.find(vid => byVid.has(vid)))))
      : h('p', { className: 'note' }, 'Nothing here yet'));
}
function renderPlaylist(id) {
  const p = findPlaylist(id);
  if (!p) return emptyView('Playlist not found');
  const items = p.vids.map(vid => byVid.get(vid)).filter(Boolean);
  const change = (vid, button) => { // keeps focus on the moved card; a button at the end of the list falls back to the other arrow
    storePlaylists();
    render();
    const inCard = sel => view.querySelector(`.card[data-vid="${vid}"] ${sel}:not(:disabled)`);
    const el = button && (inCard(`[data-move="${button}"]`) || inCard('[data-move]'));
    if (el) el.focus();
    else settleFocus();
  };
  const move = (vid, by) => {
    const i = p.vids.indexOf(vid), j = i + by;
    [p.vids[i], p.vids[j]] = [p.vids[j], p.vids[i]];
    change(vid, by < 0 ? 'up' : 'down');
  };
  const order = (v, i) => {
    const smallButton = (name, label, disabled, onclick) => h('button', { type: 'button', className: 'iconbtn small', 'aria-label': `${label}: ${v.t}`, title: label, disabled, onclick }, icon(name));
    const up = smallButton('up', 'Move up', i === 0, () => move(v.v, -1));
    const down = smallButton('down', 'Move down', i === items.length - 1, () => move(v.v, 1));
    up.dataset.move = 'up';
    down.dataset.move = 'down';
    return h('div', { className: 'order' }, up, down, smallButton('trash', 'Remove from playlist', false, () => {
      p.vids = p.vids.filter(x => x !== v.v);
      change(v.v);
    }));
  };
  const nameInput = h('input', { id: 'rename-input', type: 'text', maxLength: MAX_NAME, value: p.name, autocomplete: 'off', 'aria-label': 'Playlist name', required: true });
  const form = h('form', { className: 'inline-form', hidden: true, onsubmit: e => {
    e.preventDefault();
    const name = nameInput.value.trim().slice(0, MAX_NAME), other = namedPlaylist(name);
    if (!name) return nameInput.focus();
    if (other && other !== p) { toast(`You already have a playlist called “${other.name}”.`); return nameInput.focus(); }
    p.name = name;
    storePlaylists();
    render();
    settleFocus();
  } }, nameInput, h('button', { type: 'submit', className: 'pill' }, 'Save'),
    h('button', { type: 'button', className: 'pill', onclick: () => { form.hidden = true; $('rename-btn').focus(); } }, 'Cancel'));
  setTitle(p.name);
  view.replaceChildren(
    crumbTo('#/playlists', 'Playlists'),
    heading(p.name, plural(items.length, 'video')),
    h('div', { className: 'toolbar' },
      h('button', { id: 'rename-btn', type: 'button', className: 'pill', onclick: () => { form.hidden = false; nameInput.select(); nameInput.focus(); } }, icon('edit'), 'Rename'),
      h('button', { id: 'delete-btn', type: 'button', className: 'pill', onclick: () => {
        if (!confirm(`Delete the playlist “${p.name}”?`)) return;
        playlists = playlists.filter(x => x !== p);
        storePlaylists();
        toast(`Deleted “${p.name}”.`);
        location.replace('#/playlists');
      } }, icon('trash'), 'Delete')),
    form,
    ...(items.length ? grid(items, items.length, v => card(v, order(v, items.indexOf(v)))) : [h('p', { className: 'note' }, 'Nothing here yet')]));
}
function renderCollections() {
  const section = (title, g) => [h('h2', { className: 'section' }, title),
    h('div', { className: 'grid' }, D.cols.filter(c => c.g === g).map(c => tile(`#/collections/${c.id}`, c.t, plural(c.i.length, 'video'), D.videos[c.i[0]].v)))];
  setTitle('Collections');
  view.replaceChildren(heading('Collections'),
    ...section('Themes', 'theme'), ...section('Best of each area', 'area'));
}
function renderCollection(id, memo) {
  const c = D.cols.find(c => c.id === id);
  if (!c) return emptyView('Collection not found');
  setTitle(c.t);
  view.replaceChildren(crumbTo('#/collections', 'Collections'), heading(c.t, null, c.s), ...grid(c.i.map(i => D.videos[i]), memo && memo.shown));
}
function countCategories() {
  D.areaCount = D.areas.map(() => 0);
  D.catCount = D.cats.map(() => 0);
  const news = showNewsByDefault();
  for (const v of D.videos) {
    if (v.n && !news) continue;
    v.k.forEach(k => D.catCount[k]++);
    new Set(v.k.map(k => D.cats[k].a)).forEach(a => D.areaCount[a]++);
  }
}
function renderCategories() {
  const byCount = (list, count) => list.map((item, i) => ({ item, i })).sort((x, y) => count[y.i] - count[x.i]);
  countCategories();
  setTitle('Categories');
  view.replaceChildren(
    heading('Categories', `${D.areas.length} areas and ${D.cats.length} categories`),
    h('div', { className: 'areas' }, byCount(D.areas, D.areaCount).map(({ item: a, i }) => h('section', { className: 'area', 'aria-labelledby': `area-${a.id}` },
      h('h2', { id: `area-${a.id}` }, h('a', { href: `#/a/${a.id}` }, a.name, h('span', { className: 'num' }, num(D.areaCount[i])))),
      h('ul', {}, byCount(D.cats, D.catCount).filter(({ item: c }) => c.a === i).map(({ item: c, i: k }) =>
        h('li', {}, h('a', { href: `#/c/${c.id}` }, c.name, h('span', { className: 'num' }, num(D.catCount[k]))))))))));
}
const CLEARABLE = [['liked', 'Liked'], ['disliked', 'Disliked'], ['later', 'Watch later'], ['watched', 'Watched']];
function clearAll(label, count, clear) {
  if (!confirm(`Clear ${label} (${count})? This can’t be undone.`)) return;
  clear();
  updateNav();
  render();
  settleFocus();
  toast(`Cleared ${label}.`);
}
function renderSettings() {
  const mode = savedTheme() || 'system';
  const status = h('p', { id: 'data-status', className: 'meta status', role: 'status' });
  const clearRow = (label, count, clear) => h('li', { className: 'setting-row' },
    h('span', {}, label, ' ', h('span', { className: 'count' }, plural(count, label === 'Playlists' ? 'playlist' : 'video'))),
    h('button', { type: 'button', className: 'pill', disabled: !count, 'aria-label': `Clear ${label}`, onclick: () => clearAll(label, count, clear) }, 'Clear'));
  setTitle('Settings');
  view.replaceChildren(h('div', { className: 'prose settings' },
    heading('Settings'),
    h('h2', {}, 'Theme'),
    h('div', { className: 'radios', role: 'radiogroup', 'aria-label': 'Theme' }, [['system', 'Match system'], ['light', 'Light'], ['dark', 'Dark']].map(([value, label]) =>
      h('label', { className: 'check' }, h('input', { type: 'radio', name: 'theme', value, checked: mode === value, onchange: () => setTheme(value) }), label))),
    h('h2', {}, 'News'),
    h('label', { className: 'check' },
      h('input', { id: 'hide-news', type: 'checkbox', checked: !showNewsByDefault(), onchange: e => {
        try { localStorage.setItem(NEWS_KEY, e.target.checked ? '1' : '0'); } catch { /* storage full or blocked */ }
        filters = baseFilters();
      } }), 'Hide news videos by default'),
    h('h2', {}, 'Your lists'),
    h('ul', { className: 'setting-rows' },
      CLEARABLE.map(([name, label]) => clearRow(label, saved[name].size, () => { saved[name].clear(); storeList(name); })),
      clearRow('Playlists', playlists.length, () => { playlists = []; storePlaylists(); })),
    h('h2', {}, 'Backup'),
    h('div', { className: 'actions' },
      h('button', { id: 'export-btn', type: 'button', className: 'pill', title: 'Saves all lists and playlists as JSON', onclick: () => exportLists(status) }, 'Export to file'),
      h('label', { className: 'pill file-pill', title: 'Adds to your lists and playlists; removes nothing' }, 'Import from file',
        h('input', { id: 'import-file', className: 'sr-only', type: 'file', accept: '.json,application/json', onchange: e => {
          const file = e.target.files[0];
          e.target.value = ''; // so picking the same file again still fires
          if (file) importLists(file);
        } }))),
    status));
}
function exportLists(status) {
  const data = { app: 'hackertube', version: 1, exported: new Date().toISOString(), lists: {}, playlists };
  for (const name in lists) data.lists[name] = [...saved[name]];
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = h('a', { href: url, download: `hackertube-lists-${data.exported.slice(0, 10)}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  status.textContent = 'Exported.';
}
async function importLists(file) {
  const report = message => { const s = $('data-status'); if (s) s.textContent = message; };
  let data;
  if (file.size > 5e6) return report('Import failed');
  try { data = JSON.parse(await file.text()); } catch { return report(`Nothing imported: ${file.name} isn’t a JSON file.`); }
  if (!data || data.app !== 'hackertube' || typeof data.lists !== 'object' || !data.lists) return report(`Nothing imported: ${file.name} isn’t a HackerTube export.`);
  let added = 0, ok = true;
  for (const name in lists) {
    for (const vid of cleanVids(data.lists[name])) {
      if (saved[name].has(vid)) continue;
      saved[name].add(vid);
      added++;
    }
  }
  for (const vid of saved.liked) saved.disliked.delete(vid); // if a file disagrees with what's here, like wins
  for (const name in lists) ok = storeList(name) && ok;
  const incoming = cleanPlaylists(data.playlists);
  for (const p of incoming) {
    const mine = findPlaylist(p.id) || namedPlaylist(p.name);
    if (mine) mine.vids = [...new Set([...mine.vids, ...p.vids])];
    else playlists.push(p);
  }
  ok = storePlaylists() && ok;
  render();
  settleFocus();
  report(ok ? `Imported ${plural(added, 'video')} into your lists and ${plural(incoming.length, 'playlist')}.` : 'Import failed: this browser wouldn’t save the data.');
}
function renderAbout() {
  const built = new Date(`${D.built}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', dateStyle: 'long' });
  setTitle('About');
  view.replaceChildren(h('div', { className: 'prose' },
    heading('About'),
    h('p', {}, `A browsable collection of ${num(D.videos.length)} YouTube videos from Hacker News comments, ranked by how often and how warmly they were recommended.`),
    h('p', {}, 'Data from ', external('https://hackertube.org', 'hackertube.org'), ' by Andrej Karpathy, and YouTube.'),
    h('p', { id: 'built' }, `Last built ${built}.`)));
}
function renderVideo(vid) {
  const v = byVid.get(vid);
  if (!v) return emptyView('Video not found');
  const related = v.r.map(i => D.videos[i]).filter(r => filters.news || !r.n || v.n).slice(0, RELATED_SHOWN);
  const castButton = h('button', { type: 'button', className: 'pill primary', onclick: () => castVideo(v.v) }, icon('cast'), 'Cast to TV');
  loadCast().then(ok => {
    if (ok) return;
    castButton.disabled = true;
    castButton.title = 'Casting isn’t available in this browser';
  });
  const actions = h('div', { className: 'actions' }, actionButtons(v, false, ['liked', 'disliked']), actionButtons(v), saveMenu(v),
    castButton,
    h('a', { className: 'pill', href: `https://www.youtube.com/watch?v=${v.v}`, target: '_blank', rel: 'noopener noreferrer' }, icon('external'), 'Open in YouTube'));
  actions.dataset.vid = v.v;
  paint(actions);
  const ytLine = viewLine(v, true);
  const years = v.y[0] === v.y[1] ? v.y[0] : `${v.y[0]}–${v.y[1]}`;
  const stats = v.rc
    ? `★ ${v.sc} · ${v.rc} HN recommender${v.rc === 1 ? '' : 's'} · recommended in ${plural(v.rm, 'month')}, ${years}`
    : `★ ${v.sc} · cited on HN ${years}, not recommended`;
  setTitle(v.t);
  view.replaceChildren(h('div', { className: 'page' },
    h('div', {},
      h('iframe', { className: 'player', title: v.t, src: `https://www.youtube.com/embed/${v.v}?rel=0&playsinline=1`, allowFullscreen: true,
        allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
        referrerPolicy: 'strict-origin-when-cross-origin' }),
      h('h1', { tabIndex: -1 }, v.t),
      h('a', { className: 'channel', href: listHash({ ...baseFilters(), page: 'search', q: v.c }), title: 'Search for this channel' }, v.c),
      v.ln || ytLine ? h('div', { className: 'meta yt-line' }, v.ln ? h('span', { className: 'badge inline', title: 'Running time' }, clock(v.ln)) : null, ytLine) : null,
      h('div', { className: 'meta' }, stats),
      actions,
      h('div', { className: 'box' },
        h('p', { className: 'meta' }, `${v.ct} · ${v.rc ? 'last recommended' : 'last cited'} ${ago(v.lm)}`),
        h('p', {}, v.s),
        h('p', {}, h('b', {}, 'Why HN: '), v.w),
        h('div', { className: 'chips wrap' }, v.k.map(k => chip(D.cats[k].name, null, listHash({ ...baseFilters(), page: 'c', id: D.cats[k].id, news: filters.news }))))),
      h('h2', {}, 'Top HN recommendations'),
      v.m.length ? v.m.map(comment) : h('p', { className: 'note' }, 'Only cited in passing')),
    h('aside', { 'aria-label': 'Related videos' },
      h('h2', {}, 'Related'),
      related.map(mini))));
}
let closeSaveMenu = null; // set while the Save menu is open
function saveMenu(v) {
  const list = h('ul', { className: 'save-list' });
  const fill = () => list.replaceChildren(...playlists.map(p => h('li', {},
    h('label', { className: 'check' }, h('input', { type: 'checkbox', checked: p.vids.includes(v.v), onchange: e => {
      setInPlaylist(p, v.v, e.target.checked);
      toast(`${e.target.checked ? 'Saved to' : 'Removed from'} “${p.name}”.`);
    } }), h('span', {}, p.name)))));
  const panel = h('div', { id: 'save-panel', className: 'save-panel', role: 'group', 'aria-label': 'Save to playlist', hidden: true },
    h('div', { className: 'save-title' }, 'Save to…'),
    list,
    newPlaylistForm('save-new', p => {
      setInPlaylist(p, v.v, true);
      fill();
      toast(`Saved to “${p.name}”.`);
      $('save-new').focus();
    }));
  const close = returnFocus => {
    panel.hidden = true;
    closeSaveMenu = null;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  };
  const open = () => {
    fill();
    panel.hidden = false;
    closeSaveMenu = close;
    button.setAttribute('aria-expanded', 'true');
    panel.style.transform = '';
    const box = panel.getBoundingClientRect(), edge = root.clientWidth - 8;
    panel.style.transform = `translateX(${Math.min(0, edge - box.right) + Math.max(0, 8 - box.left)}px)`; // stays on screen wherever the row wraps it
    (panel.querySelector('input') || panel).focus();
  };
  const button = h('button', { id: 'save-btn', type: 'button', className: 'pill', 'aria-expanded': 'false', 'aria-controls': 'save-panel', onclick: () => closeSaveMenu ? close(true) : open() }, icon('save'), 'Save');
  return h('div', { className: 'save-wrap', onfocusout: e => {
    if (closeSaveMenu && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) close(false);
  } }, button, panel);
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
    h('div', {}, h('a', { href: `#/v/${v.v}` }, h('h3', {}, v.t)), h('div', { className: 'meta' }, v.c), h('div', { className: 'meta' }, viewLine(v) || recLine(v))));
  el.dataset.vid = v.v;
  paint(el);
  return el;
}

/* Surprise me: weighted by score. Zero-score (never recommended) videos can't come up. */
let toastTimer;
function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4000);
}
function surprise() {
  if (!D) return;
  const current = route().vid;
  const m = matcher(filters);
  const pool = D.videos.filter(v => v.sc > 0 && m(v) && !saved.watched.has(v.v) && !saved.disliked.has(v.v) && v.v !== current);
  if (!pool.length) return toast('Nothing left to pick from under the current filters.');
  let r = Math.random() * pool.reduce((sum, v) => sum + v.sc, 0);
  const pick = pool.find(v => (r -= v.sc) < 0) || pool[pool.length - 1];
  location.hash = `#/v/${pick.v}`;
}

/* Shell: sidebar on wide screens, icon rail on medium ones, drawer on demand below that. */
const wideScreen = matchMedia('(min-width: 1200px)');
const SIDEBAR_KEY = 'hackertube.sidebar';
let collapsed = false, drawerOpen = false;
try { collapsed = localStorage.getItem(SIDEBAR_KEY) === 'rail'; } catch { /* storage blocked */ }
function syncShell() {
  const wide = wideScreen.matches;
  root.classList.toggle('side-collapsed', wide && collapsed);
  root.classList.toggle('rail', !drawerOpen && (!wide || collapsed));
  root.classList.toggle('drawer-open', drawerOpen);
  const expanded = wide ? !collapsed : drawerOpen;
  $('menu').setAttribute('aria-expanded', expanded);
  $('menu').setAttribute('aria-label', wide && expanded ? 'Collapse menu' : wide ? 'Expand menu' : 'Open menu');
  $('scrim').hidden = !drawerOpen;
  for (const el of [$('skip'), $('top'), $('content')]) el.inert = drawerOpen;
}
function openDrawer() {
  root.style.setProperty('--scrollbar', `${innerWidth - root.clientWidth}px`); // the locked page must not shift when its scrollbar goes
  drawerOpen = true;
  syncShell();
  $('menu-close').focus();
}
function closeDrawer(restoreFocus) {
  if (!drawerOpen) return;
  drawerOpen = false;
  syncShell();
  if (restoreFocus) $('menu').focus();
}
function trapTab(e) {
  const stops = [...side.querySelectorAll('a, button')];
  const first = stops[0], last = stops[stops.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!side.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}
function setTheme(mode) {
  try {
    if (mode === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, mode);
  } catch { /* storage full or blocked */ }
  root.dataset.theme = mode === 'system' ? (systemDark.matches ? 'dark' : 'light') : mode;
  syncThemeButton();
}
function syncThemeButton() {
  const dark = root.dataset.theme === 'dark';
  const b = $('theme');
  b.replaceChildren(icon(dark ? 'sun' : 'moon'));
  b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  b.title = dark ? 'Light theme' : 'Dark theme';
  const mode = savedTheme() || 'system';
  document.querySelectorAll('input[name="theme"]').forEach(input => { input.checked = input.value === mode; });
}

/* Render loop. Each history entry gets its own id, so back/forward restores that visit's scroll and grid depth, while a fresh visit to the same hash starts at the top. */
const MEMO_KEY = 'hackertube.memos';
const memos = new Map(); // entry id -> { y, shown, open }
let gridState = {}, entry, entrySeq = 0, refocus = null, typedNav = false;
function ensureEntry() {
  entry = history.state && history.state.id;
  if (entry) return memos.get(entry);
  entry = `${Date.now().toString(36)}-${entrySeq++}`;
  history.replaceState({ id: entry }, '');
  return null;
}
const snapshot = () => ({ y: scrollY, shown: gridState.shown, open: filtersOpen });
function syncNav(r) {
  const current = (r.page === 'c' || r.page === 'a') ? 'categories' : r.page;
  side.querySelectorAll('a[data-nav]').forEach(a => {
    if (a.dataset.nav === current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}
function render(memo) {
  const r = route();
  if (r.redirect) return location.replace(r.redirect);
  syncNav(r);
  if (observer) observer.disconnect();
  gridState = {};
  closeSaveMenu = null;
  if (r.page !== 'video' && !typedNav) search.value = r.q || '';
  if (r.page === 'video') renderVideo(r.vid);
  else if (r.page === 'later' || r.page === 'watched' || r.page === 'liked') renderList(r.page);
  else if (r.page === 'playlists') r.id ? renderPlaylist(r.id) : renderPlaylists();
  else if (r.page === 'collections') r.id ? renderCollection(r.id, memo) : renderCollections();
  else if (r.page === 'settings') renderSettings();
  else if (r.page === 'categories') renderCategories();
  else if (r.page === 'about') renderAbout();
  else if (r.page === '404') emptyView('Page not found');
  else renderBrowse(r, memo);
}
function settleFocus() { // Moves focus with the view so keyboard and screen-reader users land on the new page's heading.
  const target = (refocus && $(refocus)) || view.querySelector('h1') || view;
  refocus = null;
  target.focus({ preventScroll: true });
}
addEventListener('hashchange', e => {
  if (!typedNav) clearTimeout(typing); // when typing caused this, a pending timer holds a newer keystroke
  if (!D) return;
  memos.set(entry, snapshot());
  const memo = ensureEntry();
  const samePage = new URL(e.oldURL).hash.split('?')[0] === location.hash.split('?')[0];
  filtersOpen = memo ? !!memo.open : samePage && filtersOpen;
  closeDrawer(false);
  render(memo);
  scrollTo(0, memo ? memo.y : 0);
  if (typedNav) typedNav = false;
  else settleFocus();
});
history.scrollRestoration = 'manual';
addEventListener('pagehide', () => { // so a reload can restore the same way
  if (!entry) return;
  memos.set(entry, snapshot());
  try { sessionStorage.setItem(MEMO_KEY, JSON.stringify([...memos].slice(-100))); } catch { /* storage full or blocked */ }
});

let typing;
function searchRoute(q) {
  const r = route();
  return listHash({ ...(r.page === 'search' ? r : baseFilters()), page: 'search', q });
}
search.addEventListener('input', () => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    if (!D) return;
    const q = search.value.trim(), r = route();
    if (r.page === 'search') { // refine in place, so back leaves the search rather than stepping through each keystroke
      history.replaceState(history.state, '', searchRoute(q));
      typedNav = true;
      render();
      typedNav = false;
      scrollTo(0, 0);
    } else if (q) {
      typedNav = true;
      location.hash = searchRoute(q);
    }
  }, 120);
});
$('search-form').addEventListener('submit', e => {
  e.preventDefault();
  clearTimeout(typing);
  const q = search.value.trim();
  const target = q ? searchRoute(q) : '#/';
  if (location.hash === target) settleFocus();
  else location.hash = target;
});
$('surprise').addEventListener('click', surprise);
addEventListener('storage', () => { // another tab changed something
  applyTheme();
  syncThemeButton();
  if (!D) return;
  syncLists();
  document.querySelectorAll('[data-vid]').forEach(paint);
  const page = route().page;
  if (['later', 'watched', 'liked', 'playlists', 'settings'].includes(page)) render(); // not the video page, which would restart the player
});
document.addEventListener('click', e => {
  if (closeSaveMenu && !e.target.closest('.save-wrap')) closeSaveMenu(false);
});
addEventListener('blur', () => { // a click into the player never reaches this document
  if (closeSaveMenu && document.activeElement && document.activeElement.tagName === 'IFRAME') closeSaveMenu(false);
});

$('menu').addEventListener('click', () => {
  if (wideScreen.matches) {
    collapsed = !collapsed;
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? 'rail' : 'full'); } catch { /* storage full or blocked */ }
    syncShell();
  } else openDrawer();
});
$('menu-close').addEventListener('click', () => closeDrawer(true));
$('scrim').addEventListener('click', () => closeDrawer(true));
side.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (a) closeDrawer(a.getAttribute('href') === (location.hash || '#/'));
});
wideScreen.addEventListener('change', () => { closeDrawer(false); syncShell(); });
$('skip').addEventListener('click', e => { // a real jump to #view would be read as a route
  e.preventDefault();
  view.focus();
});
$('theme').addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
systemDark.addEventListener('change', () => { applyTheme(); syncThemeButton(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (drawerOpen) closeDrawer(true);
    else if (closeSaveMenu) closeSaveMenu(true);
    else if (filtersOpen && $('filters-panel')) { setFiltersOpen(false); $('filters-btn').focus(); }
  } else if (e.key === 'Tab' && drawerOpen) {
    trapTab(e);
  } else if (e.key === '/' && !drawerOpen && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input, textarea, select, [contenteditable]')) {
    e.preventDefault();
    search.focus();
    search.select();
  } else if (e.key === '?' && !drawerOpen && !e.ctrlKey && !e.metaKey && !e.altKey && !e.target.closest('input, textarea, select, [contenteditable]')) {
    location.hash = '#/about';
  }
});

document.querySelectorAll('[data-icon]').forEach(el => el.prepend(icon(el.dataset.icon)));
syncThemeButton();
syncShell();

fetch('data/videos.json')
  .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
  .then(data => {
    D = data;
    byVid = new Map(D.videos.map(v => [v.v, v]));
    D.latest = Math.max(...D.videos.map(v => monthIndex(v.lm)));
    syncLists();
    try { for (const [id, memo] of JSON.parse(sessionStorage.getItem(MEMO_KEY)) || []) memos.set(id, memo); } catch { /* none saved */ }
    const memo = ensureEntry();
    filtersOpen = !!(memo && memo.open);
    render(memo);
    scrollTo(0, memo ? memo.y : 0);
  })
  .catch(err => {
    view.replaceChildren(h('p', { className: 'note' }, `Could not load the videos (${err.message})`));
  });

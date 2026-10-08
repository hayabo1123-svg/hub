const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WMO = {0:'快晴',1:'晴れ',2:'一部曇り',3:'曇り',45:'霧',48:'着氷霧',51:'弱い霧雨',53:'霧雨',55:'強い霧雨',61:'小雨',63:'雨',65:'大雨',71:'小雪',73:'雪',75:'大雪',80:'にわか雨',81:'にわか雨',82:'激しいにわか雨',95:'雷雨',96:'雷雨(雹)',99:'激しい雷雨'};
const WICON = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌦️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',96:'⛈️',99:'⛈️'};

/* ---------- 時計 ---------- */
function tick(){
  const n = new Date();
  document.querySelectorAll('[data-clock]').forEach(el => el.textContent = n.toLocaleTimeString('ja-JP', {hour12:false}));
  document.querySelectorAll('[data-date]').forEach(el => el.textContent = n.toLocaleDateString('ja-JP', {year:'numeric',month:'long',day:'numeric',weekday:'long'}));
  document.querySelectorAll('[data-tz]').forEach(el => el.textContent = n.toLocaleTimeString('ja-JP', {timeZone: el.dataset.tz, hour12:false}));
}
setInterval(tick, 1000);

/* ---------- 位置・天気 ---------- */
let geo = null;
function getPos(){
  const fb = {lat:34.6937, lon:135.5023, name:'大阪（既定）'};
  return new Promise(res => {
    if (geo) return res(geo);
    if (!navigator.geolocation) return res(fb);
    navigator.geolocation.getCurrentPosition(
      p => res(geo = {lat:p.coords.latitude, lon:p.coords.longitude, name:'現在地'}),
      () => res(fb),
      {timeout:5000, maximumAge:600000}
    );
  });
}
async function loadWeather(){
  const p = await getPos();
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('weather');
  return {p, d: await r.json()};
}

/* ---------- Steam ---------- */
const STEAM = 'https://store.steampowered.com/api/featuredcategories/?cc=jp&l=japanese';
async function loadSteam(){
  const r = await fetch('https://corsproxy.io/?' + encodeURIComponent(STEAM));
  if (!r.ok) throw new Error('steam');
  return r.json();
}
function gameGrid(items){
  if (!items.length) return '<span class="muted">データがありません</span>';
  return items.map(g => {
    const img = g.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${g.id}/header.jpg`;
    const price = g.final_price == null ? '' : (g.final_price === 0 ? '無料' : '¥' + Number(g.final_price).toLocaleString());
    return `<a class="item fade-in" target="_blank" rel="noopener" href="https://store.steampowered.com/app/${g.id}">
      <img loading="lazy" src="${esc(img)}" alt="">
      <div><div style="font-size:14px;font-weight:600">${esc(g.name)}</div>
      <div class="row" style="margin-top:6px">${g.discount_percent ? `<span class="disc">-${g.discount_percent}%</span>` : ''}<span class="muted">${price}</span></div></div></a>`;
  }).join('');
}

/* ---------- ルーティング ---------- */
let timers = [];
const clearTimers = () => { timers.forEach(clearInterval); timers = []; };
const routes = {home: renderHome, weather: renderWeather, games: renderGames, search: renderSearch, tools: renderTools};

function route(){
  clearTimers();
  const r = (location.hash.replace(/^#\/?/, '') || 'home').split('/')[0];
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === r));
  const v = $('#view');
  v.innerHTML = '';
  (routes[r] || renderHome)(v);
  tick();
}

/* ---------- ホーム ---------- */
function renderHome(v){
  v.innerHTML = `
  <section class="glass wide">
    <div class="muted" data-date></div>
    <div class="big" data-clock></div>
    <div class="row muted" style="margin-top:8px;gap:18px">
      <span>🇯🇵 東京 <b data-tz="Asia/Tokyo"></b></span>
      <span>🇺🇸 NY <b data-tz="America/New_York"></b></span>
      <span>🇬🇧 ロンドン <b data-tz="Europe/London"></b></span>
    </div>
  </section>
  <section class="glass" style="animation-delay:.1s"><h2>🌤️ 天気</h2><div id="hw" class="muted">読み込み中…</div></section>
  <section class="glass" style="animation-delay:.2s"><h2>🎮 Steam セール</h2><div id="hg" class="grid-items" style="grid-template-columns:1fr 1fr"><span class="muted">読み込み中…</span></div></section>
  <section class="glass wide" style="animation-delay:.3s"><h2>⚡ クイックアクセス</h2>
    <div class="grid-items">
      ${[['weather','天気'],['games','ゲーム'],['search','検索'],['tools','ツール']].map(([h,t]) => `<a class="item" href="#/${h}"><div style="font-weight:600;text-align:center;padding:18px">${t}</div></a>`).join('')}
    </div></section>`;
  loadWeather().then(({p, d}) => {
    const c = d.current;
    $('#hw').innerHTML = `<div style="display:flex;align-items:center;gap:12px"><div style="font-size:44px">${WICON[c.weather_code]||'🌡️'}</div>
      <div><div class="big" style="font-size:40px">${Math.round(c.temperature_2m)}°C</div>
      <div class="muted">${WMO[c.weather_code]||''} ・ ${p.name}</div></div></div>`;
  }).catch(() => { $('#hw').innerHTML = '<span class="err">天気を取得できませんでした</span>'; });
  loadSteam().then(d => { $('#hg').innerHTML = gameGrid((d.specials?.items || []).slice(0, 4)); })
    .catch(() => { $('#hg').innerHTML = '<span class="err">Steamの情報を取得できませんでした</span>'; });
}

/* ---------- 天気 ---------- */
async function renderWeather(v){
  v.innerHTML = `<section class="glass wide fade-in"><h2>🌤️ 天気予報</h2><div id="wb" class="muted">取得中…</div></section>`;
  try {
    const {p, d} = await loadWeather();
    const c = d.current;
    $('#wb').innerHTML = `
      <div class="big">${WICON[c.weather_code]||''} ${Math.round(c.temperature_2m)}°C</div>
      <p class="muted" style="margin-top:6px">${p.name} ・ ${WMO[c.weather_code]||''} ・ 体感 ${Math.round(c.apparent_temperature)}°C ・ 湿度 ${c.relative_humidity_2m}% ・ 風 ${c.wind_speed_10m} km/h</p>
      <div class="days">${d.daily.time.map((t, i) => `
        <div class="day" style="animation-delay:${i*.06}s">
          <div class="muted">${new Date(t + 'T00:00').toLocaleDateString('ja-JP', {weekday:'short', month:'numeric', day:'numeric'})}</div>
          <div style="font-size:28px;margin:4px 0">${WICON[d.daily.weather_code[i]]||''}</div>
          <div>${Math.round(d.daily.temperature_2m_max[i])}° <span class="muted">${Math.round(d.daily.temperature_2m_min[i])}°</span></div>
          <div class="muted">☔ ${d.daily.precipitation_probability_max[i] ?? 0}%</div>
        </div>`).join('')}</div>`;
  } catch {
    $('#wb').innerHTML = '<span class="err">天気データを取得できませんでした</span>';
  }
}

/* ---------- ゲーム ---------- */
async function renderGames(v){
  v.innerHTML = `<section class="glass wide fade-in"><h2>🎮 Steam ゲーム情報</h2>
    <div class="row" id="tabs" style="margin-bottom:14px">
      <button data-k="specials">セール</button>
      <button data-k="top_sellers" class="ghost">売上上位</button>
      <button data-k="new_releases" class="ghost">新作</button>
    </div>
    <div id="gl" class="grid-items"><span class="muted">読み込み中…</span></div></section>`;
  let cache = null;
  const show = async k => {
    $('#gl').innerHTML = '<span class="muted">読み込み中…</span>';
    try {
      cache = cache || await loadSteam();
      $('#gl').innerHTML = gameGrid((cache[k]?.items || []).slice(0, 24));
    } catch {
      $('#gl').innerHTML = '<span class="err">Steamのデータを取得できませんでした。時間をおいて再度お試しください。</span>';
    }
  };
  $('#tabs').onclick = e => {
    const k = e.target.dataset.k;
    if (!k) return;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('ghost', b !== e.target));
    show(k);
  };
  show('specials');
}

/* ---------- 検索 ---------- */
function renderSearch(v){
  v.innerHTML = `
  <section class="glass wide fade-in"><h2>🔍 検索</h2>
    <form id="sf" class="row">
      <input id="q" placeholder="キーワードを入力" style="flex:1;min-width:200px">
      <select id="en" style="width:auto">
        <option value="g">Google</option><option value="d">DuckDuckGo</option><option value="b">Bing</option>
        <option value="y">YouTube</option><option value="s">Steam</option>
      </select>
      <button>検索</button>
    </form>
  </section>
  <section class="glass wide" id="res" style="animation-delay:.1s"><h2>📚 Wikipedia（日本語）</h2><div class="muted">キーワードを入力すると候補を表示します</div></section>`;
  const urls = {
    g: q => 'https://www.google.com/search?q=' + q,
    d: q => 'https://duckduckgo.com/?q=' + q,
    b: q => 'https://www.bing.com/search?q=' + q,
    y: q => 'https://www.youtube.com/results?search_query=' + q,
    s: q => 'https://store.steampowered.com/search/?term=' + q
  };
  $('#sf').onsubmit = e => {
    e.preventDefault();
    const q = $('#q').value.trim();
    if (!q) return;
    window.open(urls[$('#en').value](encodeURIComponent(q)), '_blank', 'noopener');
    wiki(q);
  };
}
async function wiki(q){
  const box = $('#res');
  box.innerHTML = '<h2>📚 Wikipedia（日本語）</h2><span class="muted">検索中…</span>';
  try {
    const r = await fetch(`https://ja.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=8&format=json&origin=*`);
    const [, titles, descs, links] = await r.json();
    box.innerHTML = '<h2>📚 Wikipedia（日本語）</h2>' + (titles.length
      ? `<div class="grid-items">${titles.map((t, i) => `
          <a class="item fade-in" target="_blank" rel="noopener" href="${esc(links[i])}"><div>
            <b>${esc(t)}</b><div class="muted" style="margin-top:4px">${esc(descs[i] || 'Wikipediaの記事を開く')}</div>
          </div></a>`).join('')}</div>`
      : '<span class="muted">該当する記事がありません</span>');
  } catch {
    box.innerHTML = '<h2>📚 Wikipedia（日本語）</h2><span class="err">検索に失敗しました</span>';
  }
}

/* ---------- ツール ---------- */
function renderTools(v){
  v.innerHTML = `
  <section class="glass fade-in"><h2>⏱️ ストップウォッチ</h2>
    <div class="big" id="sw">00:00.00</div>
    <div class="row" style="margin-top:12px"><button id="swb">開始</button><button id="swr" class="ghost">リセット</button></div></section>

  <section class="glass fade-in" style="animation-delay:.05s"><h2>⏳ タイマー</h2>
    <div class="row"><input id="tm" type="number" min="1" value="5" style="width:110px"><span class="muted">分</span><button id="tb">スタート</button></div>
    <div class="big" id="tt" style="margin-top:12px">05:00</div></section>

  <section class="glass fade-in" style="animation-delay:.1s"><h2>🔐 パスワード生成</h2>
    <div class="row"><input id="pl" type="number" value="16" min="6" max="64" style="width:110px"><button id="pg">生成</button></div>
    <p id="pw" style="margin-top:12px;word-break:break-all;font-family:ui-monospace,monospace"></p></section>

  <section class="glass fade-in" style="animation-delay:.15s"><h2>📐 単位変換</h2>
    <div class="row"><input id="uv" type="number" value="1" style="flex:1">
      <select id="ut" style="flex:1">
        <option value="km:mi">km → マイル</option><option value="mi:km">マイル → km</option>
        <option value="kg:lb">kg → ポンド</option><option value="c:f">℃ → ℉</option><option value="f:c">℉ → ℃</option>
      </select></div>
    <p class="big" id="ur" style="font-size:32px;margin-top:12px">-</p></section>

  <section class="glass fade-in" style="animation-delay:.2s"><h2>🎲 ランダム選択</h2>
    <textarea id="ch" rows="4" placeholder="1行に1項目">はい
いいえ
保留</textarea>
    <div class="row" style="margin-top:10px"><button id="rb">選ぶ</button><span id="rr" class="big" style="font-size:24px"></span></div></section>

  <section class="glass fade-in" style="animation-delay:.25s"><h2>📝 メモ</h2>
    <textarea id="memo" rows="6" placeholder="自動保存されます（この端末のみ）"></textarea></section>

  <section class="glass fade-in" style="animation-delay:.3s"><h2>🎨 表示テーマ</h2>
    <p class="muted">${matchMedia('(prefers-color-scheme: dark)').matches ? 'ダーク' : 'ライト'}テーマ（端末の設定に自動追従します）</p></section>`;

  // ストップウォッチ
  let elapsed = 0, t0 = 0, swI = null;
  const fmt = ms => {
    const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`;
  };
  $('#swb').onclick = e => {
    if (swI) { clearInterval(swI); swI = null; elapsed += Date.now() - t0; e.target.textContent = '再開'; return; }
    t0 = Date.now();
    swI = setInterval(() => { const el = $('#sw'); if (el) el.textContent = fmt(elapsed + Date.now() - t0); }, 30);
    timers.push(swI);
    e.target.textContent = '停止';
  };
  $('#swr').onclick = () => { clearInterval(swI); swI = null; elapsed = 0; $('#sw').textContent = '00:00.00'; $('#swb').textContent = '開始'; };

  // タイマー
  let tmI = null;
  $('#tb').onclick = () => {
    if (tmI) { clearInterval(tmI); tmI = null; $('#tb').textContent = 'スタート'; return; }
    const end = Date.now() + Math.max(1, +$('#tm').value || 1) * 60000;
    tmI = setInterval(() => {
      const r = Math.max(0, end - Date.now());
      const s = Math.ceil(r / 1000);
      $('#tt').textContent = `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      if (r <= 0) {
        clearInterval(tmI); tmI = null;
        $('#tb').textContent = 'スタート';
        $('#tt').classList.add('done');
        navigator.vibrate?.([300, 150, 300]);
      }
    }, 200);
    timers.push(tmI);
    $('#tt').classList.remove('done');
    $('#tb').textContent = '停止';
  };

  // パスワード
  $('#pg').onclick = () => {
    const n = Math.min(64, Math.max(6, +$('#pl').value || 16));
    const cs = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*+-=?@';
    const a = new Uint32Array(n);
    crypto.getRandomValues(a);
    $('#pw').textContent = [...a].map(x => cs[x % cs.length]).join('');
  };

  // 単位変換
  const conv = () => {
    const v = +$('#uv').value;
    const m = {
      'km:mi': x => x * 0.621371, 'mi:km': x => x * 1.60934,
      'kg:lb': x => x * 2.20462, 'c:f': x => x * 9/5 + 32, 'f:c': x => (x - 32) * 5/9
    };
    $('#ur').textContent = isNaN(v) ? '-' : (Math.round(m[$('#ut').value](v) * 10000) / 10000).toLocaleString();
  };
  $('#uv').oninput = conv; $('#ut').onchange = conv; conv();

  // ランダム
  $('#rb').onclick = () => {
    const items = $('#ch').value.split('\n').map(s => s.trim()).filter(Boolean);
    $('#rr').textContent = items.length ? items[Math.floor(Math.random() * items.length)] : '-';
  };

  // メモ
  const memo = $('#memo');
  try { memo.value = localStorage.getItem('hub-memo') || ''; } catch {}
  memo.oninput = () => { try { localStorage.setItem('hub-memo', memo.value); } catch {} };
}

addEventListener('hashchange', route);
if (!location.hash) location.hash = '#/home';
route();

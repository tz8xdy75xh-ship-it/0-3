const version = 'v0.3 full ready (demo)';
document.getElementById('versionTag').textContent = version;
const API = (p, opts={}) => fetch(p, Object.assign({ headers: { 'Content-Type': 'application/json' }}, opts)).then(r=>r.json());
const listEl = document.getElementById('list');

function fmtJPY(n){ return new Intl.NumberFormat('ja-JP', {style:'currency', currency:'JPY'}).format(n); }

async function load(){
  const items = await API('/api/items');
  listEl.innerHTML = items.map(i => `
    <div class="card">
      <h3>${i.title}</h3>
      <div class="price">${fmtJPY(i.price)}</div>
      <div class="toolbar">
        <button data-id="${i.id}" class="detail">詳細</button>
        <button data-id="${i.ownerId}" class="profile">出品者</button>
        <button data-id="${i.id}" class="chat">チャット</button>
        <button data-id="${i.id}" class="reserve">予約</button>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.detail').forEach(b => b.onclick = () => openDetail(b.dataset.id));
  document.querySelectorAll('.profile').forEach(b => b.onclick = () => openProfile(b.dataset.id));
  document.querySelectorAll('.chat').forEach(b => b.onclick = () => openChat(b.dataset.id));
  document.querySelectorAll('.reserve').forEach(b => b.onclick = () => openReserve(b.dataset.id));
}

async function openDetail(id){
  const i = await API(`/api/items/${id}`);
  showModal(`
    <h2>${i.title}</h2>
    <p>${i.description || ''}</p>
    <p><b>価格</b>: ${fmtJPY(i.price)} / <b>状態</b>: ${i.condition||'—'}</p>
    <div class="toolbar">
      <button id="buyBtn">購入（デモ）</button>
      <button id="closeBtn2">閉じる</button>
    </div>
  `);
  document.getElementById('buyBtn').onclick = async () => { await API('/api/orders', { method:'POST', body: JSON.stringify({ itemId: id })}); alert('購入OK'); hideModal(); load(); };
  document.getElementById('closeBtn2').onclick = () => hideModal();
}

async function openProfile(userId){
  const u = await API(`/api/users/${userId}`);
  const avg = u.reviews.length ? (u.reviews.reduce((a,b)=>a+b.rating,0)/u.reviews.length).toFixed(1) : '—';
  const trust = await API(`/api/users/${userId}/trust`);
  showModal(`
    <h2>${u.avatar} ${u.name} — 信頼スコア: <b>${trust.score}</b></h2>
    <p>レビュー数：${u.reviews.length} / 平均：${avg}</p>
    <h3>レビューを書く</h3>
    <div class="toolbar">
      <input id="rating" type="number" min="1" max="5" value="5" />
      <input id="comment" placeholder="コメント（任意）"/>
      <button id="postReview">投稿</button>
    </div>
    <h3>レビュー</h3>
    <div>${u.reviews.map(r=>`★${'★'.repeat(r.rating-1)} ${r.comment||''}`).join('<br>')}</div>
  `);
  document.getElementById('postReview').onclick = async () => {
    const rating = Number(document.getElementById('rating').value||5);
    const comment = document.getElementById('comment').value||'';
    await API(`/api/users/${userId}/reviews`, { method:'POST', body: JSON.stringify({ rating, comment })});
    hideModal(); openProfile(userId);
  };
}

async function openChat(itemId){
  const threadId = Number(itemId);
  const msgs = await API(`/api/chats/${threadId}`);
  showModal(`
    <h2>チャット（スレッド #${threadId}）</h2>
    <div id="msgs" style="max-height:40vh;overflow:auto;border:1px solid #eee;padding:8px;margin-bottom:8px">
      ${msgs.map(m=>`<div>「${m.text}」</div>`).join('')}
    </div>
    <div class="toolbar">
      <input id="chatText" placeholder="メッセージ…" />
      <button id="send">送信</button>
    </div>
  `);
  document.getElementById('send').onclick = async () => {
    const text = document.getElementById('chatText').value.trim();
    if(!text) return;
    await API('/api/chats', { method:'POST', body: JSON.stringify({ threadId, from: 1, to: 2, text })});
    hideModal(); openChat(itemId);
  };
}

async function openReserve(itemId){
  const list = await API(`/api/reservations?itemId=${itemId}`);
  showModal(`
    <h2>予約（デモ）</h2>
    <p>既存予約：${list.length}件</p>
    <div>${list.map(r=>`<div>${r.startDate} → ${r.endDate}</div>`).join('') || 'なし'}</div>
    <h3>新規予約</h3>
    <div class="toolbar">
      <input id="start" type="date" />
      <input id="end" type="date" />
      <button id="reserveBtn">予約する</button>
    </div>
  `);
  document.getElementById('reserveBtn').onclick = async () => {
    const startDate = document.getElementById('start').value;
    const endDate = document.getElementById('end').value;
    if(!startDate || !endDate) return alert('日付を入れて');
    const res = await API('/api/reservations', { method:'POST', body: JSON.stringify({ itemId: Number(itemId), startDate, endDate })});
    if(res.error) alert(res.error); else alert('予約OK');
    hideModal(); openReserve(itemId);
  };
}

// modal helpers
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeBtn = document.getElementById('closeModal');
function showModal(html){ modalBody.innerHTML = html; modal.style.display = 'flex'; }
function hideModal(){ modal.style.display = 'none'; }
closeBtn.onclick = hideModal;

// create item
const formEl = document.getElementById('newForm');
formEl.onsubmit = async (e) => {
  e.preventDefault();
  const fd = new FormData(formEl);
  const body = Object.fromEntries(fd.entries());
  body.price = Number(body.price);
  await API('/api/items', { method:'POST', body: JSON.stringify(body)});
  formEl.reset(); load();
};

load();

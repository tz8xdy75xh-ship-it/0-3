
// Config
const CLOUD_NAME = "demo";              // ここを自分のCloudinary Cloud nameに
const UPLOAD_PRESET = "unsigned_preset";// ここを自分のUpload presetに
const DEFAULT_PAYMENT_URL = "https://buy.stripe.com/test_00000000000000";

const $ = s=>document.querySelector(s);
const elList = $('#list');
const state = { items: [], user: null };

function loadLS(k,f){ try{return JSON.parse(localStorage.getItem(k))??f}catch(e){return f} }
function saveLS(k,v){ localStorage.setItem(k, JSON.stringify(v)) }
function yen(n){ const v=Number(n||0); return isFinite(v)?v.toLocaleString():n }

function renderList(){
  if(!state.items.length){
    elList.innerHTML = `<div class="card"><div class="card-title">まだ出品がありません</div><div class="card-desc">上のフォームから出品してみよう。</div></div>`;
    return;
  }
  elList.innerHTML = state.items.map((it,i)=>`
    <div class="card" data-idx="${i}">
      <div class="card-head">
        <div class="card-thumb">${it.image?`<img src="${it.image}" alt="">`:''}</div>
        <div>
          <div class="card-title">${it.title}</div>
          <div class="card-meta">
            <span class="price">¥${yen(it.price_per_week)}/週</span>
            <span>状態:${it.condition||'-'}</span>
          </div>
          <div class="badges">
            <span class="badge">${it.category||'ファッション'}</span>
            <span class="badge">${(it.owner&&it.owner.pref)?it.owner.pref:(it.location||'')}</span>
          </div>
        </div>
      </div>
      <div class="card-desc">${(it.description||'').slice(0,120)}</div>
      <div class="row" style="gap:8px;margin-top:10px">
        <button class="btn ghost" onclick="viewItem(${i})">詳細</button>
        <a class="btn primary" href="${it.payment_url||DEFAULT_PAYMENT_URL}" target="_blank" rel="noopener">支払う</a>
      </div>
    </div>`).join('');
}

window.viewItem = (i)=>{
  const it = state.items[i];
  alert(`【${it.title}}\n価格: ¥${yen(it.price_per_week)}/週\n状態: ${it.condition||'-'}\n説明: ${(it.description||'')}`);
};

$('#btnSearch').onclick = ()=>{
  const q = $('#q').value.trim().toLowerCase();
  document.querySelectorAll('#list .card').forEach(card=>{
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(q) ? '' : 'none';
  });
};

$('#formNew').addEventListener('submit', e=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const item = Object.fromEntries(fd.entries());
  item.id = Date.now();
  item.image = $('#preview').src || '';
  item.payment_url = DEFAULT_PAYMENT_URL;
  item.owner = state.user;
  state.items.unshift(item);
  saveLS('items', state.items);
  renderList();
  e.target.reset();
  $('#preview').style.display='none';
  window.scrollTo({top:0,behavior:'smooth'});
});

document.getElementById('btnUpload').onclick = async ()=>{
  const f = document.getElementById('file').files[0];
  if(!f) return alert('画像を選んでね');
  const fd = new FormData();
  fd.append('file', f);
  fd.append('upload_preset', UPLOAD_PRESET);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {method:'POST', body:fd});
  const j = await r.json();
  if(!j.secure_url){ console.log(j); return alert('アップロード失敗'); }
  const img = document.getElementById('preview');
  img.src = j.secure_url; img.style.display='block';
};

const PREFS = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
function openProfileModal(){ document.getElementById('modalProfile').classList.add('show') }
function closeProfileModal(){ document.getElementById('modalProfile').classList.remove('show') }
document.getElementById('btnProfile').onclick = openProfileModal;
document.getElementById('btnCloseModal').onclick = closeProfileModal;
function initPrefOptions(){ const sel = document.getElementById('pref'); sel.innerHTML = PREFS.map(p=>`<option value="${p}">${p}</option>`).join(''); }
document.getElementById('formProfile').addEventListener('submit', e=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const u = Object.fromEntries(fd.entries());
  u.age = Number(u.age||0);
  state.user = u;
  saveLS('user', state.user);
  closeProfileModal();
  alert('プロフィールを保存しました');
});

function init(){
  initPrefOptions();
  state.items = loadLS('items', [
    {id:1,title:'ナイキ ダンク Low',price_per_week:5000,condition:'A',description:'27cm・箱あり・美品',image:'https://picsum.photos/seed/shoe1/600',payment_url:DEFAULT_PAYMENT_URL,owner:{display_name:'デモ',age:24,pref:'東京都'}},
    {id:2,title:'ZARA ノーカラーコート',price_per_week:4000,condition:'B',description:'Mサイズ・1シーズン使用',image:'https://picsum.photos/seed/coat/600',payment_url:DEFAULT_PAYMENT_URL,owner:{display_name:'デモ2',age:22,pref:'大阪府'}}
  ]);
  state.user = loadLS('user', null);
  if(!state.user){ setTimeout(openProfileModal, 400); }
  renderList();
}
init();

document.getElementById('fab').onclick = ()=>window.scrollTo({top:0,behavior:'smooth'});

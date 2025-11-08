/***** Cloudinary 設定：あなたの値に置き換えてください *****/
const CLOUD_NAME    = 'YOUR_CLOUD_NAME';   // 例: 'demo'
const UPLOAD_PRESET = 'unsigned_mvp';       // Cloudinaryで作成したunsignedプリセット名
/************************************************************/

const $ = (id) => document.getElementById(id);

// MVP用：localStorageに保存
const KEY = 'mvp_items_v03';
const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

// デモを初回だけ投入
function seed() {
  const data = load();
  if (data.length === 0) {
    save([
      { id: crypto.randomUUID(), name: 'Nike Hoodie',     price: 3500,  condition: '良い', desc: '定番フーディ',         image: '' },
      { id: crypto.randomUUID(), name: 'GoPro HERO9',     price: 15000, condition: '普通', desc: '週末レンタルに最適',   image: '' },
      { id: crypto.randomUUID(), name: 'スーツケース 65L', price: 2800,  condition: '良い', desc: '3〜4泊向け',          image: '' }
    ]);
  }
}
seed();

let currentImageUrl = '';

// Cloudinary アップロード
async function uploadImage(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) throw new Error('Cloudinary設定が未入力です');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const r = await fetch(url, { method: 'POST', body: fd });
  if (!r.ok) throw new Error('upload failed');
  const data = await r.json();
  return data.secure_url;
}

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const f = document.getElementById('imageFile').files?.[0];
  if (!f) return alert('画像を選んでください');
  document.getElementById('uploadStatus').textContent = 'アップロード中…';
  try {
    currentImageUrl = await uploadImage(f);
    document.getElementById('uploadStatus').textContent = 'アップロード完了 ✅';
    document.getElementById('preview').innerHTML = `<img src="${currentImageUrl}" alt="">`;
  } catch (e) {
    console.error(e);
    document.getElementById('uploadStatus').textContent = 'アップロード失敗';
  }
});

// 出品
document.getElementById('createBtn').addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  const price = Number(document.getElementById('price').value);
  const condition = document.getElementById('condition').value.trim();
  const desc = document.getElementById('desc').value.trim();
  if (!name || !price) return alert('商品名と価格は必須です');

  const items = load();
  items.unshift({
    id: crypto.randomUUID(),
    name, price, condition, desc,
    image: currentImageUrl || ''
  });
  save(items);

  // クリア
  document.getElementById('name').value = '';
  document.getElementById('price').value = '';
  document.getElementById('condition').value = '';
  document.getElementById('desc').value = '';
  document.getElementById('imageFile').value = '';
  currentImageUrl = '';
  document.getElementById('uploadStatus').textContent = '';
  document.getElementById('preview').innerHTML = '';

  render();
});

// 一覧
function render() {
  const items = load();
  const list = document.getElementById('list');
  list.innerHTML = '';

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'card';
    const img = item.image ? `<img class="card-img" src="${item.image}" alt="">` : '';
    el.innerHTML = `
      ${img}
      <h3>${item.name}</h3>
      <p>¥${Number(item.price).toLocaleString()}</p>
      <div class="row">
        <button class="secondary" data-act="detail" data-id="${item.id}">詳細</button>
        <button class="secondary" data-act="seller" data-id="${item.id}">出品者</button>
        <button class="secondary" data-act="chat"   data-id="${item.id}">チャット</button>
        <button class="primary"   data-act="buy"    data-id="${item.id}">購入</button>
      </div>
    `;
    list.appendChild(el);
  });

  // 決済
  list.querySelectorAll('button[data-act="buy"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const item = load().find(x => x.id === id);
      if (!item) return;
      try {
        const r = await fetch('/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemName: item.name, priceYen: Number(item.price) })
        });
        const data = await r.json();
        if (data.url) window.location.href = data.url;
        else alert('決済開始に失敗しました');
      } catch (err) {
        console.error(err);
        alert('サーバーと通信できませんでした');
      }
    });
  });
}

render();

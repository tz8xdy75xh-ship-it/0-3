const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// In-memory mock DB
let nextId = 4;
const users = [
  { id: 1, name: "Alice", avatar: "👩", reviews: [], completedOrders: 0, cancellations: 0 },
  { id: 2, name: "Bob", avatar: "👨", reviews: [], completedOrders: 0, cancellations: 0 },
  { id: 3, name: "Admin", avatar: "🧑‍💼", reviews: [], completedOrders: 0, cancellations: 0, role: "admin" }
];

const items = [
  { id: 1, title: "Nike Hoodie", price: 3500, condition: "良い", ownerId: 1, description: "サイズM・1シーズン使用", images: [], status: "active" },
  { id: 2, title: "GoPro HERO9", price: 15000, condition: "とても良い", ownerId: 2, description: "付属品あり", images: [], status: "active" },
  { id: 3, title: "スーツケース 65L", price: 2800, condition: "普通", ownerId: 1, description: "出張で2回使用", images: [], status: "active" }
];

const orders = [];
const chats = [];
const reservations = [];

// Utility
function findUser(id) { return users.find(u => u.id === Number(id)); }
function findItem(id) { return items.find(i => i.id === Number(id)); }

// Items
app.get('/api/items', (req, res) => {
  res.json(items);
});

app.get('/api/items/:id', (req, res) => {
  const item = findItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'item not found' });
  res.json(item);
});

app.post('/api/items', (req, res) => {
  const { title, price, description, condition = "不明", ownerId = 1 } = req.body || {}
  if (!title || price == null) return res.status(400).json({ error: 'title and price required' });
  const item = { id: nextId++, title, price: Number(price), description: description||"", condition, ownerId, images: [], status: "active" };
  items.push(item);
  res.status(201).json(item);
});

// Purchase (simulate)
app.post('/api/orders', (req, res) => {
  const { itemId, buyerId = 2 } = req.body || {}
  const item = findItem(itemId);
  if (!item) return res.status(404).json({ error: 'item not found' });
  if (item.status !== 'active') return res.status(400).json({ error: 'already sold or reserved' });
  item.status = 'sold';
  const order = { id: orders.length + 1, itemId: item.id, buyerId, sellerId: item.ownerId, createdAt: Date.now() };
  orders.push(order);
  const seller = findUser(item.ownerId);
  if (seller) seller.completedOrders += 1;
  res.status(201).json(order);
});

// Chat endpoints
app.get('/api/chats/:threadId', (req,res)=>{ const threadId=Number(req.params.threadId); const msgs=chats.filter(m=>m.threadId===threadId); res.json(msgs); });
app.post('/api/chats', (req,res)=>{ const {threadId=1, from=1, to=2, text=''}=req.body||{}; if(!text) return res.status(400).json({error:'text required'}); const msg={id:chats.length+1,threadId,from,to,text,ts:Date.now()}; chats.push(msg); res.status(201).json(msg); });

// Profiles & reviews
app.get('/api/users/:id', (req,res)=>{ const u=findUser(req.params.id); if(!u) return res.status(404).json({error:'user not found'}); res.json(u); });
app.post('/api/users/:id/reviews', (req,res)=>{ const u=findUser(req.params.id); if(!u) return res.status(404).json({error:'user not found'}); const {rating=5, comment=''}=req.body||{}; const r={id:u.reviews.length+1,rating,comment,ts:Date.now()}; u.reviews.push(r); res.status(201).json(r); });

// Reservations (very simple demo)
app.get('/api/reservations', (req,res)=>{ const itemId=Number(req.query.itemId); const r = itemId? reservations.filter(x=>x.itemId===itemId): reservations; res.json(r); });
app.post('/api/reservations', (req,res)=>{ const {itemId,startDate,endDate,userId=2}=req.body||{}; const item=findItem(itemId); if(!item) return res.status(404).json({error:'item not found'});
    // naive overlap check
    const overlap = reservations.some(r=> r.itemId===itemId && !(new Date(endDate)<=new Date(r.startDate) || new Date(startDate)>=new Date(r.endDate)));
    if(overlap) return res.status(400).json({error:'date overlap'});
    const r={id:reservations.length+1,itemId,startDate,endDate,userId}; reservations.push(r); item.status='reserved'; res.status(201).json(r);
});

// Trust score (toy)
app.get('/api/users/:id/trust', (req,res)=>{ const u=findUser(req.params.id); if(!u) return res.status(404).json({error:'user not found'});
    const avg = u.reviews.length? (u.reviews.reduce((a,b)=>a+b.rating,0)/u.reviews.length):5;
    const orderFactor = Math.min(u.completedOrders,10)/10;
    const cancelFactor = 1 - Math.min(u.cancellations,5)/5;
    const score = Math.round((avg/5*0.6 + orderFactor*0.3 + cancelFactor*0.1)*100);
    res.json({score});
});


// Static
app.use(express.static(path.join(__dirname, 'public')));
// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));

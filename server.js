import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pkg from 'pg';
import Stripe from 'stripe';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({limit:'4mb'}));
app.use(express.urlencoded({extended:true}));

const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' });
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

app.use(express.static(path.join(__dirname, 'public')));

function signToken(user){ return jwt.sign({ id:user.id, email:user.email }, JWT_SECRET, { expiresIn:'30d' }); }
async function auth(req,res,next){
  const hdr = req.headers.authorization||'';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if(!token) return res.status(401).json({error:'no_token'});
  try{ req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch(e){ return res.status(401).json({error:'invalid_token'}); }
}

// ---- Auth ----
app.post('/api/register', async (req,res)=>{
  const { email,password,display_name,age,pref,city } = req.body;
  if(!email||!password||!display_name) return res.status(400).json({error:'missing_fields'});
  const hash = await bcrypt.hash(password,10);
  try{
    const r = await pool.query('insert into users(email,password_hash,display_name,age,pref,city) values($1,$2,$3,$4,$5,$6) returning id,email,display_name,age,pref,city,created_at',[email,hash,display_name,age||null,pref||null,city||null]);
    const user = r.rows[0]; const token = signToken(user); res.json({token,user});
  }catch(e){ if(e.code==='23505') return res.status(409).json({error:'email_exists'}); console.error(e); res.status(500).json({error:'server_error'}); }
});

app.post('/api/login', async (req,res)=>{
  const { email,password } = req.body;
  const r = await pool.query('select * from users where email=$1',[email]);
  const user = r.rows[0]; if(!user) return res.status(401).json({error:'invalid_credentials'});
  const ok = await bcrypt.compare(password,user.password_hash); if(!ok) return res.status(401).json({error:'invalid_credentials'});
  const token = signToken(user);
  res.json({token,user:{id:user.id,email:user.email,display_name:user.display_name,age:user.age,pref:user.pref,city:user.city}});
});

app.get('/api/me', auth, async (req,res)=>{
  const r = await pool.query('select id,email,display_name,age,pref,city,created_at from users where id=$1',[req.user.id]);
  res.json(r.rows[0]);
});

// ---- Listings ----
app.get('/api/listings', async (_req,res)=>{
  const r = await pool.query('select l.*, u.display_name as owner_name, u.pref as owner_pref from listings l left join users u on u.id=l.owner_id order by l.id desc limit 200');
  res.json(r.rows);
});
app.post('/api/listings', auth, async (req,res)=>{
  const { title,description,category,condition,price_per_week,image_url } = req.body;
  if(!title||!price_per_week) return res.status(400).json({error:'missing_fields'});
  const r = await pool.query('insert into listings(owner_id,title,description,category,condition,price_per_week,image_url) values($1,$2,$3,$4,$5,$6,$7) returning *',[req.user.id,title,description||'',category||'',condition||'',Number(price_per_week),image_url||null]);
  res.json(r.rows[0]);
});

// ---- Orders ----
app.post('/api/orders', auth, async (req,res)=>{
  const { listing_id, start_date, end_date, duration_type } = req.body;
  const lr = await pool.query('select * from listings where id=$1',[listing_id]);
  const listing = lr.rows[0]; if(!listing) return res.status(404).json({error:'listing_not_found'});
  const subtotal = listing.price_per_week;
  const orr = await pool.query('insert into orders(listing_id,renter_id,owner_id,start_date,end_date,duration_type,subtotal,status) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[listing_id,req.user.id,listing.owner_id,start_date||null,end_date||null,duration_type||'week',subtotal,'pending']);
  res.json(orr.rows[0]);
});

// Prepare checkout for an inquiry order
app.post('/api/orders/:id/prepare_checkout', auth, async (req,res)=>{
  const { id } = req.params;
  const orr = await pool.query('select * from orders where id=$1 and (renter_id=$2 or owner_id=$2)', [id, req.user.id]);
  const order = orr.rows[0]; if(!order) return res.status(404).json({error:'order_not_found'});
  const lr = await pool.query('select price_per_week, title from listings where id=$1', [order.listing_id]);
  const listing = lr.rows[0];
  const upd = await pool.query('update orders set subtotal=$1, status=$2 where id=$3 returning *', [listing.price_per_week, 'pending', id]);
  res.json({ order: upd.rows[0], title: listing.title });
});

// ---- Stripe Checkout ----
app.post('/api/checkout', auth, async (req,res)=>{
  try{
    const { order_id } = req.body;
    const orr = await pool.query('select o.*, l.title from orders o left join listings l on l.id=o.listing_id where o.id=$1',[order_id]);
    const order = orr.rows[0]; if(!order) return res.status(404).json({error:'order_not_found'});
    const session = await stripe.checkout.sessions.create({
      mode:'payment',
      payment_method_types:['card'],
      line_items:[{price_data:{currency:'jpy',unit_amount:order.subtotal*100,product_data:{name:`レンタル: ${order.title}`}},quantity:1}],
      success_url:`${process.env.PUBLIC_BASE_URL}/success.html?order=${order.id}`,
      cancel_url:`${process.env.PUBLIC_BASE_URL}/`,
      metadata:{order_id:String(order.id)}
    });
    res.json({url:session.url});
  }catch(e){ console.error(e); res.status(500).json({error:'stripe_error'}); }
});

// ---- Inbox & Messages ----
// List my threads (orders where I'm renter or owner)
app.get('/api/inbox', auth, async (req,res)=>{
  const r = await pool.query(`
    select o.*, l.title,
      case when o.renter_id=$1 then o.owner_id else o.renter_id end as peer_id,
      (select display_name from users where id = case when o.renter_id=$1 then o.owner_id else o.renter_id end) as peer_name,
      (select text from messages m where m.order_id=o.id order by m.id desc limit 1) as last_text,
      (select created_at from messages m where m.order_id=o.id order by m.id desc limit 1) as last_at
    from orders o
    join listings l on l.id=o.listing_id
    where o.renter_id=$1 or o.owner_id=$1
    order by coalesce((select created_at from messages m where m.order_id=o.id order by m.id desc limit 1), o.created_at) desc
  `, [req.user.id]);
  res.json(r.rows);
});

// Start or reuse an inquiry thread for a listing
app.post('/api/inbox/start', auth, async (req,res)=>{
  const { listing_id } = req.body;
  const lr = await pool.query('select * from listings where id=$1',[listing_id]);
  const listing = lr.rows[0]; if(!listing) return res.status(404).json({error:'listing_not_found'});
  // existing?
  const ex = await pool.query('select * from orders where listing_id=$1 and renter_id=$2 and owner_id=$3 and status=$4 limit 1',[listing_id, req.user.id, listing.owner_id, 'inquiry']);
  if(ex.rows[0]) return res.json(ex.rows[0]);
  const orr = await pool.query('insert into orders(listing_id,renter_id,owner_id,status,subtotal) values($1,$2,$3,$4,$5) returning *',[listing_id, req.user.id, listing.owner_id, 'inquiry', 0]);
  res.json(orr.rows[0]);
});

app.get('/api/messages', auth, async (req,res)=>{
  const { order_id } = req.query;
  const r = await pool.query('select * from messages where order_id=$1 order by id asc',[order_id]);
  res.json(r.rows);
});
app.post('/api/messages', auth, async (req,res)=>{
  const { order_id, receiver_id, text } = req.body;
  const r = await pool.query('insert into messages(order_id,sender_id,receiver_id,text) values($1,$2,$3,$4) returning *',[order_id, req.user.id, receiver_id, text]);
  res.json(r.rows[0]);
});

// Fallback
app.get('*', (_req,res)=>{ res.sendFile(path.join(__dirname,'public','index.html')); });

const PORT = process.env.PORT||3000;
app.listen(PORT, ()=>console.log('Server started on '+PORT));

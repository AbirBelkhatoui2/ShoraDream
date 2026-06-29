// server.cjs — COMPLET avec Cloudinary pour les images

require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const jwt        = require("jsonwebtoken");
const mongoose   = require("mongoose");
const bcrypt     = require("bcryptjs");
const multer     = require("multer");
const path       = require("path");
const fs         = require("fs");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

const PORT   = process.env.PORT   || 3001;
const SECRET = process.env.JWT_SECRET || "SECRET_KEY_TEST";

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dcjategcd",
  api_key:    process.env.CLOUDINARY_API_KEY    || "895151768939327",
  api_secret: process.env.CLOUDINARY_API_SECRET || "ZMHfYfirj56aQSbJdd7hnrXFeJo",
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch(err => console.error("❌ MongoDB:", err));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

const resetCodes    = new Map();
const registerCodes = new Map();

// ✅ Multer en mémoire (pas de stockage local)
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg","image/png","image/webp"].includes(file.mimetype))
      return cb(new Error("Format non autorisé."), false);
    cb(null, true);
  },
});

// ✅ Upload vers Cloudinary
async function uploadToCloudinary(buffer, folder = "shoradream") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

// ✅ Supprimer une image Cloudinary
async function deleteFromCloudinary(url) {
  if (!url || !url.includes("cloudinary.com")) return;
  try {
    const parts = url.split("/");
    const filename = parts[parts.length - 1].split(".")[0];
    const folder   = parts[parts.length - 2];
    const publicId = `${folder}/${filename}`;
    await cloudinary.uploader.destroy(publicId);
  } catch {}
}

//////////////////////////////////////////////////////
// MODELS
//////////////////////////////////////////////////////
const userSchema = new mongoose.Schema({
  firstName: { type: String, default: "", trim: true },
  name:      { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 40 },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  phone:     { type: String, default: "", trim: true, maxlength: 30 },
  location:  { type: String, default: "", trim: true },
  topSkills: { type: [String], default: [] },
  summary:   { type: String, default: "" },
  password:  { type: String, required: true },
  avatar:    { type: String, default: "" },
  reportCount:  { type: Number, default: 0, min: 0 },
  reportedBy:   { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  blockedUsers: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
}, { timestamps: true });

const starSchema = new mongoose.Schema({
  owner:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title:   { type: String, required: true, trim: true },
  images:  { type: [String], default: [] },
  likes:   { type: Number, default: 0, min: 0 },
  likedBy: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
}, { timestamps: true });

const annonceSchema = new mongoose.Schema({
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  location:    { type: String, default: "", trim: true },
  stars:       { type: Number, default: 0, min: 0 },
  likedBy:     { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  status:      { type: String, enum: ["active","pending","closed"], default: "active" },
  images:      { type: [String], default: [] },
}, { timestamps: true });

const besoinSchema = new mongoose.Schema({
  owner:           { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title:           { type: String, required: true, trim: true },
  description:     { type: String, default: "", trim: true },
  category:        { type: String, default: "general", trim: true },
  location:        { type: String, default: "", trim: true },
  priority:        { type: String, enum: ["low","medium","high"], default: "medium" },
  status:          { type: String, enum: ["open","closed","done"], default: "open" },
  acceptedOfferId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null },
  images:          { type: [String], default: [] },
  likes:           { type: Number, default: 0, min: 0 },
  likedBy:         { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
}, { timestamps: true });

const offerSchema = new mongoose.Schema({
  besoinId:   { type: mongoose.Schema.Types.ObjectId, ref: "Besoin", required: true, index: true },
  author:     { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true, index: true },
  authorName: { type: String, default: "Utilisateur" },
  message:    { type: String, required: true, trim: true },
  image:      { type: String, default: "" },
  accepted:   { type: Boolean, default: false },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  besoinId:   { type: mongoose.Schema.Types.ObjectId, ref: "Besoin", required: true, index: true },
  offerId:    { type: mongoose.Schema.Types.ObjectId, ref: "Offer",  default: null,  index: true },
  author:     { type: mongoose.Schema.Types.ObjectId, ref: "User",   required: true, index: true },
  authorName: { type: String, default: "Utilisateur" },
  text:       { type: String, required: true, trim: true },
}, { timestamps: true });

const favoriteSchema = new mongoose.Schema({
  owner:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: ["besoin","annonce","star"], required: true, index: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  to:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  from:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fromName:    { type: String, default: "Utilisateur" },
  type:        { type: String, enum: ["offer","like","accepted","message","report","comment"], required: true },
  targetId:    { type: mongoose.Schema.Types.ObjectId, default: null },
  targetTitle: { type: String, default: "" },
  message:     { type: String, default: "" },
  read:        { type: Boolean, default: false, index: true },
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reported: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason:   { type: String, required: true, trim: true },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

favoriteSchema.index({ owner: 1, targetType: 1, targetId: 1 }, { unique: true });
reportSchema.index({ reporter: 1, reported: 1 }, { unique: true });
notificationSchema.index({ to: 1, createdAt: -1 });

const User         = mongoose.model("User",         userSchema);
const Star         = mongoose.model("Star",         starSchema);
const Annonce      = mongoose.model("Annonce",      annonceSchema);
const Besoin       = mongoose.model("Besoin",       besoinSchema);
const Offer        = mongoose.model("Offer",        offerSchema);
const ChatMessage  = mongoose.model("ChatMessage",  messageSchema);
const Favorite     = mongoose.model("Favorite",     favoriteSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const Report       = mongoose.model("Report",       reportSchema);

//////////////////////////////////////////////////////
// HELPERS
//////////////////////////////////////////////////////
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!t) return res.status(401).json({ message: "Token manquant" });
  try { req.user = jwt.verify(t, SECRET); next(); }
  catch { return res.status(401).json({ message: "Token invalide ou expiré" }); }
}

const RL = new Map();
function rateLimit({ windowMs = 10_000, max = 12 } = {}) {
  return (req, res, next) => {
    const key = `${req.user?.id || req.ip}:${req.path}`;
    const now = Date.now();
    const cur = RL.get(key) || { count: 0, ts: now };
    if (now - cur.ts > windowMs) { cur.count = 0; cur.ts = now; }
    cur.count++;
    RL.set(key, cur);
    if (cur.count > max) return res.status(429).json({ message: "Trop de requêtes." });
    next();
  };
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

function isOid(v) { return typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v); }
function san(v, max = 200000) {
  const s = String(v ?? "").replace(/\0/g, "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

async function canAccess(uid, besoinId) {
  const b = await Besoin.findById(besoinId).lean();
  if (!b) return { ok: false, reason: "Besoin introuvable" };
  if (String(b.owner) === String(uid)) return { ok: true, besoin: b, role: "owner" };
  if (await Offer.exists({ besoinId, author: uid })) return { ok: true, besoin: b, role: "offer_author" };
  return { ok: false, reason: "Accès refusé" };
}

function withLikes(items, uid) {
  return items.map(x => ({
    ...x,
    likesCount: x.likedBy?.length || x.stars || x.likes || 0,
    liked: (x.likedBy||[]).some(id => String(id) === String(uid)),
  }));
}

//////////////////////////////////////////////////////
// BASE
//////////////////////////////////////////////////////
app.get("/",    (_, res) => res.send("OK"));
app.get("/ping",(_, res) => res.json({ ok: true }));

//////////////////////////////////////////////////////
// PROFIL PUBLIC
//////////////////////////////////////////////////////
app.get("/users/public/:id", async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const u = await User.findById(req.params.id).lean();
    if (!u) return res.status(404).json({ message: "Introuvable" });
    res.json({ user: { id: u._id, firstName: u.firstName||"", name: u.name, avatar: u.avatar||"", phone: u.phone||"", location: u.location||"", topSkills: u.topSkills||[], summary: u.summary||"", reportCount: u.reportCount||0 } });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.get("/users/:id/annonces", auth, async (req, res) => {
  try {
    const items = await Annonce.find({ owner: req.params.id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items: withLikes(items, req.user.id) });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.get("/users/:id/besoins", auth, async (req, res) => {
  try {
    const items = await Besoin.find({ owner: req.params.id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items: withLikes(items, req.user.id) });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.get("/users/:id/stars", auth, async (req, res) => {
  try {
    const items = await Star.find({ owner: req.params.id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items: withLikes(items, req.user.id) });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// LIKES
//////////////////////////////////////////////////////
app.post("/like/:type/:id", auth, async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!isOid(id)) return res.status(400).json({ message: "ID invalide" });
    const uid = new mongoose.Types.ObjectId(req.user.id);
    let doc, liked, count;
    const toggle = (arr, val) => {
      const idx = arr.findIndex(x => String(x) === String(val));
      if (idx >= 0) { arr.splice(idx, 1); return false; }
      arr.push(val); return true;
    };
    if (type === "annonce") {
      doc = await Annonce.findById(id);
      if (!doc) return res.status(404).json({ message: "Introuvable" });
      doc.likedBy = doc.likedBy || [];
      liked = toggle(doc.likedBy, uid);
      doc.stars = doc.likedBy.length;
      await doc.save(); count = doc.stars;
    } else if (type === "besoin") {
      doc = await Besoin.findById(id);
      if (!doc) return res.status(404).json({ message: "Introuvable" });
      doc.likedBy = doc.likedBy || [];
      liked = toggle(doc.likedBy, uid);
      doc.likes = doc.likedBy.length;
      await doc.save(); count = doc.likes;
    } else if (type === "star") {
      doc = await Star.findById(id);
      if (!doc) return res.status(404).json({ message: "Introuvable" });
      doc.likedBy = doc.likedBy || [];
      liked = toggle(doc.likedBy, uid);
      doc.likes = doc.likedBy.length;
      await doc.save(); count = doc.likes;
    } else return res.status(400).json({ message: "Type invalide" });
    if (liked && String(doc.owner) !== String(req.user.id)) {
      await Notification.create({ to: doc.owner, from: req.user.id, fromName: req.user?.name||"Utilisateur", type: "like", targetId: doc._id, targetTitle: doc.title||"", message: `${req.user?.name||"Quelqu'un"} a aimé votre publication` }).catch(()=>{});
    }
    res.json({ ok: true, liked, count });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// INSCRIPTION
//////////////////////////////////////////////////////
app.post("/register/send-code", loginLimiter, async (req, res) => {
  try {
    const email = san(req.body?.email||"").toLowerCase();
    if (!email) return res.status(400).json({ message: "Email requis" });
    if (await User.findOne({ email }).lean()) return res.status(400).json({ message: "Email déjà utilisé" });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    registerCodes.set(email, { code, expiresAt: Date.now() + 10*60*1000, verified: false });
    await transporter.sendMail({
      from: `"ShoraDream" <${process.env.MAIL_USER}>`, to: email,
      subject: "🌟 Ton code de vérification ShoraDream",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:28px;background:#050b2e;color:white;border-radius:18px"><h2 style="color:#8B5CF6;margin:0 0 16px">✨ ShoraDream</h2><p>Ton code :</p><div style="font-size:44px;font-weight:900;letter-spacing:10px;text-align:center;padding:24px;background:rgba(139,92,246,0.15);border:2px solid rgba(139,92,246,0.4);border-radius:16px;color:#a78bfa;margin:20px 0">${code}</div><p style="color:rgba(255,255,255,0.6);font-size:13px">Expire dans <strong style="color:white">10 minutes</strong>.</p></div>`,
    });
    res.json({ message: "Code envoyé ! Vérifie ta boîte mail 📧" });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/register/verify-code", async (req, res) => {
  try {
    const email = san(req.body?.email||"").toLowerCase();
    const code  = san(req.body?.code ||"");
    if (!email||!code) return res.status(400).json({ message: "Champs manquants" });
    const stored = registerCodes.get(email);
    if (!stored) return res.status(400).json({ message: "Aucun code demandé" });
    if (Date.now() > stored.expiresAt) { registerCodes.delete(email); return res.status(400).json({ message: "Code expiré" }); }
    if (stored.code !== code) return res.status(400).json({ message: "Code incorrect ❌" });
    registerCodes.set(email, { ...stored, verified: true });
    res.json({ ok: true, message: "Email vérifié ✅" });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/register", loginLimiter, async (req, res) => {
  try {
    const firstName = san(req.body?.firstName||"");
    const name      = san(req.body?.name    ||"");
    const email     = san(req.body?.email   ||"").toLowerCase();
    const password  = String(req.body?.password||"");
    const phone     = san(req.body?.phone   ||"");
    const location  = san(req.body?.location||"");
    if (!name||!email||!password) return res.status(400).json({ message: "Champs manquants" });
    if (password.length < 6) return res.status(400).json({ message: "Mot de passe trop court" });
    const ce = registerCodes.get(email);
    if (!ce?.verified) return res.status(400).json({ message: "Email non vérifié" });
    if (await User.findOne({ email }).lean()) return res.status(400).json({ message: "Email déjà utilisé" });
    if (await User.findOne({ name  }).lean()) return res.status(400).json({ message: "Nom déjà utilisé" });
    const u = await User.create({ firstName, name, email, phone, location, password: await bcrypt.hash(password, 10), topSkills: [], summary: "" });
    registerCodes.delete(email);
    res.json({ message: "Compte créé !", user: { id: u._id, firstName: u.firstName||"", name: u.name, email: u.email, phone: u.phone||"", location: u.location||"", avatar: u.avatar||"", topSkills: [], summary: "" } });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////
app.post("/login", loginLimiter, async (req, res) => {
  try {
    const email    = san(req.body?.email   ||"").toLowerCase();
    const password = String(req.body?.password||"");
    if (!email||!password) return res.status(400).json({ message: "Champs manquants" });
    const user = await User.findOne({ email });
    if (!user||!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Identifiants incorrects" });
    const token = jwt.sign({ id: user._id, name: user.name }, SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, firstName: user.firstName||"", name: user.name, email: user.email, phone: user.phone||"", location: user.location||"", avatar: user.avatar||"", topSkills: user.topSkills||[], summary: user.summary||"" } });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/forgot-password", loginLimiter, async (req, res) => {
  try {
    const email = san(req.body?.email||"").toLowerCase();
    if (!email) return res.status(400).json({ message: "Email requis" });
    const user = await User.findOne({ email }).lean();
    if (!user) return res.json({ message: "Si cet email existe, un code a été envoyé." });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    resetCodes.set(email, { code, expiresAt: Date.now() + 10*60*1000 });
    await transporter.sendMail({ from: `"ShoraDream" <${process.env.MAIL_USER}>`, to: email, subject: "Réinitialisation ShoraDream", html: `<div style="font-family:sans-serif;padding:24px"><h2 style="color:#8B5CF6">ShoraDream</h2><p>Ton code : <strong style="font-size:28px;letter-spacing:6px">${code}</strong></p><p style="color:#666;font-size:13px">Expire dans 10 minutes.</p></div>` });
    res.json({ message: "Code envoyé !" });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/reset-password", async (req, res) => {
  try {
    const email = san(req.body?.email||"").toLowerCase();
    const code  = san(req.body?.code ||"");
    const np    = String(req.body?.newPassword||"");
    if (!email||!code||!np) return res.status(400).json({ message: "Champs manquants" });
    if (np.length < 6) return res.status(400).json({ message: "Minimum 6 caractères" });
    const stored = resetCodes.get(email);
    if (!stored) return res.status(400).json({ message: "Aucun code" });
    if (Date.now() > stored.expiresAt) { resetCodes.delete(email); return res.status(400).json({ message: "Code expiré" }); }
    if (stored.code !== code) return res.status(400).json({ message: "Code incorrect" });
    await User.updateOne({ email }, { $set: { password: await bcrypt.hash(np, 10) } });
    resetCodes.delete(email);
    res.json({ message: "Mot de passe modifié !" });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// PROFIL
//////////////////////////////////////////////////////
app.put("/users/me", auth, async (req, res) => {
  try {
    const name     = san(req.body?.name    ||"");
    const email    = san(req.body?.email   ||"").toLowerCase();
    const firstName= san(req.body?.firstName||"");
    const phone    = san(req.body?.phone   ||"");
    const location = san(req.body?.location||"");
    const summary  = san(req.body?.summary ||"");
    let topSkills = [];
    const raw = req.body?.topSkills;
    if (Array.isArray(raw)) topSkills = raw.map(x=>san(x)).filter(Boolean).slice(0,20);
    else if (typeof raw === "string") topSkills = raw.split(",").map(x=>x.trim()).filter(Boolean).slice(0,20);
    if (!name||!email) return res.status(400).json({ message: "Champs obligatoires manquants" });
    if (await User.findOne({ email, _id: { $ne: req.user.id } }).lean()) return res.status(400).json({ message: "Email déjà utilisé" });
    if (await User.findOne({ name,  _id: { $ne: req.user.id } }).lean()) return res.status(400).json({ message: "Nom déjà utilisé" });
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: "Introuvable" });
    Object.assign(u, { firstName, name, email, phone, location, topSkills, summary });
    await u.save();
    res.json({ user: { id: u._id, firstName: u.firstName||"", name: u.name, email: u.email, phone: u.phone||"", location: u.location||"", avatar: u.avatar||"", topSkills: u.topSkills||[], summary: u.summary||"" } });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.delete("/users/me/delete", auth, async (req, res) => {
  try {
    const password = String(req.body?.password||"");
    if (!password) return res.status(400).json({ message: "Mot de passe requis" });
    const user = await User.findById(req.user.id);
    if (!user||!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Mot de passe incorrect" });
    const uid = req.user.id;
    const [al,bl,sl] = await Promise.all([Annonce.find({owner:uid}).lean(), Besoin.find({owner:uid}).lean(), Star.find({owner:uid}).lean()]);
    for (const a of al) for (const img of (a.images||[])) await deleteFromCloudinary(img);
    for (const b of bl) for (const img of (b.images||[])) await deleteFromCloudinary(img);
    for (const s of sl) for (const img of (s.images||[])) await deleteFromCloudinary(img);
    if (user.avatar) await deleteFromCloudinary(user.avatar);
    await Promise.all([
      Annonce.deleteMany({owner:uid}), Besoin.deleteMany({owner:uid}), Star.deleteMany({owner:uid}),
      Offer.deleteMany({author:uid}), ChatMessage.deleteMany({author:uid}),
      Favorite.deleteMany({owner:uid}),
      Notification.deleteMany({$or:[{to:uid},{from:uid}]}),
      Report.deleteMany({$or:[{reporter:uid},{reported:uid}]}),
      User.deleteOne({_id:uid}),
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

// ✅ Upload avatar → Cloudinary
app.post("/users/avatar", auth, uploadImage.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image manquante" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Introuvable" });
    if (user.avatar) await deleteFromCloudinary(user.avatar);
    const url = await uploadToCloudinary(req.file.buffer, "shoradream/avatars");
    user.avatar = url;
    await user.save();
    res.json({ avatar: url });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur upload" }); }
});

app.post("/users/:id/report", auth, async (req, res) => {
  try {
    const rid = req.params.id;
    if (!isOid(rid)||rid===String(req.user.id)) return res.status(400).json({ message: "Invalide" });
    const reason = san(req.body?.reason||"");
    if (!reason) return res.status(400).json({ message: "Raison obligatoire" });
    const reported = await User.findById(rid);
    if (!reported) return res.status(404).json({ message: "Introuvable" });
    if (await Report.findOne({ reporter: req.user.id, reported: rid }).lean()) return res.status(400).json({ message: "Déjà signalé" });
    await Report.create({ reporter: req.user.id, reported: rid, reason });
    await User.updateOne({ _id: rid }, { $inc: { reportCount: 1 }, $addToSet: { reportedBy: req.user.id } });
    res.json({ ok: true, message: "Signalement envoyé. Merci !" });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// STARS
//////////////////////////////////////////////////////
app.get("/stars/mine", auth, async (req, res) => {
  try { res.json({ items: withLikes(await Star.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean(), req.user.id) }); }
  catch (e) { res.status(500).json({ message: e?.message }); }
});
app.get("/stars", auth, async (req, res) => {
  try { res.json({ items: withLikes(await Star.find({ owner: { $ne: req.user.id } }).sort({ createdAt: -1 }).limit(50).lean(), req.user.id) }); }
  catch (e) { res.status(500).json({ message: e?.message }); }
});

// ✅ Créer étoile → Cloudinary
app.post("/stars", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = san(req.body?.title);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const images = await Promise.all((req.files||[]).slice(0,4).map(f => uploadToCloudinary(f.buffer, "shoradream/stars")));
    const created = await Star.create({ owner: req.user.id, title, images, likes: 0, likedBy: [] });
    res.status(201).json({ item: created });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.delete("/stars/:id", auth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Star.findById(req.params.id);
    if (!item||String(item.owner)!==String(req.user.id)) return res.status(403).json({ message: "Refusé" });
    for (const img of (item.images||[])) await deleteFromCloudinary(img);
    await Star.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// ANNONCES
//////////////////////////////////////////////////////
app.get("/annonces/mine", auth, async (req, res) => {
  try { res.json({ items: withLikes(await Annonce.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean(), req.user.id) }); }
  catch (e) { res.status(500).json({ message: e?.message }); }
});
app.get("/annonces", auth, async (req, res) => {
  try { res.json({ items: withLikes(await Annonce.find({ owner: { $ne: req.user.id } }).sort({ createdAt: -1 }).limit(50).populate("owner","name avatar location").lean(), req.user.id) }); }
  catch (e) { res.status(500).json({ message: e?.message }); }
});

// ✅ Créer annonce → Cloudinary
app.post("/annonces", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = san(req.body?.title);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const images = await Promise.all((req.files||[]).slice(0,4).map(f => uploadToCloudinary(f.buffer, "shoradream/annonces")));
    const created = await Annonce.create({ owner: req.user.id, title, description: san(req.body?.description), location: san(req.body?.location), stars: 0, likedBy: [], status: String(req.body?.status||"active"), images });
    res.status(201).json({ item: created });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.put("/annonces/:id", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Annonce.findById(req.params.id);
    if (!item||String(item.owner)!==String(req.user.id)) return res.status(403).json({ message: "Refusé" });
    let keepImages = [];
    const raw = req.body?.keepImages;
    if (Array.isArray(raw)) keepImages = raw.filter(Boolean);
    else if (typeof raw === "string") { try { keepImages = JSON.parse(raw).filter(Boolean); } catch { keepImages = []; } }
    const toDelete = (item.images||[]).filter(img => !keepImages.includes(img));
    for (const img of toDelete) await deleteFromCloudinary(img);
    const newImages = await Promise.all((req.files||[]).slice(0,4).map(f => uploadToCloudinary(f.buffer, "shoradream/annonces")));
    item.images = [...keepImages, ...newImages].slice(0,4);
    if (req.body?.title!=null) item.title=san(req.body.title)||item.title;
    if (req.body?.description!=null) item.description=san(req.body.description);
    if (req.body?.location!=null) item.location=san(req.body.location);
    if (req.body?.status!=null) item.status=String(req.body.status);
    await item.save();
    res.json({ item });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.delete("/annonces/:id", auth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Annonce.findById(req.params.id);
    if (!item||String(item.owner)!==String(req.user.id)) return res.status(403).json({ message: "Refusé" });
    for (const img of (item.images||[])) await deleteFromCloudinary(img);
    await Annonce.deleteOne({ _id: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// BESOINS
//////////////////////////////////////////////////////
app.get("/besoins/mine", auth, async (req, res) => {
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const items = await Besoin.aggregate([
      { $match: { owner: ownerId } },
      { $lookup: { from: "offers", localField: "_id", foreignField: "besoinId", as: "offers" } },
      { $addFields: { offersCount: { $size: "$offers" } } },
      { $project: { offers: 0 } },
      { $sort: { createdAt: -1 } },
    ]);
    res.json({ items: withLikes(items, req.user.id) });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.get("/besoins", auth, async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.id);
    const items = await Besoin.aggregate([
      { $match: { owner: { $ne: myId } } },
      { $lookup: { from: "offers", localField: "_id", foreignField: "besoinId", as: "offers" } },
      { $addFields: { offersCount: { $size: "$offers" } } },
      { $project: { offers: 0 } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      { $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "ownerUser" } },
      { $unwind: { path: "$ownerUser", preserveNullAndEmptyArrays: true } },
      { $addFields: { ownerPublic: { id: "$ownerUser._id", name: "$ownerUser.name", avatar: "$ownerUser.avatar", location: "$ownerUser.location" } } },
      { $project: { ownerUser: 0 } },
    ]);
    res.json({ items: withLikes(items, req.user.id) });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

// ✅ Créer besoin → Cloudinary
app.post("/besoins", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = san(req.body?.title);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const images = await Promise.all((req.files||[]).slice(0,4).map(f => uploadToCloudinary(f.buffer, "shoradream/besoins")));
    const created = await Besoin.create({ owner: req.user.id, title, description: san(req.body?.description), category: san(req.body?.category||"general"), location: san(req.body?.location), priority: String(req.body?.priority||"medium"), status: String(req.body?.status||"open"), images, likes: 0, likedBy: [] });
    res.status(201).json({ item: created });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.put("/besoins/:id", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Besoin.findById(req.params.id);
    if (!item||String(item.owner)!==String(req.user.id)) return res.status(403).json({ message: "Refusé" });
    let keepImages = [];
    const raw = req.body?.keepImages;
    if (Array.isArray(raw)) keepImages = raw.filter(Boolean);
    else if (typeof raw === "string") { try { keepImages = JSON.parse(raw).filter(Boolean); } catch { keepImages = []; } }
    const toDelete = (item.images||[]).filter(img => !keepImages.includes(img));
    for (const img of toDelete) await deleteFromCloudinary(img);
    const newImages = await Promise.all((req.files||[]).slice(0,4).map(f => uploadToCloudinary(f.buffer, "shoradream/besoins")));
    item.images = [...keepImages, ...newImages].slice(0,4);
    if (req.body?.title!=null) item.title=san(req.body.title)||item.title;
    if (req.body?.description!=null) item.description=san(req.body.description);
    if (req.body?.category!=null) item.category=san(req.body.category);
    if (req.body?.location!=null) item.location=san(req.body.location);
    if (req.body?.priority!=null) item.priority=String(req.body.priority);
    if (req.body?.status!=null) item.status=String(req.body.status);
    await item.save();
    res.json({ item });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/besoins/:id/close", auth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const b = await Besoin.findById(req.params.id);
    if (!b||String(b.owner)!==String(req.user.id)) return res.status(403).json({ message: "Refusé" });
    b.status = "closed"; await b.save();
    res.json({ ok: true, item: b });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.delete("/besoins/:id", auth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Besoin.findById(req.params.id);
    if (!item||String(item.owner)!==String(req.user.id)) return res.status(403).json({ message: "Refusé" });
    for (const img of (item.images||[])) await deleteFromCloudinary(img);
    await Promise.all([Offer.deleteMany({besoinId:req.params.id}), ChatMessage.deleteMany({besoinId:req.params.id}), Favorite.deleteMany({targetType:"besoin",targetId:req.params.id}), Besoin.deleteOne({_id:req.params.id})]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// OFFERS
//////////////////////////////////////////////////////
app.get("/besoins/:id/offers", auth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    res.json({ items: await Offer.find({ besoinId: req.params.id }).sort({ createdAt: -1 }).lean() });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

// ✅ Créer offre → Cloudinary
app.post("/besoins/:id/offers", auth, uploadImage.single("image"), async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    const message = san(req.body?.message);
    if (!message) return res.status(400).json({ message: "Message requis" });
    const besoin = await Besoin.findById(req.params.id).lean();
    if (!besoin) return res.status(404).json({ message: "Introuvable" });
    if (besoin.status !== "open") return res.status(400).json({ message: "Besoin non ouvert" });
    if (String(besoin.owner)===String(req.user.id)) return res.status(400).json({ message: "Tu ne peux pas proposer sur ton propre besoin" });
    let image = "";
    if (req.file) image = await uploadToCloudinary(req.file.buffer, "shoradream/offers");
    const item = await Offer.create({ besoinId: req.params.id, author: req.user.id, authorName: req.user?.name||"Utilisateur", message, image, accepted: false });
    await Notification.create({ to: besoin.owner, from: req.user.id, fromName: req.user?.name||"Utilisateur", type: "offer", targetId: besoin._id, targetTitle: besoin.title, message: `${req.user?.name||"Quelqu'un"} a proposé son aide` }).catch(()=>{});
    res.status(201).json({ item });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.delete("/offers/:offerId", auth, async (req, res) => {
  try {
    if (!isOid(req.params.offerId)) return res.status(400).json({ message: "ID invalide" });
    const offer  = await Offer.findById(req.params.offerId).lean();
    if (!offer)  return res.status(404).json({ message: "Introuvable" });
    const besoin = await Besoin.findById(offer.besoinId).lean();
    if (String(offer.author)!==String(req.user.id)&&(!besoin||String(besoin.owner)!==String(req.user.id))) return res.status(403).json({ message: "Refusé" });
    if (offer.accepted) return res.status(400).json({ message: "Offre déjà acceptée" });
    if (offer.image) await deleteFromCloudinary(offer.image);
    await Offer.deleteOne({ _id: req.params.offerId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/offers/:offerId/accept", auth, async (req, res) => {
  try {
    if (!isOid(req.params.offerId)) return res.status(400).json({ message: "ID invalide" });
    const offer  = await Offer.findById(req.params.offerId).lean();
    if (!offer)  return res.status(404).json({ message: "Introuvable" });
    const besoin = await Besoin.findById(offer.besoinId);
    if (!besoin||String(besoin.owner)!==String(req.user.id)) return res.status(403).json({ message: "Refusé" });
    if (besoin.status!=="open") return res.status(400).json({ message: "Besoin non ouvert" });
    await Offer.updateMany({besoinId:besoin._id},{$set:{accepted:false}});
    await Offer.updateOne({_id:req.params.offerId},{$set:{accepted:true}});
    besoin.status="closed"; besoin.acceptedOfferId=req.params.offerId; await besoin.save();
    await Notification.create({ to: offer.author, from: req.user.id, fromName: req.user?.name||"Utilisateur", type: "accepted", targetId: besoin._id, targetTitle: besoin.title, message: `${req.user?.name||"Quelqu'un"} a accepté votre offre` }).catch(()=>{});
    res.json({ ok: true, besoinId: String(besoin._id), offerId: req.params.offerId });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// FEED
//////////////////////////////////////////////////////
app.get("/feed", auth, async (req, res) => {
  try {
    const uid   = String(req.user.id);
    const myId  = new mongoose.Types.ObjectId(req.user.id);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit||20)));
    const [annonces, besoins, stars] = await Promise.all([
      Annonce.find({ owner: { $ne: myId } }).sort({ createdAt: -1 }).limit(limit).populate("owner","name avatar location").lean(),
      Besoin.aggregate([
        { $match: { owner: { $ne: myId } } },
        { $lookup: { from: "offers", localField: "_id", foreignField: "besoinId", as: "offers" } },
        { $addFields: { offersCount: { $size: "$offers" } } },
        { $project: { offers: 0 } },
        { $sort: { createdAt: -1 } },
        { $limit: limit },
        { $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "ownerUser" } },
        { $unwind: { path: "$ownerUser", preserveNullAndEmptyArrays: true } },
        { $addFields: { ownerPublic: { id: "$ownerUser._id", name: "$ownerUser.name", avatar: "$ownerUser.avatar", location: "$ownerUser.location" } } },
        { $project: { ownerUser: 0 } },
      ]),
      Star.find({ owner: { $ne: myId } }).sort({ createdAt: -1 }).limit(limit).populate("owner","name avatar location").lean(),
    ]);
    res.json({ annonces: withLikes(annonces,uid), besoins: withLikes(besoins,uid), stars: withLikes(stars,uid) });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// CHAT
//////////////////////////////////////////////////////
app.get("/chat/:besoinId/messages", auth, rateLimit({ windowMs:10_000, max:20 }), async (req, res) => {
  try {
    if (!isOid(req.params.besoinId)) return res.status(400).json({ message: "ID invalide" });
    const access = await canAccess(req.user.id, req.params.besoinId);
    if (!access.ok) return res.status(403).json({ message: access.reason });
    const q = { besoinId: req.params.besoinId };
    const oid = req.query.offerId;
    if (oid && isOid(oid)) {
      const offer = await Offer.findById(oid).lean();
      if (!offer||String(offer.besoinId)!==String(req.params.besoinId)) return res.status(404).json({ message: "Offre introuvable" });
      const io = String(access.besoin.owner)===String(req.user.id), ia = String(offer.author)===String(req.user.id);
      if (!io&&!ia) return res.status(403).json({ message: "Refusé" });
      q.offerId = oid;
    }
    res.json({ items: await ChatMessage.find(q).sort({ createdAt: 1 }).limit(300).lean() });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/chat/:besoinId/messages", auth, rateLimit({ windowMs:10_000, max:12 }), async (req, res) => {
  try {
    if (!isOid(req.params.besoinId)) return res.status(400).json({ message: "ID invalide" });
    const access = await canAccess(req.user.id, req.params.besoinId);
    if (!access.ok) return res.status(403).json({ message: access.reason });
    const text = san(req.body?.text);
    if (!text) return res.status(400).json({ message: "Message requis" });
    let offerId = null;
    const raw = req.body?.offerId;
    if (isOid(raw)) {
      const offer = await Offer.findById(raw).lean();
      if (!offer||String(offer.besoinId)!==String(req.params.besoinId)) return res.status(404).json({ message: "Offre introuvable" });
      const io = String(access.besoin.owner)===String(req.user.id), ia = String(offer.author)===String(req.user.id);
      if (!io&&!ia) return res.status(403).json({ message: "Refusé" });
      offerId = raw;
      const to = io ? offer.author : access.besoin.owner;
      await Notification.create({ to, from: req.user.id, fromName: req.user?.name||"Utilisateur", type: "message", targetId: new mongoose.Types.ObjectId(req.params.besoinId), targetTitle: access.besoin.title||"", message: `${req.user?.name||"Quelqu'un"} vous a envoyé un message` }).catch(()=>{});
    }
    const item = await ChatMessage.create({ besoinId: req.params.besoinId, offerId, author: req.user.id, authorName: req.user?.name||"Utilisateur", text });
    res.status(201).json({ item });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// FAVORITES
//////////////////////////////////////////////////////
app.get("/favorites/mine", auth, async (req, res) => {
  try {
    const favs = await Favorite.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
    const bids=favs.filter(f=>f.targetType==="besoin").map(f=>f.targetId);
    const aids=favs.filter(f=>f.targetType==="annonce").map(f=>f.targetId);
    const sids=favs.filter(f=>f.targetType==="star").map(f=>f.targetId);
    const [B,A,S]=await Promise.all([Besoin.find({_id:{$in:bids}}).lean(),Annonce.find({_id:{$in:aids}}).lean(),Star.find({_id:{$in:sids}}).lean()]);
    const mB=new Map(B.map(x=>[String(x._id),x])),mA=new Map(A.map(x=>[String(x._id),x])),mS=new Map(S.map(x=>[String(x._id),x]));
    res.json({ items: favs.map(f=>{ const d=f.targetType==="besoin"?mB.get(String(f.targetId)):f.targetType==="annonce"?mA.get(String(f.targetId)):mS.get(String(f.targetId)); return d?{...f,item:d}:null; }).filter(Boolean) });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

app.post("/favorites/toggle", auth, async (req, res) => {
  try {
    const tt=san(req.body?.targetType||""), ti=san(req.body?.targetId||"");
    if (!["besoin","annonce","star"].includes(tt)) return res.status(400).json({ message: "Type invalide" });
    if (!isOid(ti)) return res.status(400).json({ message: "ID invalide" });
    const ex=tt==="besoin"?await Besoin.exists({_id:ti}):tt==="annonce"?await Annonce.exists({_id:ti}):await Star.exists({_id:ti});
    if (!ex) return res.status(404).json({ message: "Introuvable" });
    const q={owner:req.user.id,targetType:tt,targetId:ti};
    const found=await Favorite.findOne(q).lean();
    if (found) { await Favorite.deleteOne({_id:found._id}); return res.json({ok:true,favorited:false}); }
    await Favorite.create(q); res.json({ok:true,favorited:true});
  } catch (e) {
    if (String(e?.message||"").includes("E11000")) return res.json({ok:true,favorited:true});
    res.status(500).json({ message: e?.message });
  }
});

//////////////////////////////////////////////////////
// NOTIFICATIONS
//////////////////////////////////////////////////////
app.get("/notifications/mine", auth, async (req, res) => {
  try { res.json({ items: await Notification.find({ to: req.user.id }).sort({ createdAt: -1 }).limit(50).lean() }); }
  catch (e) { res.status(500).json({ message: e?.message }); }
});
app.get("/notifications/unread-count", auth, async (req, res) => {
  try { res.json({ count: await Notification.countDocuments({ to: req.user.id, read: false }) }); }
  catch (e) { res.status(500).json({ message: e?.message }); }
});
app.put("/notifications/read-all", auth, async (req, res) => {
  try { await Notification.updateMany({ to: req.user.id, read: false }, { $set: { read: true } }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ message: e?.message }); }
});
app.put("/notifications/:id/read", auth, async (req, res) => {
  try {
    if (!isOid(req.params.id)) return res.status(400).json({ message: "ID invalide" });
    await Notification.updateOne({ _id: req.params.id, to: req.user.id }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message }); }
});

//////////////////////////////////////////////////////
// START
//////////////////////////////////////////////////////
app.listen(PORT, "0.0.0.0", () => console.log("✅ Backend http://0.0.0.0:" + PORT));

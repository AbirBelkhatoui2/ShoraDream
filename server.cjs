// server.cjs (COMPLET + SÉCURISÉ + NOTIFICATIONS + PROFILS PUBLICS)

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 3001;
const SECRET = process.env.JWT_SECRET || "SECRET_KEY_TEST";

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ MongoDB erreur:", err));

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

const resetCodes = new Map();

const UPLOADS_ROOT = path.join(__dirname, "uploads");
const IMG_DIR = path.join(UPLOADS_ROOT, "images");
if (!fs.existsSync(UPLOADS_ROOT)) fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMG_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + ext);
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Format non autorisé."), false);
    cb(null, true);
  },
});

//////////////////////////////////////////////////////
// MODELS
//////////////////////////////////////////////////////
const userSchema = new mongoose.Schema({
  firstName: { type: String, default: "", trim: true },
  name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 40 },
  email: { type: String, unique: true, required: true, trim: true, lowercase: true },
  phone: { type: String, default: "", trim: true, maxlength: 30 },
  location: { type: String, default: "", trim: true },
  topSkills: { type: [String], default: [] },
  summary: { type: String, default: "" },
  password: { type: String, required: true },
  avatar: { type: String, default: "" },
  reportCount: { type: Number, default: 0, min: 0 },
  reportedBy: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  blockedUsers: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
}, { timestamps: true });

const starSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  images: { type: [String], default: [], validate: { validator: (arr) => arr.length <= 4, message: "Max 4 images" } },
}, { timestamps: true });

const annonceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  location: { type: String, default: "", trim: true },
  stars: { type: Number, default: 0, min: 0, max: 5 },
  status: { type: String, enum: ["active", "pending", "closed"], default: "active" },
  images: { type: [String], default: [], validate: { validator: (arr) => arr.length <= 4, message: "Max 4 images" } },
}, { timestamps: true });

const besoinSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  category: { type: String, default: "general", trim: true },
  location: { type: String, default: "", trim: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["open", "closed", "done"], default: "open" },
  acceptedOfferId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null },
  images: { type: [String], default: [], validate: { validator: (arr) => arr.length <= 4, message: "Max 4 images" } },
}, { timestamps: true });

const offerSchema = new mongoose.Schema({
  besoinId: { type: mongoose.Schema.Types.ObjectId, ref: "Besoin", required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  authorName: { type: String, default: "Utilisateur" },
  message: { type: String, required: true, trim: true },
  image: { type: String, default: "" },
  accepted: { type: Boolean, default: false },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  besoinId: { type: mongoose.Schema.Types.ObjectId, ref: "Besoin", required: true, index: true },
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  authorName: { type: String, default: "Utilisateur" },
  text: { type: String, required: true, trim: true },
}, { timestamps: true });

const favoriteSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: ["besoin", "annonce", "star"], required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fromName: { type: String, default: "Utilisateur" },
  type: { type: String, enum: ["offer", "like", "accepted", "message"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetTitle: { type: String, default: "" },
  message: { type: String, default: "" },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

offerSchema.index({ besoinId: 1, author: 1 });
messageSchema.index({ besoinId: 1, offerId: 1, createdAt: 1 });
besoinSchema.index({ owner: 1, createdAt: -1 });
annonceSchema.index({ owner: 1, createdAt: -1 });
starSchema.index({ owner: 1, createdAt: -1 });
favoriteSchema.index({ owner: 1, targetType: 1, targetId: 1 }, { unique: true });
notificationSchema.index({ to: 1, createdAt: -1 });

const User = mongoose.model("User", userSchema);
const Star = mongoose.model("Star", starSchema);
const Annonce = mongoose.model("Annonce", annonceSchema);
const Besoin = mongoose.model("Besoin", besoinSchema);
const Offer = mongoose.model("Offer", offerSchema);
const ChatMessage = mongoose.model("ChatMessage", messageSchema);
const Favorite = mongoose.model("Favorite", favoriteSchema);
const Notification = mongoose.model("Notification", notificationSchema);

//////////////////////////////////////////////////////
// AUTH MIDDLEWARE
//////////////////////////////////////////////////////
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Token manquant" });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { return res.status(401).json({ message: "Token invalide ou expiré" }); }
}

//////////////////////////////////////////////////////
// RATE LIMITING
//////////////////////////////////////////////////////
const RL = new Map();
function rateLimit({ windowMs = 10_000, max = 12 } = {}) {
  return (req, res, next) => {
    const key = `${req.user?.id || req.ip}:${req.path}`;
    const now = Date.now();
    const cur = RL.get(key) || { count: 0, ts: now };
    if (now - cur.ts > windowMs) { cur.count = 0; cur.ts = now; }
    cur.count++;
    RL.set(key, cur);
    if (cur.count > max) return res.status(429).json({ message: "Trop de requêtes. Réessaie." });
    next();
  };
}
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

//////////////////////////////////////////////////////
// HELPERS
//////////////////////////////////////////////////////
function isObjectIdLike(v) {
  return typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
}

function safeUnlinkUpload(publicPath) {
  if (!publicPath || typeof publicPath !== "string") return;
  const cleanPath = publicPath.split("?")[0];
  if (!cleanPath.startsWith("/uploads/")) return;
  fs.unlink(path.join(__dirname, "uploads", cleanPath.replace("/uploads/", "")), () => {});
}

function parseKeepImages(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr.filter(Boolean) : []; }
    catch { return []; }
  }
  return [];
}

function sanitizeText(v, max = 200000) {
  const s = String(v ?? "").replace(/\0/g, "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

async function canAccessBesoin(reqUserId, besoinId) {
  const besoin = await Besoin.findById(besoinId).lean();
  if (!besoin) return { ok: false, reason: "Besoin introuvable" };
  if (String(besoin.owner) === String(reqUserId)) return { ok: true, besoin, role: "owner" };
  const hasOffer = await Offer.exists({ besoinId, author: reqUserId });
  if (hasOffer) return { ok: true, besoin, role: "offer_author" };
  return { ok: false, reason: "Accès refusé" };
}

//////////////////////////////////////////////////////
// ROUTES DE BASE
//////////////////////////////////////////////////////
app.get("/", (req, res) => res.send("OK"));
app.get("/ping", (req, res) => res.json({ ok: true }));

//////////////////// PROFIL PUBLIC ////////////////////
app.get("/users/public/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const u = await User.findById(id).lean();
    if (!u) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ user: { id: u._id, firstName: u.firstName || "", name: u.name, avatar: u.avatar || "", phone: u.phone || "", location: u.location || "", topSkills: u.topSkills || [], summary: u.summary || "" } });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// PUBLICATIONS PUBLIQUES D'UN UTILISATEUR ////////////////////
app.get("/users/:id/annonces", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const items = await Annonce.find({ owner: id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.get("/users/:id/besoins", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const items = await Besoin.find({ owner: id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.get("/users/:id/stars", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const items = await Star.find({ owner: id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// REGISTER ////////////////////
app.post("/register", loginLimiter, async (req, res) => {
  try {
    const firstName = sanitizeText(req.body?.firstName || "");
    const name = sanitizeText(req.body?.name || "");
    const email = sanitizeText(req.body?.email || "").toLowerCase();
    const password = String(req.body?.password || "");
    const phone = sanitizeText(req.body?.phone || "");
    const location = sanitizeText(req.body?.location || "");
    if (!name || !email || !password) return res.status(400).json({ message: "Champs manquants" });
    if (password.length < 6) return res.status(400).json({ message: "Mot de passe trop court (minimum 6 caractères)" });
    if (await User.findOne({ email }).lean()) return res.status(400).json({ message: "Email déjà utilisé" });
    if (await User.findOne({ name }).lean()) return res.status(400).json({ message: "Nom déjà utilisé" });
    const newUser = await User.create({ firstName, name, email, phone, location, password: await bcrypt.hash(password, 10), topSkills: [], summary: "" });
    res.json({ message: "Utilisateur créé", user: { id: newUser._id, firstName: newUser.firstName || "", name: newUser.name, email: newUser.email, phone: newUser.phone || "", location: newUser.location || "", avatar: newUser.avatar || "", topSkills: [], summary: "" } });
  } catch (err) { console.error("REGISTER ERROR:", err); res.status(500).json({ message: err?.message || "Erreur serveur" }); }
});

//////////////////// LOGIN ////////////////////
app.post("/login", loginLimiter, async (req, res) => {
  try {
    const email = sanitizeText(req.body?.email || "").toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ message: "Champs manquants" });
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Identifiants incorrects" });
    const token = jwt.sign({ id: user._id, name: user.name }, SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, firstName: user.firstName || "", name: user.name, email: user.email, phone: user.phone || "", location: user.location || "", avatar: user.avatar || "", topSkills: user.topSkills || [], summary: user.summary || "" } });
  } catch (err) { console.error("LOGIN ERROR:", err); res.status(500).json({ message: err?.message || "Erreur serveur" }); }
});

//////////////////// MOT DE PASSE OUBLIÉ ////////////////////
app.post("/forgot-password", loginLimiter, async (req, res) => {
  try {
    const email = sanitizeText(req.body?.email || "").toLowerCase();
    if (!email) return res.status(400).json({ message: "Email requis" });
    const user = await User.findOne({ email }).lean();
    if (!user) return res.json({ message: "Si cet email existe, un code a été envoyé." });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    resetCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    await transporter.sendMail({
      from: `"ShoraDream" <${process.env.MAIL_USER}>`, to: email,
      subject: "Ton code de réinitialisation ShoraDream",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px"><h2 style="color:#8B5CF6">ShoraDream</h2><p>Ton code :</p><div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f5f5ff;border-radius:12px;color:#050B2E;margin:20px 0">${code}</div><p style="color:#666;font-size:13px">Expire dans <strong>10 minutes</strong>.</p></div>`,
    });
    res.json({ message: "Code envoyé !" });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur envoi email" }); }
});

app.post("/reset-password", async (req, res) => {
  try {
    const email = sanitizeText(req.body?.email || "").toLowerCase();
    const code = sanitizeText(req.body?.code || "");
    const newPassword = String(req.body?.newPassword || "");
    if (!email || !code || !newPassword) return res.status(400).json({ message: "Champs manquants" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Minimum 6 caractères" });
    const stored = resetCodes.get(email);
    if (!stored) return res.status(400).json({ message: "Aucun code demandé" });
    if (Date.now() > stored.expiresAt) { resetCodes.delete(email); return res.status(400).json({ message: "Code expiré" }); }
    if (stored.code !== code) return res.status(400).json({ message: "Code incorrect" });
    await User.updateOne({ email }, { $set: { password: await bcrypt.hash(newPassword, 10) } });
    resetCodes.delete(email);
    res.json({ message: "Mot de passe modifié !" });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// UPDATE PROFILE ////////////////////
app.put("/users/me", auth, async (req, res) => {
  try {
    const name = sanitizeText(req.body?.name || "");
    const email = sanitizeText(req.body?.email || "").toLowerCase();
    const firstName = sanitizeText(req.body?.firstName || "");
    const phone = sanitizeText(req.body?.phone || "");
    const location = sanitizeText(req.body?.location || "");
    const summary = sanitizeText(req.body?.summary || "");
    let topSkills = [];
    const raw = req.body?.topSkills;
    if (Array.isArray(raw)) topSkills = raw.map(x => sanitizeText(x)).filter(Boolean).slice(0, 20);
    else if (typeof raw === "string") topSkills = raw.split(",").map(x => x.trim()).filter(Boolean).slice(0, 20);
    if (!name) return res.status(400).json({ message: "Nom obligatoire" });
    if (!email) return res.status(400).json({ message: "Email obligatoire" });
    if (await User.findOne({ email, _id: { $ne: req.user.id } }).lean()) return res.status(400).json({ message: "Email déjà utilisé" });
    if (await User.findOne({ name, _id: { $ne: req.user.id } }).lean()) return res.status(400).json({ message: "Nom déjà utilisé" });
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: "Utilisateur introuvable" });
    Object.assign(u, { firstName, name, email, phone, location, topSkills, summary });
    await u.save();
    res.json({ user: { id: u._id, firstName: u.firstName || "", name: u.name, email: u.email, phone: u.phone || "", location: u.location || "", avatar: u.avatar || "", topSkills: u.topSkills || [], summary: u.summary || "" } });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// UPLOAD AVATAR ////////////////////
app.post("/users/avatar", auth, uploadImage.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image manquante" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    if (user.avatar) safeUnlinkUpload(user.avatar);
    user.avatar = "/uploads/images/" + req.file.filename;
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (err) { res.status(500).json({ message: "Erreur upload avatar" }); }
});

//////////////////// STARS ////////////////////
app.get("/stars/mine", auth, async (req, res) => {
  try { res.json({ items: await Star.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean() }); }
  catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.get("/stars", auth, async (req, res) => {
  try { res.json({ items: await Star.find({ owner: { $ne: req.user.id } }).sort({ createdAt: -1 }).limit(50).lean() }); }
  catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/stars", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const created = await Star.create({ owner: req.user.id, title, images: (req.files || []).map(f => "/uploads/images/" + f.filename).slice(0, 4) });
    res.status(201).json({ item: created });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.delete("/stars/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Star.findById(id);
    if (!item) return res.status(404).json({ message: "Étoile introuvable" });
    if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    (item.images || []).forEach(safeUnlinkUpload);
    await Star.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// ANNONCES ////////////////////
app.get("/annonces/mine", auth, async (req, res) => {
  try { res.json({ items: await Annonce.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean() }); }
  catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.get("/annonces", auth, async (req, res) => {
  try {
    const items = await Annonce.find({ owner: { $ne: req.user.id } }).sort({ createdAt: -1 }).limit(50).populate("owner", "name avatar location").lean();
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/annonces", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const created = await Annonce.create({ owner: req.user.id, title, description: sanitizeText(req.body?.description), location: sanitizeText(req.body?.location), stars: Number(req.body?.stars || 0), status: String(req.body?.status || "active"), images: (req.files || []).map(f => "/uploads/images/" + f.filename).slice(0, 4) });
    res.status(201).json({ item: created });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.put("/annonces/:id", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Annonce.findById(id);
    if (!item) return res.status(404).json({ message: "Annonce introuvable" });
    if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    const keepImages = parseKeepImages(req.body?.keepImages);
    const newImages = (req.files || []).map(f => "/uploads/images/" + f.filename);
    (item.images || []).filter(img => !keepImages.includes(img)).forEach(safeUnlinkUpload);
    item.images = [...keepImages, ...newImages].slice(0, 4);
    if (req.body?.title != null) item.title = sanitizeText(req.body.title) || item.title;
    if (req.body?.description != null) item.description = sanitizeText(req.body.description);
    if (req.body?.location != null) item.location = sanitizeText(req.body.location);
    if (req.body?.stars != null) item.stars = Number(req.body.stars);
    if (req.body?.status != null) item.status = String(req.body.status);
    await item.save();
    res.json({ item });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.delete("/annonces/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Annonce.findById(id);
    if (!item) return res.status(404).json({ message: "Annonce introuvable" });
    if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    (item.images || []).forEach(safeUnlinkUpload);
    await Annonce.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// BESOINS ////////////////////
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
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
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
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/besoins", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const created = await Besoin.create({ owner: req.user.id, title, description: sanitizeText(req.body?.description), category: sanitizeText(req.body?.category || "general"), location: sanitizeText(req.body?.location), priority: String(req.body?.priority || "medium"), status: String(req.body?.status || "open"), images: (req.files || []).map(f => "/uploads/images/" + f.filename).slice(0, 4) });
    res.status(201).json({ item: created });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.put("/besoins/:id", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Besoin.findById(id);
    if (!item) return res.status(404).json({ message: "Besoin introuvable" });
    if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    const keepImages = parseKeepImages(req.body?.keepImages);
    const newImages = (req.files || []).map(f => "/uploads/images/" + f.filename);
    (item.images || []).filter(img => !keepImages.includes(img)).forEach(safeUnlinkUpload);
    item.images = [...keepImages, ...newImages].slice(0, 4);
    if (req.body?.title != null) item.title = sanitizeText(req.body.title) || item.title;
    if (req.body?.description != null) item.description = sanitizeText(req.body.description);
    if (req.body?.category != null) item.category = sanitizeText(req.body.category);
    if (req.body?.location != null) item.location = sanitizeText(req.body.location);
    if (req.body?.priority != null) item.priority = String(req.body.priority);
    if (req.body?.status != null) item.status = String(req.body.status);
    await item.save();
    res.json({ item });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/besoins/:id/close", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const besoin = await Besoin.findById(id);
    if (!besoin) return res.status(404).json({ message: "Besoin introuvable" });
    if (String(besoin.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    besoin.status = "closed";
    await besoin.save();
    res.json({ ok: true, item: besoin });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.delete("/besoins/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Besoin.findById(id);
    if (!item) return res.status(404).json({ message: "Besoin introuvable" });
    if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    (item.images || []).forEach(safeUnlinkUpload);
    await Offer.deleteMany({ besoinId: id });
    await ChatMessage.deleteMany({ besoinId: id });
    await Favorite.deleteMany({ targetType: "besoin", targetId: id });
    await Besoin.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// OFFERS ////////////////////
app.get("/besoins/:id/offers", auth, async (req, res) => {
  try {
    const besoinId = req.params.id;
    if (!isObjectIdLike(besoinId)) return res.status(400).json({ message: "ID invalide" });
    if (!await Besoin.exists({ _id: besoinId })) return res.status(404).json({ message: "Besoin introuvable" });
    res.json({ items: await Offer.find({ besoinId }).sort({ createdAt: -1 }).lean() });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/besoins/:id/offers", auth, uploadImage.single("image"), async (req, res) => {
  try {
    const besoinId = req.params.id;
    if (!isObjectIdLike(besoinId)) return res.status(400).json({ message: "ID invalide" });
    const message = sanitizeText(req.body?.message);
    if (!message) return res.status(400).json({ message: "Message requis" });
    const besoin = await Besoin.findById(besoinId).lean();
    if (!besoin) return res.status(404).json({ message: "Besoin introuvable" });
    if (besoin.status !== "open") return res.status(400).json({ message: "Besoin non ouvert" });
    if (String(besoin.owner) === String(req.user.id)) return res.status(400).json({ message: "Tu ne peux pas proposer sur ton propre besoin." });
    const image = req.file ? "/uploads/images/" + req.file.filename : "";
    const item = await Offer.create({ besoinId, author: req.user.id, authorName: req.user?.name || "Utilisateur", message, image, accepted: false });
    await Notification.create({ to: besoin.owner, from: req.user.id, fromName: req.user?.name || "Utilisateur", type: "offer", targetId: besoin._id, targetTitle: besoin.title, message: `${req.user?.name || "Quelqu'un"} a proposé son aide` }).catch(() => {});
    res.status(201).json({ item });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.delete("/offers/:offerId", auth, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    if (!isObjectIdLike(offerId)) return res.status(400).json({ message: "ID invalide" });
    const offer = await Offer.findById(offerId).lean();
    if (!offer) return res.status(404).json({ message: "Offre introuvable" });
    const besoin = await Besoin.findById(offer.besoinId).lean();
    if (!besoin) return res.status(404).json({ message: "Besoin introuvable" });
    const isAuthor = String(offer.author) === String(req.user.id);
    const isOwner = String(besoin.owner) === String(req.user.id);
    if (!isAuthor && !isOwner) return res.status(403).json({ message: "Accès refusé" });
    if (offer.accepted) return res.status(400).json({ message: "Offre déjà acceptée" });
    if (offer.image) safeUnlinkUpload(offer.image);
    await Offer.deleteOne({ _id: offerId });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/offers/:offerId/accept", auth, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    if (!isObjectIdLike(offerId)) return res.status(400).json({ message: "ID invalide" });
    const offer = await Offer.findById(offerId).lean();
    if (!offer) return res.status(404).json({ message: "Offre introuvable" });
    const besoin = await Besoin.findById(offer.besoinId);
    if (!besoin) return res.status(404).json({ message: "Besoin introuvable" });
    if (String(besoin.owner) !== String(req.user.id)) return res.status(403).json({ message: "Seul le propriétaire peut accepter." });
    if (besoin.status !== "open") return res.status(400).json({ message: "Besoin non ouvert." });
    await Offer.updateMany({ besoinId: besoin._id }, { $set: { accepted: false } });
    await Offer.updateOne({ _id: offerId }, { $set: { accepted: true } });
    besoin.status = "closed";
    besoin.acceptedOfferId = offerId;
    await besoin.save();
    await Notification.create({ to: offer.author, from: req.user.id, fromName: req.user?.name || "Utilisateur", type: "accepted", targetId: besoin._id, targetTitle: besoin.title, message: `${req.user?.name || "Quelqu'un"} a accepté votre offre` }).catch(() => {});
    res.json({ ok: true, besoinId: String(besoin._id), offerId });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// FEED ////////////////////
app.get("/feed", auth, async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.id);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const [annonces, besoins, stars] = await Promise.all([
      Annonce.find({ owner: { $ne: myId } }).sort({ createdAt: -1 }).limit(limit).populate("owner", "name avatar location").lean(),
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
      Star.find({ owner: { $ne: myId } }).sort({ createdAt: -1 }).limit(limit).populate("owner", "name avatar location").lean(),
    ]);
    res.json({ annonces, besoins, stars });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// CHAT ////////////////////
app.get("/chat/:besoinId/messages", auth, rateLimit({ windowMs: 10_000, max: 20 }), async (req, res) => {
  try {
    const besoinId = req.params.besoinId;
    if (!isObjectIdLike(besoinId)) return res.status(400).json({ message: "ID invalide" });
    const access = await canAccessBesoin(req.user.id, besoinId);
    if (!access.ok) return res.status(403).json({ message: access.reason });
    const offerId = req.query.offerId;
    const q = { besoinId };
    if (offerId && isObjectIdLike(offerId)) {
      const offer = await Offer.findById(offerId).lean();
      if (!offer || String(offer.besoinId) !== String(besoinId)) return res.status(404).json({ message: "Offre introuvable" });
      const isOwner = String(access.besoin.owner) === String(req.user.id);
      const isOfferAuthor = String(offer.author) === String(req.user.id);
      if (!isOwner && !isOfferAuthor) return res.status(403).json({ message: "Accès refusé" });
      q.offerId = offerId;
    }
    res.json({ items: await ChatMessage.find(q).sort({ createdAt: 1 }).limit(300).lean() });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/chat/:besoinId/messages", auth, rateLimit({ windowMs: 10_000, max: 12 }), async (req, res) => {
  try {
    const besoinId = req.params.besoinId;
    if (!isObjectIdLike(besoinId)) return res.status(400).json({ message: "ID invalide" });
    const access = await canAccessBesoin(req.user.id, besoinId);
    if (!access.ok) return res.status(403).json({ message: access.reason });
    const text = sanitizeText(req.body?.text);
    if (!text) return res.status(400).json({ message: "Message requis" });
    const offerIdRaw = req.body?.offerId;
    let offerId = null;
    if (isObjectIdLike(offerIdRaw)) {
      const offer = await Offer.findById(offerIdRaw).lean();
      if (!offer || String(offer.besoinId) !== String(besoinId)) return res.status(404).json({ message: "Offre introuvable" });
      const isOwner = String(access.besoin.owner) === String(req.user.id);
      const isOfferAuthor = String(offer.author) === String(req.user.id);
      if (!isOwner && !isOfferAuthor) return res.status(403).json({ message: "Accès refusé" });
      offerId = offerIdRaw;
      const recipientId = isOwner ? offer.author : access.besoin.owner;
      await Notification.create({ to: recipientId, from: req.user.id, fromName: req.user?.name || "Utilisateur", type: "message", targetId: new mongoose.Types.ObjectId(besoinId), targetTitle: access.besoin.title || "", message: `${req.user?.name || "Quelqu'un"} vous a envoyé un message` }).catch(() => {});
    }
    const item = await ChatMessage.create({ besoinId, offerId, author: req.user.id, authorName: req.user?.name || "Utilisateur", text });
    res.status(201).json({ item });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////// FAVORITES ////////////////////
app.get("/favorites/mine", auth, async (req, res) => {
  try {
    const favs = await Favorite.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
    const besoinIds = favs.filter(f => f.targetType === "besoin").map(f => f.targetId);
    const annonceIds = favs.filter(f => f.targetType === "annonce").map(f => f.targetId);
    const starIds = favs.filter(f => f.targetType === "star").map(f => f.targetId);
    const [besoins, annonces, stars] = await Promise.all([
      Besoin.find({ _id: { $in: besoinIds } }).lean(),
      Annonce.find({ _id: { $in: annonceIds } }).lean(),
      Star.find({ _id: { $in: starIds } }).lean(),
    ]);
    const mapB = new Map(besoins.map(x => [String(x._id), x]));
    const mapA = new Map(annonces.map(x => [String(x._id), x]));
    const mapS = new Map(stars.map(x => [String(x._id), x]));
    const items = favs.map(f => {
      const id = String(f.targetId);
      const doc = f.targetType === "besoin" ? mapB.get(id) : f.targetType === "annonce" ? mapA.get(id) : mapS.get(id);
      return doc ? { ...f, item: doc } : null;
    }).filter(Boolean);
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.post("/favorites/toggle", auth, async (req, res) => {
  try {
    const targetType = sanitizeText(req.body?.targetType || "");
    const targetId = sanitizeText(req.body?.targetId || "");
    if (!["besoin", "annonce", "star"].includes(targetType)) return res.status(400).json({ message: "Type invalide" });
    if (!isObjectIdLike(targetId)) return res.status(400).json({ message: "ID invalide" });
    const exists = targetType === "besoin" ? await Besoin.exists({ _id: targetId }) : targetType === "annonce" ? await Annonce.exists({ _id: targetId }) : await Star.exists({ _id: targetId });
    if (!exists) return res.status(404).json({ message: "Élément introuvable" });
    const q = { owner: req.user.id, targetType, targetId };
    const found = await Favorite.findOne(q).lean();
    if (found) { await Favorite.deleteOne({ _id: found._id }); return res.json({ ok: true, favorited: false }); }
    await Favorite.create(q);
    res.json({ ok: true, favorited: true });
  } catch (e) {
    if (String(e?.message || "").includes("E11000")) return res.json({ ok: true, favorited: true });
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////// NOTIFICATIONS ////////////////////
app.get("/notifications/mine", auth, async (req, res) => {
  try {
    const items = await Notification.find({ to: req.user.id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.get("/notifications/unread-count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ to: req.user.id, read: false });
    res.json({ count });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.put("/notifications/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany({ to: req.user.id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

app.put("/notifications/:id/read", auth, async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    await Notification.updateOne({ _id: id, to: req.user.id }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e?.message || "Erreur serveur" }); }
});

//////////////////////////////////////////////////////
// START
//////////////////////////////////////////////////////
app.listen(PORT, "127.0.0.1", () => {
  console.log("✅ Backend listening on http://127.0.0.1:" + PORT);
});

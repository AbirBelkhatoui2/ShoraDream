// server.cjs (COMPLET)

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = 3001;
const SECRET = "SECRET_KEY_TEST";

//////////////////////////////////////////////////////
// MongoDB
//////////////////////////////////////////////////////
mongoose
  .connect("mongodb+srv://Test:1234@cluster0.lwaikno.mongodb.net/shoradream?appName=Cluster0")
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ MongoDB erreur:", err));

//////////////////////////////////////////////////////
// Nodemailer — configure ton email ici
//////////////////////////////////////////////////////
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "TONMAIL@gmail.com",      // ← remplace par ton email Gmail
    pass: "TON_MOT_DE_PASSE_APP",   // ← mot de passe d'application Google (16 car.)
  },
});

// Map en mémoire : email -> { code, expiresAt }
const resetCodes = new Map();

//////////////////////////////////////////////////////
// Multer config (IMAGES uniquement)
//////////////////////////////////////////////////////
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype);
    cb(ok ? null : new Error("Fichier image invalide"), ok);
  },
});

//////////////////////////////////////////////////////
// Models
//////////////////////////////////////////////////////

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "", trim: true },           // ✅ NOUVEAU
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
  },
  { timestamps: true }
);

const starSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    images: {
      type: [String],
      default: [],
      validate: { validator: (arr) => Array.isArray(arr) && arr.length <= 4, message: "Max 4 images" },
    },
  },
  { timestamps: true }
);

const annonceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    stars: { type: Number, default: 0, min: 0, max: 5 },
    status: { type: String, enum: ["active", "pending", "closed"], default: "active" },
    images: {
      type: [String],
      default: [],
      validate: { validator: (arr) => Array.isArray(arr) && arr.length <= 4, message: "Max 4 images" },
    },
  },
  { timestamps: true }
);

const besoinSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, default: "general", trim: true },
    location: { type: String, default: "", trim: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["open", "closed", "done"], default: "open" },
    acceptedOfferId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", default: null },
    images: {
      type: [String],
      default: [],
      validate: { validator: (arr) => Array.isArray(arr) && arr.length <= 4, message: "Max 4 images" },
    },
  },
  { timestamps: true }
);

const offerSchema = new mongoose.Schema(
  {
    besoinId: { type: mongoose.Schema.Types.ObjectId, ref: "Besoin", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, default: "Utilisateur" },
    message: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    accepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const messageSchema = new mongoose.Schema(
  {
    besoinId: { type: mongoose.Schema.Types.ObjectId, ref: "Besoin", required: true, index: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: false, default: null, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    authorName: { type: String, default: "Utilisateur" },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const favoriteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["besoin", "annonce", "star"], required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: true }
);

// Index performance
offerSchema.index({ besoinId: 1, author: 1 });
messageSchema.index({ besoinId: 1, offerId: 1, createdAt: 1 });
besoinSchema.index({ owner: 1, createdAt: -1 });
annonceSchema.index({ owner: 1, createdAt: -1 });
starSchema.index({ owner: 1, createdAt: -1 });
favoriteSchema.index({ owner: 1, targetType: 1, targetId: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
const Star = mongoose.model("Star", starSchema);
const Annonce = mongoose.model("Annonce", annonceSchema);
const Besoin = mongoose.model("Besoin", besoinSchema);
const Offer = mongoose.model("Offer", offerSchema);
const ChatMessage = mongoose.model("ChatMessage", messageSchema);
const Favorite = mongoose.model("Favorite", favoriteSchema);

//////////////////////////////////////////////////////
// Auth middleware
//////////////////////////////////////////////////////
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Token manquant" });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide" });
  }
}

//////////////////////////////////////////////////////
// Helpers
//////////////////////////////////////////////////////
function isObjectIdLike(v) {
  return typeof v === "string" && v.match(/^[0-9a-fA-F]{24}$/);
}

function safeUnlinkUpload(publicPath) {
  if (!publicPath || typeof publicPath !== "string") return;
  if (!publicPath.startsWith("/uploads/")) return;
  const rel = publicPath.replace("/uploads/", "");
  const full = path.join(__dirname, "uploads", rel);
  fs.unlink(full, () => {});
}

function parseKeepImages(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch { return []; }
  }
  return [];
}

function sanitizeText(v, max = 200000) {
  const s = String(v ?? "").replace(/\0/g, "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

const RL = new Map();
function rateLimit({ windowMs = 10_000, max = 12 } = {}) {
  return (req, res, next) => {
    const key = `${req.user?.id || "anon"}:${req.path}`;
    const now = Date.now();
    const cur = RL.get(key) || { count: 0, ts: now };
    if (now - cur.ts > windowMs) { cur.count = 0; cur.ts = now; }
    cur.count++;
    RL.set(key, cur);
    if (cur.count > max) return res.status(429).json({ message: "Trop de requêtes. Réessaie." });
    next();
  };
}

async function canAccessBesoin(reqUserId, besoinId) {
  const besoin = await Besoin.findById(besoinId).lean();
  if (!besoin) return { ok: false, reason: "Besoin introuvable" };
  const isOwner = String(besoin.owner) === String(reqUserId);
  if (isOwner) return { ok: true, besoin, role: "owner" };
  const hasOffer = await Offer.exists({ besoinId, author: reqUserId });
  if (hasOffer) return { ok: true, besoin, role: "offer_author" };
  return { ok: false, reason: "Accès refusé" };
}

//////////////////////////////////////////////////////
// Routes de base
//////////////////////////////////////////////////////
app.get("/", (req, res) => res.send("OK"));
app.get("/ping", (req, res) => res.json({ ok: true }));

//////////////////// PUBLIC PROFILE ////////////////////
app.get("/users/public/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const u = await User.findById(id).lean();
    if (!u) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({
      user: {
        id: u._id,
        firstName: u.firstName || "",
        name: u.name,
        avatar: u.avatar || "",
        phone: u.phone || "",
        location: u.location || "",
        topSkills: u.topSkills || [],
        summary: u.summary || "",
      },
    });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////// REGISTER ////////////////////
app.post("/register", async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || "").trim();  // ✅ NOUVEAU
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const phone = String(req.body?.phone || "").trim();
    const location = String(req.body?.location || "").trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    const existingEmail = await User.findOne({ email }).lean();
    if (existingEmail) return res.status(400).json({ message: "Email déjà utilisé" });

    const existingName = await User.findOne({ name }).lean();
    if (existingName) return res.status(400).json({ message: "Nom déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      name,
      email,
      phone,
      location,
      password: hashedPassword,
      topSkills: [],
      summary: "",
    });

    res.json({
      message: "Utilisateur créé",
      user: {
        id: newUser._id,
        firstName: newUser.firstName || "",
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || "",
        location: newUser.location || "",
        avatar: newUser.avatar || "",
        topSkills: newUser.topSkills || [],
        summary: newUser.summary || "",
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: err?.message || "Erreur serveur" });
  }
});

//////////////////// LOGIN ////////////////////
app.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) return res.status(400).json({ message: "Champs manquants" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Email incorrect" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign({ id: user._id, name: user.name }, SECRET, { expiresIn: "2h" });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName || "",
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        location: user.location || "",
        avatar: user.avatar || "",
        topSkills: user.topSkills || [],
        summary: user.summary || "",
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: err?.message || "Erreur serveur" });
  }
});

//////////////////// MOT DE PASSE OUBLIÉ ////////////////////

// Étape 1 : envoyer le code par email
app.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email requis" });

    const user = await User.findOne({ email }).lean();
    // Sécurité : on répond toujours OK même si l'email n'existe pas
    if (!user) return res.json({ message: "Si cet email existe, un code a été envoyé." });

    // Générer un code à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    resetCodes.set(email, { code, expiresAt });

    // Envoyer l'email
    await transporter.sendMail({
      from: '"ShoraDream ✨" <TONMAIL@gmail.com>',  // ← remplace
      to: email,
      subject: "Ton code de réinitialisation ShoraDream",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
          <h2 style="color: #8B5CF6;">✨ ShoraDream</h2>
          <p>Voici ton code de réinitialisation :</p>
          <div style="
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            text-align: center;
            padding: 20px;
            background: #f5f5ff;
            border-radius: 12px;
            color: #050B2E;
            margin: 20px 0;
          ">${code}</div>
          <p style="color: #666; font-size: 13px;">
            Ce code expire dans <strong>10 minutes</strong>.<br/>
            Si tu n'as pas demandé de réinitialisation, ignore cet email.
          </p>
        </div>
      `,
    });

    res.json({ message: "Code envoyé !" });
  } catch (e) {
    console.error("FORGOT PASSWORD ERROR:", e);
    res.status(500).json({ message: e?.message || "Erreur envoi email" });
  }
});

// Étape 2 : vérifier le code + nouveau mot de passe
app.post("/reset-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Champs manquants" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Minimum 6 caractères" });
    }

    const stored = resetCodes.get(email);
    if (!stored) {
      return res.status(400).json({ message: "Aucun code demandé pour cet email" });
    }
    if (Date.now() > stored.expiresAt) {
      resetCodes.delete(email);
      return res.status(400).json({ message: "Code expiré. Fais une nouvelle demande." });
    }
    if (stored.code !== code) {
      return res.status(400).json({ message: "Code incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ email }, { $set: { password: hashed } });
    resetCodes.delete(email);

    res.json({ message: "Mot de passe modifié avec succès !" });
  } catch (e) {
    console.error("RESET PASSWORD ERROR:", e);
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////// UPDATE PROFILE ////////////////////
app.put("/users/me", auth, async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || "").trim(); // ✅ NOUVEAU
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = String(req.body?.phone || "").trim();
    const location = String(req.body?.location || "").trim();
    const summary = String(req.body?.summary || "").trim();
    const topSkillsRaw = req.body?.topSkills;

    let topSkills = [];
    if (Array.isArray(topSkillsRaw)) {
      topSkills = topSkillsRaw.map((x) => String(x || "").trim()).filter(Boolean);
    } else if (typeof topSkillsRaw === "string") {
      topSkills = topSkillsRaw.split(",").map((x) => x.trim()).filter(Boolean);
    }
    topSkills = topSkills.slice(0, 20);

    if (!name) return res.status(400).json({ message: "Nom obligatoire" });
    if (!email) return res.status(400).json({ message: "Email obligatoire" });

    const existingEmail = await User.findOne({ email, _id: { $ne: req.user.id } }).lean();
    if (existingEmail) return res.status(400).json({ message: "Email déjà utilisé" });

    const existingName = await User.findOne({ name, _id: { $ne: req.user.id } }).lean();
    if (existingName) return res.status(400).json({ message: "Nom déjà utilisé" });

    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: "Utilisateur introuvable" });

    u.firstName = firstName;
    u.name = name;
    u.email = email;
    u.phone = phone;
    u.location = location;
    u.topSkills = topSkills;
    u.summary = summary;

    await u.save();

    res.json({
      user: {
        id: u._id,
        firstName: u.firstName || "",
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        location: u.location || "",
        avatar: u.avatar || "",
        topSkills: Array.isArray(u.topSkills) ? u.topSkills : [],
        summary: u.summary || "",
      },
    });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////// UPLOAD AVATAR ////////////////////
app.post("/users/avatar", auth, uploadImage.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Image manquante" });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    user.avatar = "/uploads/images/" + req.file.filename;
    await user.save();
    res.json({ avatar: user.avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur upload avatar" });
  }
});

//////////////////// STARS ////////////////////
app.get("/stars/mine", auth, async (req, res) => {
  try {
    const items = await Star.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.get("/stars", auth, async (req, res) => {
  try {
    const items = await Star.find({ owner: { $ne: req.user.id } }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.post("/stars", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title, 200000);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const images = (req.files || []).map((f) => "/uploads/images/" + f.filename).slice(0, 4);
    const created = await Star.create({ owner: req.user.id, title, images });
    res.status(201).json({ item: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////// ANNONCES ////////////////////
app.get("/annonces/mine", auth, async (req, res) => {
  const items = await Annonce.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ items });
});

app.get("/annonces", auth, async (req, res) => {
  try {
    const items = await Annonce.find({ owner: { $ne: req.user.id } }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.post("/annonces", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title, 200000);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const description = sanitizeText(req.body?.description, 200000);
    const location = sanitizeText(req.body?.location, 200000);
    const stars = Number(req.body?.stars || 0);
    const status = String(req.body?.status || "active");
    const images = (req.files || []).map((f) => "/uploads/images/" + f.filename).slice(0, 4);
    const created = await Annonce.create({ owner: req.user.id, title, description, location, stars, status, images });
    res.status(201).json({ item: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.put("/annonces/:id", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Annonce.findById(id);
    if (!item) return res.status(404).json({ message: "Annonce introuvable" });
    if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    const keepImages = parseKeepImages(req.body?.keepImages);
    const newImages = (req.files || []).map((f) => "/uploads/images/" + f.filename);
    const toDelete = (item.images || []).filter((img) => !keepImages.includes(img));
    toDelete.forEach(safeUnlinkUpload);
    const merged = [...keepImages, ...newImages].slice(0, 4);
    if (req.body?.title != null) item.title = sanitizeText(req.body.title, 200000) || item.title;
    if (req.body?.description != null) item.description = sanitizeText(req.body.description, 200000);
    if (req.body?.location != null) item.location = sanitizeText(req.body.location, 200000);
    if (req.body?.stars != null) item.stars = Number(req.body.stars || item.stars);
    if (req.body?.status != null) item.status = String(req.body.status);
    item.images = merged;
    await item.save();
    res.json({ item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
    ]);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.post("/besoins", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const title = sanitizeText(req.body?.title, 200000);
    if (!title) return res.status(400).json({ message: "Titre obligatoire" });
    const created = await Besoin.create({
      owner: req.user.id,
      title,
      description: sanitizeText(req.body?.description, 200000),
      category: sanitizeText(req.body?.category || "general", 200000),
      location: sanitizeText(req.body?.location, 200000),
      priority: String(req.body?.priority || "medium"),
      status: String(req.body?.status || "open"),
      images: (req.files || []).map((f) => "/uploads/images/" + f.filename).slice(0, 4),
    });
    res.status(201).json({ item: created });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.put("/besoins/:id", auth, uploadImage.array("images", 4), async (req, res) => {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) return res.status(400).json({ message: "ID invalide" });
    const item = await Besoin.findById(id);
    if (!item) return res.status(404).json({ message: "Besoin introuvable" });
    if (String(item.owner) !== String(req.user.id)) return res.status(403).json({ message: "Accès refusé" });
    const keepImages = parseKeepImages(req.body?.keepImages);
    const newImages = (req.files || []).map((f) => "/uploads/images/" + f.filename);
    const toDelete = (item.images || []).filter((img) => !keepImages.includes(img));
    toDelete.forEach(safeUnlinkUpload);
    const merged = [...keepImages, ...newImages].slice(0, 4);
    if (req.body?.title != null) item.title = sanitizeText(req.body.title, 200000) || item.title;
    if (req.body?.description != null) item.description = sanitizeText(req.body.description, 200000);
    if (req.body?.category != null) item.category = sanitizeText(req.body.category, 200000);
    if (req.body?.location != null) item.location = sanitizeText(req.body.location, 200000);
    if (req.body?.priority != null) item.priority = String(req.body.priority);
    if (req.body?.status != null) item.status = String(req.body.status);
    item.images = merged;
    await item.save();
    res.json({ item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////// OFFERS ////////////////////
app.get("/besoins/:id/offers", auth, async (req, res) => {
  try {
    const besoinId = req.params.id;
    if (!isObjectIdLike(besoinId)) return res.status(400).json({ message: "ID invalide" });
    const exists = await Besoin.exists({ _id: besoinId });
    if (!exists) return res.status(404).json({ message: "Besoin introuvable" });
    const items = await Offer.find({ besoinId }).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.post("/besoins/:id/offers", auth, uploadImage.single("image"), async (req, res) => {
  try {
    const besoinId = req.params.id;
    if (!isObjectIdLike(besoinId)) return res.status(400).json({ message: "ID invalide" });
    const message = sanitizeText(req.body?.message, 200000);
    if (!message) return res.status(400).json({ message: "Message requis" });
    const besoin = await Besoin.findById(besoinId).lean();
    if (!besoin) return res.status(404).json({ message: "Besoin introuvable" });
    if (besoin.status !== "open") return res.status(400).json({ message: "Besoin non ouvert" });
    if (String(besoin.owner) === String(req.user.id)) {
      return res.status(400).json({ message: "Tu ne peux pas proposer sur ton propre besoin." });
    }
    const image = req.file ? "/uploads/images/" + req.file.filename : "";
    const item = await Offer.create({
      besoinId,
      author: req.user.id,
      authorName: req.user?.name || "Utilisateur",
      message,
      image,
      accepted: false,
    });
    res.status(201).json({ item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.post("/offers/:offerId/accept", auth, async (req, res) => {
  try {
    const offerId = req.params.offerId;
    if (!isObjectIdLike(offerId)) return res.status(400).json({ message: "ID invalide" });
    const offer = await Offer.findById(offerId).lean();
    if (!offer) return res.status(404).json({ message: "Offre introuvable" });
    const besoin = await Besoin.findById(offer.besoinId);
    if (!besoin) return res.status(404).json({ message: "Besoin introuvable" });
    if (String(besoin.owner) !== String(req.user.id)) {
      return res.status(403).json({ message: "Seul le propriétaire du besoin peut accepter." });
    }
    if (besoin.status !== "open") return res.status(400).json({ message: "Besoin non ouvert." });
    await Offer.updateMany({ besoinId: besoin._id }, { $set: { accepted: false } });
    await Offer.updateOne({ _id: offerId }, { $set: { accepted: true } });
    besoin.status = "closed";
    besoin.acceptedOfferId = offerId;
    await besoin.save();
    res.json({ ok: true, besoinId: String(besoin._id), offerId });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
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
    const items = await ChatMessage.find(q).sort({ createdAt: 1 }).limit(300).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.post("/chat/:besoinId/messages", auth, rateLimit({ windowMs: 10_000, max: 12 }), async (req, res) => {
  try {
    const besoinId = req.params.besoinId;
    if (!isObjectIdLike(besoinId)) return res.status(400).json({ message: "ID invalide" });
    const access = await canAccessBesoin(req.user.id, besoinId);
    if (!access.ok) return res.status(403).json({ message: access.reason });
    const text = sanitizeText(req.body?.text, 200000);
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
    }
    const item = await ChatMessage.create({
      besoinId, offerId,
      author: req.user.id,
      authorName: req.user?.name || "Utilisateur",
      text,
    });
    res.status(201).json({ item });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////// FAVORITES ////////////////////
app.get("/favorites/mine", auth, async (req, res) => {
  try {
    const favs = await Favorite.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
    const besoinIds = favs.filter((f) => f.targetType === "besoin").map((f) => f.targetId);
    const annonceIds = favs.filter((f) => f.targetType === "annonce").map((f) => f.targetId);
    const starIds = favs.filter((f) => f.targetType === "star").map((f) => f.targetId);
    const [besoins, annonces, stars] = await Promise.all([
      Besoin.find({ _id: { $in: besoinIds } }).lean(),
      Annonce.find({ _id: { $in: annonceIds } }).lean(),
      Star.find({ _id: { $in: starIds } }).lean(),
    ]);
    const mapB = new Map(besoins.map((x) => [String(x._id), x]));
    const mapA = new Map(annonces.map((x) => [String(x._id), x]));
    const mapS = new Map(stars.map((x) => [String(x._id), x]));
    const items = favs.map((f) => {
      const id = String(f.targetId);
      const doc = f.targetType === "besoin" ? mapB.get(id) : f.targetType === "annonce" ? mapA.get(id) : mapS.get(id);
      if (!doc) return null;
      return { ...f, item: doc };
    }).filter(Boolean);
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

app.post("/favorites/toggle", auth, async (req, res) => {
  try {
    const targetType = String(req.body?.targetType || "").trim();
    const targetId = String(req.body?.targetId || "").trim();
    if (!["besoin", "annonce", "star"].includes(targetType)) return res.status(400).json({ message: "Type invalide" });
    if (!isObjectIdLike(targetId)) return res.status(400).json({ message: "ID invalide" });
    const exists =
      targetType === "besoin" ? await Besoin.exists({ _id: targetId }) :
      targetType === "annonce" ? await Annonce.exists({ _id: targetId }) :
      await Star.exists({ _id: targetId });
    if (!exists) return res.status(404).json({ message: "Élément introuvable" });
    const q = { owner: req.user.id, targetType, targetId };
    const found = await Favorite.findOne(q).lean();
    if (found) {
      await Favorite.deleteOne({ _id: found._id });
      return res.json({ ok: true, favorited: false });
    }
    await Favorite.create(q);
    res.json({ ok: true, favorited: true });
  } catch (e) {
    if (String(e?.message || "").includes("E11000")) return res.json({ ok: true, favorited: true });
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

//////////////////////////////////////////////////////
// START
//////////////////////////////////////////////////////
app.listen(PORT, "127.0.0.1", () => {
  console.log("✅ Backend listening on http://127.0.0.1:" + PORT);
});

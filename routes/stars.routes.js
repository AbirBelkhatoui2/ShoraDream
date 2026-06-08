import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import Star from "../models/star.js";

const router = express.Router();

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /stars/mine  => mes étoiles
router.get("/mine", auth, async (req, res) => {
  try {
    if (!isObjectId(req.userId)) {
      return res.status(401).json({ message: "Token invalide (userId)" });
    }

    const items = await Star.find({ owner: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    return res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

// POST /stars  => upload mp3
// ⚠️ multer sera injecté depuis le serveur (voir étape 3)
router.post("/", auth, async (req, res) => {
  return res.status(500).json({ message: "multer non branché sur /stars (voir serveur)" });
});

export default router;
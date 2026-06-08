// mon-react-app/routes/besoins.routes.js
import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import Besoin from "../models/Besoin.js";
import Offer from "../models/offer.js";

const router = express.Router();

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /besoins/mine
 * Renvoie les besoins du user + offersCount
 */
router.get("/mine", auth, async (req, res) => {
  try {
    if (!isObjectId(req.userId)) {
      return res.status(401).json({ message: "Token invalide (userId)" });
    }

    const ownerId = new mongoose.Types.ObjectId(req.userId);

    const items = await Besoin.aggregate([
      { $match: { owner: ownerId } },
      {
        $lookup: {
          from: "offers",
          localField: "_id",
          foreignField: "besoinId",
          as: "offers",
        },
      },
      { $addFields: { offersCount: { $size: "$offers" } } },
      { $project: { offers: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

/**
 * GET /besoins
 * Renvoie les besoins des autres users + offersCount
 */
router.get("/", auth, async (req, res) => {
  try {
    if (!isObjectId(req.userId)) {
      return res.status(401).json({ message: "Token invalide (userId)" });
    }

    const myId = new mongoose.Types.ObjectId(req.userId);

    const items = await Besoin.aggregate([
      { $match: { owner: { $ne: myId } } },
      {
        $lookup: {
          from: "offers",
          localField: "_id",
          foreignField: "besoinId",
          as: "offers",
        },
      },
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

/**
 * POST /besoins/:id/offers
 * Créer une offre sur un besoin
 */
router.post("/:id/offers", auth, async (req, res) => {
  try {
    const besoinId = req.params.id;
    if (!isObjectId(besoinId)) return res.status(400).json({ message: "ID invalide" });

    const message = String(req.body?.message || "").trim();
    if (!message) return res.status(400).json({ message: "Message requis" });

    const besoin = await Besoin.findById(besoinId).lean();
    if (!besoin) return res.status(404).json({ message: "Besoin introuvable" });

    // empêcher proposer sur son propre besoin
    if (String(besoin.owner) === String(req.userId)) {
      return res.status(400).json({ message: "Tu ne peux pas proposer sur ton propre besoin." });
    }

    const item = await Offer.create({
      besoinId,
      author: req.userId,
      authorName: req.user?.name || "Utilisateur",
      message,
    });

    res.status(201).json({ item });
  } catch (e) {
    res.status(500).json({ message: e?.message || "Erreur serveur" });
  }
});

export default router;
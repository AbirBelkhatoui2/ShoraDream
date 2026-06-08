import mongoose from "mongoose";

const OfferSchema = new mongoose.Schema(
  {
    besoinId: { type: mongoose.Schema.Types.ObjectId, ref: "Besoin", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Offer", OfferSchema);
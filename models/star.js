import mongoose from "mongoose";

const StarSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    audio: { type: String, required: true }, // ex: "/uploads/audio/xxx.mp3"
  },
  { timestamps: true }
);

export default mongoose.model("Star", StarSchema);
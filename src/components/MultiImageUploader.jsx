import { useRef, useState } from "react";

export default function MultiImageUploader({ images, setImages }) {
  const fileRef = useRef(null);

  const [active, setActive] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const compressImage = (file) =>
    new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => (img.src = e.target.result);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const MAX_WIDTH = 1200;
        const scale = Math.min(1, MAX_WIDTH / img.width);

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
          "image/jpeg",
          0.8
        );
      };

      reader.readAsDataURL(file);
    });

  const handleFiles = async (files) => {
    let selected = Array.from(files || []);
    if (images.length + selected.length > 4) {
      selected = selected.slice(0, 4 - images.length);
    }
    const compressed = await Promise.all(selected.map((f) => compressImage(f)));
    setImages((prev) => [...prev, ...compressed]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const animateOnce = () => {
    setPressed(false);
    requestAnimationFrame(() => setPressed(true));
    setTimeout(() => setPressed(false), 850);
  };

  return (
    <div>
      <div style={{ marginBottom: 8 }}>{images.length}/4 photos</div>

      <div
        className={["drop-zone", active ? "drop-zone--active" : "", dragOver ? "drop-zone--drag" : ""].join(" ")}
        onClick={() => {
          setActive((v) => !v);
          animateOnce();
          fileRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span className={["drop-text", pressed ? "drop-text--pulse" : ""].join(" ")}>
          🖼️
        </span>
      </div>

      <div className="preview-grid">
        {images.map((img, i) => (
          <div key={i} className="preview-item">
            <img src={URL.createObjectURL(img)} alt="" loading="lazy" />
            <button className="remove-btn" type="button" onClick={() => removeImage(i)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
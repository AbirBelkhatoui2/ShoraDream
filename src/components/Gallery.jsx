export default function Gallery({ images = [], alt = "" }) {
  const imgs = (images || []).filter(Boolean).slice(0, 4);
  if (imgs.length === 0) return null;

  if (imgs.length === 1) {
    return (
      <div className="gal-1">
        <img src={imgs[0]} alt={alt} />
      </div>
    );
  }

  if (imgs.length === 2) {
    return (
      <div className="gal-2">
        {imgs.map((src, i) => (
          <img key={i} src={src} alt={alt} />
        ))}
      </div>
    );
  }

  if (imgs.length === 3) {
    return (
      <div className="gal-3">
        <img className="gal-3-big" src={imgs[0]} alt={alt} />
        <div className="gal-3-right">
          <img src={imgs[1]} alt={alt} />
          <img src={imgs[2]} alt={alt} />
        </div>
      </div>
    );
  }

  return (
    <div className="gal-4">
      {imgs.map((src, i) => (
        <img key={i} src={src} alt={alt} />
      ))}
    </div>
  );
}
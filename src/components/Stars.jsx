export default function Stars() {
  const topStars = Array.from({ length: 44 });

  return (
    <>
      {/* Ligne d’étoiles en haut */}
      <div className="top-stars">
        {topStars.map((_, i) => (
          <span key={i}></span>
        ))}
      </div>

      {/* Petites particules */}
      <div className="sparkles" aria-hidden="true">
        {Array.from({ length: 36 }).map((_, i) => (
          <span key={i} className="sparkle" />
        ))}
      </div>
    </>
  );
}

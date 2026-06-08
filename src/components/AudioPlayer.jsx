export default function AudioPlayer({ src }) {
  if (!src) return null;

  return (
    <audio controls style={{ width: "100%", marginTop: 12 }}>
      <source src={src} />
      Your browser does not support audio.
    </audio>
  );
}

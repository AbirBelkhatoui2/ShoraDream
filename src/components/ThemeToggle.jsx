export default function ThemeToggle() {
  return (
    <button
      className="side-icon"
      onClick={() => document.body.classList.toggle("light")}
      title="Theme"
    >
      🌗
    </button>
    
  );
}

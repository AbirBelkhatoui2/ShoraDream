export default function Post({ user, text }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <p
        style={{
          fontSize: "15px",
          opacity: 0.85,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        <strong style={{ opacity: 1 }}>{user}</strong> — {text}
      </p>
    </div>
  );
}

import Sidebar from "../components/SideBar.jsx";
import "../styles/home.css";

export default function Menu() {
  return (
    <div className="home">
      <Sidebar />
      <main className="home__stage">
        <div className="wish" style={{ marginTop: 80 }}>
          <h1 className="wish__title">Menu</h1>
          <p className="wish__subtitle">Page Menu ✅</p>
        </div>
      </main>
    </div>
  );
}

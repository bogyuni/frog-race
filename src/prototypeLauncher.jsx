// 구 React 프로토타입(육성 버전)을 #root에 마운트하는 런처
// 타이틀 씬에서 동적 import로 호출 → Phaser 게임을 내리고 React를 띄운다
import { createRoot } from "react-dom/client";
import FrogDerby from "./prototype/frog-derby.jsx";

export function mountPrototype() {
  // Phaser용으로 잠가둔 스크롤을 프로토타입에서는 해제
  document.documentElement.style.overflow = "auto";
  document.body.style.overflow = "auto";

  const el = document.getElementById("root");
  el.innerHTML = "";
  const root = createRoot(el);
  root.render(
    <>
      <button
        onClick={() => location.reload()}
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 1000,
          fontFamily: "'Jua', sans-serif",
          fontSize: 14,
          background: "#16382F",
          color: "#6FBF73",
          border: "2px solid #6FBF73",
          borderRadius: 12,
          padding: "8px 14px",
          cursor: "pointer",
        }}
      >
        ← 레이스로 돌아가기
      </button>
      <FrogDerby />
    </>
  );
}

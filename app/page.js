"use client";  // これを追加しないと Next.js で表示されない！

import Login from "../components/Login"; // Login.js を読み込む

export default function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>ようこそ！</h1>
      <Login />  {/* Googleログインボタンを表示 */}
    </div>
  );
}

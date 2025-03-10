"use client";  // これを追加しないと動かない！

import { useState, useEffect } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";  // Firebaseの設定を読み込む

const Login = () => {
  const [user, setUser] = useState(null);

  // ログイン処理
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  // ユーザーのログイン状態を監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      {user ? (
        <div>
          <p>こんにちは、{user.displayName} さん！</p>
          <p>Email: {user.email}</p>
          <button onClick={handleLogout} style={{ padding: "10px", fontSize: "16px", marginTop: "10px" }}>
            ログアウト
          </button>
        </div>
      ) : (
        <button onClick={handleLogin} style={{ padding: "10px", fontSize: "16px" }}>
          Googleでログイン
        </button>
      )}
    </div>
  );
};

export default Login;

"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const Itinerary = () => {
  const [itinerary, setItinerary] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [nextStepReady, setNextStepReady] = useState(false);
  const [isRolling, setIsRolling] = useState(false);

  // 🔹 Firestore から旅程データをリアルタイム取得
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "itinerary"), (snapshot) => {
      const itineraryData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      itineraryData.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      setItinerary(itineraryData);

      // 進行状況を取得
      getDoc(doc(db, "appState", "progress")).then((progressSnap) => {
        if (progressSnap.exists()) {
          const progressData = progressSnap.data();
          const lastStep = itineraryData.find((step) => step.id === progressData.lastDrawnStep);
          if (lastStep) {
            setCurrentStep(lastStep);
            setNextStepReady(true);
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // 🔹 ユーザー情報を取得
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await checkAdmin(currentUser.email);
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // 🔹 Firestore で管理者かどうかを確認
  const checkAdmin = async (email) => {
    try {
      const adminRef = doc(db, "admins", email);
      const adminSnap = await getDoc(adminRef);
      setIsAdmin(adminSnap.exists());
    } catch (error) {
      console.error("管理者チェックエラー:", error);
      setIsAdmin(false);
    }
  };

  // 🔹 チェックが入った中で「一番下の旅程」を取得
  const getLastUnlockedStep = () => {
    return itinerary.filter(step => step.isUnlocked).pop() || null;
  };

  // 🔹 Googleログイン処理
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
    }
  };

  // 🔹 ログアウト処理
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  // 🔹 行程を開放・閉鎖する（管理者）
  const toggleStepUnlock = async (stepId, isUnlocked) => {
    if (!isAdmin) {
      setErrorMessage("管理者権限がありません！");
      return;
    }

    try {
      const docRef = doc(db, "itinerary", stepId);
      await updateDoc(docRef, { isUnlocked: !isUnlocked });

      setItinerary((prev) =>
        prev.map((step) => (step.id === stepId ? { ...step, isUnlocked: !isUnlocked } : step))
      );

      const lastUnlockedStep = getLastUnlockedStep();
      setCurrentStep(lastUnlockedStep);
      setNextStepReady(true);
    } catch (error) {
      console.error("Firestore の更新に失敗しました:", error);
      setErrorMessage("Firestore の更新に失敗しました。権限を確認してください。");
    }
  };

  // 🔹 くじ引き（ランダムっぽいモーション付き）
  const revealNextStep = async () => {
    if (isRolling || !nextStepReady) return;

    const lastUnlocked = getLastUnlockedStep();
    if (!lastUnlocked) {
      setErrorMessage("※次の行程が開放されていません！！！");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    setIsRolling(true);
    setErrorMessage("");

    let counter = 0;
    const maxFlips = 20;

    const interval = setInterval(() => {
      const randomStep = itinerary[Math.floor(Math.random() * itinerary.length)];
      setCurrentStep(randomStep);

      counter++;
      if (counter > maxFlips) {
        clearInterval(interval);

        setTimeout(async () => {
          setCurrentStep(lastUnlocked);
          setNextStepReady(false);
          setIsRolling(false);

          try {
            await setDoc(doc(db, "appState", "progress"), { lastDrawnStep: lastUnlocked.id });
          } catch (error) {
            console.error("Firestore 保存エラー:", error);
          }
        }, 500);
      }
    }, 80);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginBottom: "20px" }}>
        旅行のくじ引き 🎟️
      </h1>

      {!user ? (
        <div>
          <p>ログインしてください！</p>
          <button onClick={handleLogin} style={{ padding: "10px", fontSize: "16px" }}>
            Googleでログイン
          </button>
        </div>
      ) : (
        <div>
          {currentStep && (
            <div style={{ padding: "20px", background: "white", borderRadius: "10px", fontSize: "24px", fontWeight: "bold", color: "black" }}>
              {currentStep.title}
            </div>
          )}

          <button 
            onClick={revealNextStep} 
            style={{
              marginTop: "20px", 
              padding: "10px", 
              fontSize: "18px", 
              background: "#4CAF50", 
              color: "white", 
              opacity: nextStepReady ? "1" : "0.6", 
              cursor: nextStepReady ? "pointer" : "not-allowed"
            }}
            disabled={!nextStepReady || isRolling}
          >
            {isRolling ? "くじを引いています..." : "くじを引く 🎲"}
          </button>

          {errorMessage && <p style={{ color: "red", fontSize: "18px", marginTop: "10px" }}>{errorMessage}</p>}

          <button onClick={handleLogout} style={{ marginTop: "10px", padding: "10px", fontSize: "16px", background: "#FF6347", color: "white" }}>
            ログアウト
          </button>
        </div>
      )}

      {user && isAdmin && (
        <div style={{ marginTop: "30px", textAlign: "left", color: "white" }}>
          <h2>🛠 管理者メニュー</h2>
          {itinerary.map((step) => (
            <div key={step.id}>
              <label>
                <input
                  type="checkbox"
                  checked={step.isUnlocked}
                  onChange={() => toggleStepUnlock(step.id, step.isUnlocked)}
                />
                {step.title}（開放状況）
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Itinerary;

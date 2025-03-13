"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig"; // Firestore の設定をインポート
import { onAuthStateChanged } from "firebase/auth";

const Itinerary = () => {
  const [itinerary, setItinerary] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Firestore から旅程を取得
  useEffect(() => {
    const fetchItinerary = async () => {
      if (typeof window !== "undefined") {  // ← サーバーサイドで実行されないようにチェック
        const querySnapshot = await getDocs(collection(db, "itinerary"));
        const itineraryData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItinerary(itineraryData);
      }
    };
  
    fetchItinerary();
  }, []);
  

  // ユーザー情報を取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        checkAdmin(currentUser.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore で管理者かどうかを確認
  const checkAdmin = async (email) => {
    const adminEmails = ["admin1@gmail.com", "admin2@gmail.com"]; // Firestore で管理する場合はここを変更
    setIsAdmin(adminEmails.includes(email));
  };

  // 次の行程を開放する（管理者のみ）
  const unlockNextStep = async () => {
    if (!isAdmin || !currentStep) return;
    const nextStep = itinerary.find((step) => parseInt(step.id) === parseInt(currentStep.id) + 1);
    if (nextStep) {
      const docRef = doc(db, "itinerary", nextStep.id);
      await updateDoc(docRef, { isUnlocked: true });
      setCurrentStep(nextStep);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>旅行のくじ引き 🎟️</h1>
      {currentStep ? (
        <div>
          <h2>{currentStep.title}</h2>
          {currentStep.location && <p>📍 {currentStep.location}</p>}
          {isAdmin && (
            <button onClick={unlockNextStep} style={{ padding: "10px", fontSize: "16px", marginTop: "10px" }}>
              次の行程を開放する
            </button>
          )}
        </div>
      ) : (
        <p>現在の行程はありません</p>
      )}
    </div>
  );
};

export default Itinerary;

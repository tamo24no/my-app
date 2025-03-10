"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const Itinerary = () => {
  const [itinerary, setItinerary] = useState([]);
  const [currentStep, setCurrentStep] = useState(null);
  const [lastDrawnStep, setLastDrawnStep] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [displayStep, setDisplayStep] = useState(null);
  const [history, setHistory] = useState([]);
  const [isNextStepUnlocked, setIsNextStepUnlocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Firestore から旅程データを取得
  useEffect(() => {
    const fetchItinerary = async () => {
      const querySnapshot = await getDocs(collection(db, "itinerary"));
      const itineraryData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      itineraryData.sort((a, b) => parseInt(a.id) - parseInt(b.id)); // 順番に並べる
      setItinerary(itineraryData);

      // 進行状況を復元
      const progressRef = doc(db, "appState", "progress");
      const progressSnap = await getDoc(progressRef);

      if (progressSnap.exists()) {
        const progressData = progressSnap.data();
        const lastStep = itineraryData.find((step) => step.id === progressData.lastDrawnStep);
        
        if (lastStep) {
          setLastDrawnStep(lastStep);
          setCurrentStep(lastStep);
          setDisplayStep(lastStep);
          setHistory(itineraryData.slice(0, parseInt(lastStep.id))); // 履歴を復元
          checkNextStep(itineraryData, lastStep);
        }
      } else {
        const firstStep = itineraryData.find((step) => step.isUnlocked);
        setCurrentStep(firstStep);
        setDisplayStep(firstStep);
        checkNextStep(itineraryData, firstStep);
      }
    };

    fetchItinerary();
  }, []);

  // ユーザー情報を取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await checkAdmin(currentUser.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore で管理者かどうかを確認
  const checkAdmin = async (email) => {
    const querySnapshot = await getDocs(collection(db, "admins"));
    const adminEmails = querySnapshot.docs.map((doc) => doc.id);
    setIsAdmin(adminEmails.includes(email));
  };

  // 次の行程が開放されているかチェック
  const checkNextStep = (itineraryData, current) => {
    const nextStep = itineraryData.find((step) => parseInt(step.id) === parseInt(current?.id) + 1);
    setIsNextStepUnlocked(nextStep ? nextStep.isUnlocked : false);
  };

  // Googleログイン処理
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("ログインエラー:", error);
    }
  };

  // 行程を開放・閉鎖する（管理者）
  const toggleStepUnlock = async (stepId, isUnlocked) => {
    if (!isAdmin) return;
    const docRef = doc(db, "itinerary", stepId);
    await updateDoc(docRef, { isUnlocked: !isUnlocked });

    setItinerary((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, isUnlocked: !isUnlocked } : step))
    );

    if (parseInt(stepId) === parseInt(currentStep?.id) + 1) {
      setIsNextStepUnlocked(!isUnlocked);
    }
  };

  // くじ引き（超高速シャッフル & 継続表示）
  const revealNextStep = async () => {
    if (isRolling || !currentStep) return;

    if (!isNextStepUnlocked) {
      setErrorMessage("※次の行程が開放されていません！！！");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    setIsRolling(true);
    setErrorMessage(""); 

    let counter = 0;
    const maxFlips = 40; 

    const interval = setInterval(() => {
      const randomStep = itinerary[Math.floor(Math.random() * itinerary.length)];
      setDisplayStep(randomStep);

      counter++;
      if (counter > maxFlips) {
        clearInterval(interval);

        setTimeout(async () => {
          const nextStep = itinerary.find((step) => parseInt(step.id) === parseInt(currentStep.id) + 1 && step.isUnlocked);
          if (nextStep) {
            setHistory((prev) => [...prev, nextStep]);
            setDisplayStep(nextStep);
            setCurrentStep(nextStep);
            setLastDrawnStep(nextStep);
            checkNextStep(itinerary, nextStep);

            try {
              await setDoc(doc(db, "appState", "progress"), { lastDrawnStep: nextStep.id });
            } catch (error) {
              console.error("Firestore 保存エラー:", error);
            }
          }
          setIsRolling(false);
        }, 200);
      }
    }, 50);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff", marginBottom: "20px" }}>
        旅行のくじ引き 🎟️
      </h1>

      {!user && (
        <div>
          <p>ログインしてください！</p>
          <button onClick={handleLogin} style={{ padding: "10px", fontSize: "16px" }}>
            Googleでログイン
          </button>
        </div>
      )}

      {user && displayStep && (
        <div style={{ padding: "20px", background: "white", borderRadius: "10px", fontSize: "24px", fontWeight: "bold", color: "black" }}>
          {displayStep.title}
        </div>
      )}

      {user && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={revealNextStep} style={{ padding: "10px", fontSize: "18px", background: "#4CAF50", color: "white" }}>
            くじを引く 🎲
          </button>
          {errorMessage && <p style={{ color: "red", fontSize: "18px", marginTop: "10px" }}>{errorMessage}</p>}
        </div>
      )}

      {isAdmin && (
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

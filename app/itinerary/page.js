"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

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

  // Firestore から旅程データをリアルタイム取得
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "itinerary"), (snapshot) => {
      const itineraryData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      itineraryData.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      setItinerary(itineraryData);

      // 進行状況を復元
      getDoc(doc(db, "appState", "progress")).then((progressSnap) => {
        if (progressSnap.exists()) {
          const progressData = progressSnap.data();
          const lastStep = itineraryData.find((step) => step.id === progressData.lastDrawnStep);

          if (lastStep) {
            setLastDrawnStep(lastStep);
            setCurrentStep(lastStep);
            setDisplayStep(lastStep);
            setHistory(itineraryData.slice(0, parseInt(lastStep.id)));
            checkNextStep(itineraryData, lastStep);
          }
        } else {
          const firstStep = itineraryData.find((step) => step.isUnlocked);
          setCurrentStep(firstStep);
          setDisplayStep(firstStep);
          checkNextStep(itineraryData, firstStep);
        }
      });
    });

    return () => unsubscribe();
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

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  // 行程を開放・閉鎖する（管理者）
  const toggleStepUnlock = async (stepId, isUnlocked) => {
    if (!isAdmin) return;
    try {
      const docRef = doc(db, "itinerary", stepId);
      await updateDoc(docRef, { isUnlocked: !isUnlocked });

      if (!isUnlocked) {
        setIsNextStepUnlocked(true);
      } else {
        const lastUnlockedStep = itinerary
          .filter((step) => step.isUnlocked)
          .sort((a, b) => parseInt(a.id) - parseInt(b.id))
          .pop();
        setCurrentStep(lastUnlockedStep);
        setDisplayStep(lastUnlockedStep);
      }
    } catch (error) {
      console.error("Firestore の更新に失敗しました:", error);
      setErrorMessage("Firestore の更新に失敗しました。権限を確認してください。");
    }
  };

  // くじ引き（ランダム風アニメーション）
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
          const nextStep = itinerary.find((step) => step.isUnlocked);
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
      <h1>旅行のくじ引き 🎟️</h1>

      {!user ? (
        <button onClick={handleLogin}>Googleでログイン</button>
      ) : (
        <>
          {displayStep && <div>{displayStep.title}</div>}
          <button onClick={revealNextStep}>くじを引く 🎲</button>
          <button onClick={handleLogout}>ログアウト</button>
          {isAdmin && itinerary.map((step) => (
            <div key={step.id}>
              <label>
                <input type="checkbox" checked={step.isUnlocked} onChange={() => toggleStepUnlock(step.id, step.isUnlocked)} />
                {step.title}（開放状況）
              </label>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default Itinerary;

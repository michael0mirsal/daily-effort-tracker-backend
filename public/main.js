// ---------------- Service Worker + Push ----------------
if ("serviceWorker" in navigator && "PushManager" in window) {
  (async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("✅ Service Worker registered", reg);

      // Ask permission only once
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("❌ Notification permission denied");
        return;
      }

      // Get VAPID key
      const res = await fetch("/api/vapid-public-key");
      const publicKey = await res.text();
      const convertedKey = urlBase64ToUint8Array(publicKey);

      // Check if already subscribed
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        // 🔵 FIRST TIME ONLY
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        await fetch("/api/save-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub)
        });

        console.log("✅ New device subscribed");
      } else {
        console.log("✅ Already subscribed (no duplicate)");
      }

    } catch (err) {
      console.error("❌ Push registration failed:", err);
    }
  })();
}

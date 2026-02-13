// ---------------- Service Worker + Push ----------------
if ("serviceWorker" in navigator && "PushManager" in window) {
  (async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("✅ Service Worker registered", reg);

      // Request permission if not granted
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // Get VAPID key from server
      const res = await fetch("/api/vapid-public-key");
      const publicKey = await res.text();
      const convertedKey = urlBase64ToUint8Array(publicKey);

      // Subscribe user
      
      let sub = await reg.pushManager.getSubscription();

if (!sub) {
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


      // Send subscription to backend
      await fetch("/api/save-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub)
      });

      console.log("✅ Device subscribed to push notifications");

    } catch (err) {
      console.error("❌ Push registration failed:", err);
    }
  })();
}

// ---------------- Helper ----------------
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ================= SOCKET CONNECTION =================
const socket = io("https://daily-effort-tracker-backend.onrender.com");

// get logged user
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (currentUser?._id) {
  socket.emit("join", currentUser._id);   // join personal room
  console.log("🟢 Joined socket room:", currentUser._id);
}

// ================= RECEIVE NOTIFICATION =================
socket.on("notification", (data) => {
  console.log("📩 Notification received:", data);

  // Show browser notification
  if (Notification.permission === "granted") {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        reg.showNotification("📢 School Update", {
          body: data.message,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url: "/routine.html" }
        });
      }
    });
  }
});

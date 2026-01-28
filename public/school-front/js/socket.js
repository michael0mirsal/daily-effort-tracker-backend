// /public/js/socket.js

// Replace with your backend URL
const SERVER_URL = "https://daily-effort-tracker-backend.onrender.com";

console.log("🔥 socket.js loaded");
// Connect to Socket.IO
const socket = io(SERVER_URL);

// Function to join user-specific room
function joinUserRoom(userId) {
  socket.emit("join", userId);
}


// Listen for notifications
socket.on("notification", (data) => {
  console.log("🔔 New notification:", data);

  // Example: show an alert or update HTML
  const container = document.getElementById("notification-container");
  if (container) {
    const div = document.createElement("div");
    div.innerHTML = `<strong>${data.type}</strong>: ${data.message}`;
    container.prepend(div); // newest first
  }
});

// Export functions if using modules
// (optional if you just include script in HTML)

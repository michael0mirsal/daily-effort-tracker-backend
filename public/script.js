const addBtn = document.getElementById("addBtn");
const saveBtn = document.getElementById("saveBtn");
const showBtn = document.getElementById("showBtn");
const tableBody = document.getElementById("tableBody");
const effortList = document.getElementById("effortList");
const roleSelect = document.getElementById("roleSelect");

let items = [];
let currentRole = roleSelect.value;

roleSelect.addEventListener("change", () => {
  currentRole = roleSelect.value;
  if (effortList.innerHTML.trim() !== "") {
    document.getElementById("showBtn").click();
  }
});

// 🔹 Temporary table when adding items
function renderTable() {
  tableBody.innerHTML = "";
  items.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.activity}</td>
      <td>${item.timeMin}</td>
      <td>${"⭐".repeat(item.evaluation)}</td>
      <td>${item.note || ""}</td>
    `;
    tableBody.appendChild(row);
  });
}

// 🔹 Save efforts to server + clear table after save
// 🔹 Save efforts to server + clear table after save
saveBtn.addEventListener("click", async () => {
  const name = document.getElementById("nameSelect").value;
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // 🧩 Check required fields and added activities
  if (!name || !date || items.length === 0) {
    alert("⚠️ Please fill name, date, and add at least one activity!");
    return;
  }

  // 🧩 Check if at least one checkbox (star) is checked
  const checkedBoxes = document.querySelectorAll(".star-checkbox:checked");
  if (checkedBoxes.length === 0) {
    alert("⚠️ Please check at least one effort before saving!");
    return;
  }

  // 🧩 Collect checked data
  const checkedData = {};
  checkedBoxes.forEach(cb => {
    const key = cb.dataset.key;
    checkedData[key] = true;
  });

  try {
    const res = await fetch("/api/efforts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, items, checkedData }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("🎉 Great! Your effort was saved!");
      items = [];
      renderTable();
    } else {
      alert("⚠️ " + (data.message || "Server error"));
    }
  } catch (err) {
    console.error("❌ Save error:", err);
    alert("⚠️ Could not connect to the server.");
  }
});


// 🔹 Add activity
addBtn.addEventListener("click", () => {
  const activity = document.getElementById("activity").value.trim();
  const timeMin = parseInt(document.getElementById("timeMin").value);
  const evaluation = parseInt(document.getElementById("evaluation").value);
  const note = document.getElementById("note").value.trim();
  const date = document.getElementById("dateInput").value;
  const name = document.getElementById("nameSelect").value;

  if (!name || !date) {
    alert("⚠️ Please select your name and date first!");
    return;
  }

  if (!activity || !timeMin || !evaluation) {
    alert("⚠️ Please fill all fields except note!");
    return;
  }

  // 🧩 Check duplicate
  const exists = items.some(
    item =>
      item.activity.toLowerCase() === activity.toLowerCase() &&
      item.date === date &&
      item.name === name
  );

  if (exists) {
    alert("⚠️ You already added this activity for today!");
    return;
  }

  items.push({ name, date, activity, timeMin, evaluation, note });
  document.getElementById("activity").value = "";
  document.getElementById("timeMin").value = "";
  document.getElementById("evaluation").value = "";
  document.getElementById("note").value = "";

  renderTable();
});

// 🔹 Show records (✅ fixed)
showBtn.addEventListener("click", async () => {
  const name =
    document.getElementById("filterName").value ||
    localStorage.getItem("currentUser");
  const date = document.getElementById("filterDate").value;

  if (!name) {
    alert("⚠️ Please select a name or login first!");
    return;
  }

  const query = `/api/efforts/search?name=${encodeURIComponent(
    name
  )}${date ? `&date=${date}` : ""}`;
  console.log("Fetching:", query);

  const res = await fetch(query);
  const data = await res.json();

  effortList.innerHTML = "";
  if (!Array.isArray(data) || data.length === 0) {
    effortList.innerHTML = `<tr><td colspan="9">No records found 💬</td></tr>`;
    document.getElementById("motivation").style.display = "none";
    return;
  }

  // Always show the saving box
  document.getElementById("checkedStarsBox").style.visibility = "visible";
  document.getElementById("checkedStarsDisplay").style.visibility = "visible";

  const allItems = data.flatMap(r =>
    (r.items || []).map(it => ({ ...it, name: r.name, date: r.date }))
  );

  // 🧮 Total stars
  const totalStars = allItems.reduce(
    (sum, it) => sum + (Number(it.evaluation) || 0),
    0
  );

  showStarMotivation(totalStars);

  // 🧩 Show records
  allItems.forEach((it, idx) => {
    const key = `${it.name}_${it.date}_${it.activity}`;
    const motivation = getNoteMotivation(it.note);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${idx + 1}</td>
      <td>
        ${
          currentRole === "parent"
            ? `<input type="checkbox" class="star-checkbox" data-stars="${it.evaluation}" data-key="${key}">`
            : `<input type="checkbox" class="star-checkbox" data-stars="${it.evaluation}" data-key="${key}" disabled>`
        }
      </td>
      <td>${it.activity}</td>
      <td>${it.timeMin} min</td>
      <td>${"⭐".repeat(it.evaluation)}</td>
      <td>${it.note || ""}</td>
      <td>${it.date}</td>
      <td>${it.name}</td>
      <td class="motivation-cell">
        ${
          motivation
            ? `
          <div class="motivation-box">
            <img src="${motivation.img}" alt="mood" class="motivation-icon">
            <div class="motivation-text">${motivation.text}</div>
          </div>`
            : ""
        }
      </td>
    `;

    effortList.appendChild(row);
  });

  // Attach event listeners
  document.querySelectorAll(".star-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      updateCheckedStars();
      saveCheckedState();
    });
  });

  // Restore saved states
  loadCheckedState();
  updateCheckedStars();
});

// 🔹 Save checkbox state
function saveCheckedState() {
  const checkedData = {};
  document.querySelectorAll(".star-checkbox").forEach(cb => {
    const key = cb.dataset.key;
    checkedData[key] = cb.checked;
  });
  localStorage.setItem("checkedData", JSON.stringify(checkedData));
}

// 🔹 Load checkbox state
function loadCheckedState() {
  const checkedData = JSON.parse(localStorage.getItem("checkedData") || "{}");
  document.querySelectorAll(".star-checkbox").forEach(cb => {
    const key = cb.dataset.key;
    cb.checked = checkedData[key] || false;
  });
  updateCheckedStars();
}

// 🔹 Count checked stars dynamically
function updateCheckedStars() {
  let total = 0;
  document.querySelectorAll(".star-checkbox:checked").forEach(cb => {
    total += parseInt(cb.dataset.stars);
  });

  const box = document.getElementById("checkedStarsBox");
  const display = document.getElementById("checkedStarsDisplay");

  display.textContent = `${total}⭐`;

  // ✨ Animation
  box.style.transform = "scale(1.2)";
  box.style.boxShadow = "0 0 25px rgba(255, 215, 0, 0.8)";
  setTimeout(() => {
    box.style.transform = "scale(1)";
    box.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.4)";
  }, 400);
}

// 🔹 Motivation by note
function getNoteMotivation(noteText) {
  if (!noteText) return null;
  const note = noteText.toLowerCase();
  let text = "";
  let img = "";

  if (note.includes("sad")) {
    text = "💖 It’s okay to feel sad — tomorrow is a new start!";
    img = "images/comfort.png";
  } else if (note.includes("happy")) {
    text = "😊 So happy to see your joy!";
    img = "images/happy.png";
  } else if (note.includes("less")) {
    text = "🌱 Every small effort matters!";
    img = "images/try.png";
  } else if (note.includes("more")) {
    text = "💪 Great! Let’s do a bit more next time!";
    img = "images/more.png";
  } else if (note.includes("grow")) {
    text = "🌻 You’re growing every day!";
    img = "images/grow.png";
  } else if (note.includes("kind")) {
    text = "💞 Kindness makes you special!";
    img = "images/kind.png";
  } else if (note.includes("try")) {
    text = "🌈 Keep trying — you’re doing great!";
    img = "images/keep-trying.png";
  } else if (note.includes("love")) {
    text = "❤️ Love fills your heart with light!";
    img = "images/love.png";
  } else if (note.includes("like")) {
    text = "💖 It's wonderful that you like it! Keep enjoying what you do!";
    img = "images/like.png";
  } else if (note.includes("happiness")) {
    text = "🌞 Your happiness shines bright like the sun!";
    img = "images/happiness.png";
  } else {
    return null;
  }

  return { text, img };
}

// 🔹 Motivation box by total stars
function showStarMotivation(totalStars) {
  const box = document.getElementById("motivation");
  const img = document.getElementById("motivation-img");
  const text = document.getElementById("motivation-text");

  let message = "";
  let imgSrc = "";

  if (totalStars < 10) {
    message = `🌱 You earned ${totalStars}⭐ — Keep going! You’re just starting!`;
    imgSrc = "images/level1.png";
  } else if (totalStars < 20) {
    message = `🌻 Great! You have ${totalStars}⭐ — You’re growing stronger!`;
    imgSrc = "images/level2.png";
  } else if (totalStars < 30) {
    message = `🌈 Awesome! ${totalStars}⭐ — That’s shining effort!`;
    imgSrc = "images/level3.png";
  } else if (totalStars < 40) {
    message = `🚀 Fantastic! ${totalStars}⭐ — You’re reaching the stars!`;
    imgSrc = "images/level4.png";
  } else if (totalStars < 50) {
    message = `🔥 Amazing! ${totalStars}⭐ — Keep the flame burning!`;
    imgSrc = "images/level5.png";
  } else if (totalStars < 60) {
    message = `💎 Brilliant! ${totalStars}⭐ — You’re unstoppable!`;
    imgSrc = "images/level6.png";
  } else if (totalStars < 70) {
    message = `🦋 Wonderful! ${totalStars}⭐ — You’re spreading wings!`;
    imgSrc = "images/level7.png";
  } else if (totalStars < 80) {
    message = `🌟 Excellent! ${totalStars}⭐ — You shine bright!`;
    imgSrc = "images/level8.png";
  } else if (totalStars < 90) {
    message = `💫 Almost perfect! ${totalStars}⭐ — Keep pushing!`;
    imgSrc = "images/level9.png";
  } else {
    message = `👑 Incredible! ${totalStars}⭐ — You’re a true champion!`;
    imgSrc = "images/level10.png";
  }

  img.src = imgSrc;
  text.textContent = message;
  box.style.display = "block";
  box.style.transition = "transform 0.5s ease, opacity 0.5s ease";
  box.style.transform = "scale(1.1)";
  box.style.opacity = "1";
  setTimeout(() => {
    box.style.transform = "scale(1)";
  }, 500);
}

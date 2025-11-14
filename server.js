// ======================================================
// ✅ Imports & Setup
// ======================================================
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import familyRoutes from "./routes/familyRoutes.js"; // 🌳 Family System

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080; // Railway prefers 8080

// ======================================================
// ✅ Middleware
// ======================================================
app.use(cors());
app.use(express.json());

// ✅ Serve a welcome page (optional)
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "welcome.html"));
});

app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// ✅ Connect Family Login System Routes
// ======================================================
app.use("/api/families", familyRoutes);

// ======================================================
// ✅ File paths and utilities (Step 2 & 3 merged)
// ======================================================
const EFFORT_FILE = path.join(__dirname, "efforts.json");
const ROUTINE_FILE = path.join(__dirname, "routines.json");
const KIDS_STARS_FILE = path.join(__dirname, "kidsStars.json");

// --- Step 2: Correct families.json path
const FAMILIES_FILE = path.join(__dirname, "families.json");

// --- Step 3: Safe file creation utility
function ensureFile(file) {
  if (!fs.existsSync(file)) {
    console.log(`⚠ File not found, creating: ${file}`);
    fs.writeFileSync(file, "[]", "utf8");
  }
}

// Ensure all files exist
ensureFile(EFFORT_FILE);
ensureFile(ROUTINE_FILE);
ensureFile(KIDS_STARS_FILE);
ensureFile(FAMILIES_FILE);

// JSON loader / saver
function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
  } catch (err) {
    console.error(`❌ Error reading ${file}:`, err);
    return [];
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`❌ Error writing ${file}:`, err);
    return false;
  }
}

// ======================================================
// ✅ Effort APIs
// ======================================================
app.post("/api/efforts", (req, res) => {
  const { name, date, items, checkedData, family } = req.body;
  if (!name || !date || !Array.isArray(items))
    return res.status(400).json({ error: "Invalid data" });
  if (!family) return res.status(400).json({ error: "Missing family" });

  const allEfforts = loadJSON(EFFORT_FILE);
  const effortIndex = allEfforts.findIndex(
    (r) => r.name === name && r.family === family && r.date === date
  );

  const record = { name, family, date, items, checkedData };
  if (effortIndex >= 0) allEfforts[effortIndex] = record;
  else allEfforts.push(record);
  if (!saveJSON(EFFORT_FILE, allEfforts))
    return res.status(500).json({ error: "Failed to save effort" });

  // Update kidsStars
  const allStars = loadJSON(KIDS_STARS_FILE);
  let kidIndex = allStars.findIndex(k => k.name === name && k.family === family);
  if (kidIndex < 0) {
    allStars.push({ name, family, starsPerDay: [] });
    kidIndex = allStars.length - 1;
  }

  const totalStars = items.reduce((sum, it) => sum + Number(it.evaluation || 0), 0);
  const todayIndex = allStars[kidIndex].starsPerDay.findIndex(d => d.date === date);
  if (todayIndex >= 0) allStars[kidIndex].starsPerDay[todayIndex].stars = totalStars;
  else allStars[kidIndex].starsPerDay.push({ date, stars: totalStars });

  if (!saveJSON(KIDS_STARS_FILE, allStars))
    return res.status(500).json({ error: "Failed to update stars" });

  res.json({ message: "✅ Effort saved and stars updated!", starsToday: totalStars });
});

// ======================================================
// ✅ Weekly stars summary (uses families.json safely)
// ======================================================
app.get("/api/kidsStars/week", (req, res) => {
  try {
    const efforts = loadJSON(EFFORT_FILE);
    const routines = loadJSON(ROUTINE_FILE);
    const families = loadJSON(FAMILIES_FILE); // safe loading

    const kidsWithFamily = [];

    families.forEach(family => {
      if (family.dad) kidsWithFamily.push({ name: family.dad, family: family.name });
      if (family.mom) kidsWithFamily.push({ name: family.mom, family: family.name });
      (family.members || []).forEach(m => {
        kidsWithFamily.push({ name: m.name, family: family.name });
      });
    });

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const result = kidsWithFamily.map(k => {
      const starsPerDay = days.map(date => {
        let totalStars = 0;
        efforts
          .filter(r => r.name === k.name && r.family === k.family && r.date === date)
          .forEach(rec => {
            if (Array.isArray(rec.items))
              totalStars += rec.items.reduce((sum, it) => sum + (Number(it.evaluation) || 0), 0);
          });

        routines
          .filter(r => r.name === k.name && r.family === k.family && r.date === date)
          .forEach(rec => {
            totalStars += (rec.items || []).filter(i => i.done).length;
          });

        return { date, stars: totalStars };
      });
      return { name: k.name, family: k.family, starsPerDay };
    });

    res.json(result);
  } catch (err) {
    console.error("❌ Error in /api/kidsStars/week:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// ✅ Health Check + Start Server
// ======================================================
app.get("/api/test", (req, res) => res.json({ message: "✅ Server is alive!" }));

console.log("📡 Environment PORT =", process.env.PORT);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running → http://0.0.0.0:${PORT}`);
});

function calculateStars(items) {
  return items.reduce((sum, item) => sum + (Number(item.evaluation) || 0), 0);
}

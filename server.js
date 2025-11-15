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

// Serve welcome page
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "welcome.html"));
});
app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// ✅ Connect Family Login System Routes
// ======================================================
app.use("/api/families", familyRoutes);

// ======================================================
// ✅ File paths and utilities
// ======================================================
const EFFORT_FILE = path.join(__dirname, "efforts.json");
const ROUTINE_FILE = path.join(__dirname, "routines.json");
const KIDS_STARS_FILE = path.join(__dirname, "kidsStars.json");   // ⭐ FIXED
const FAMILIES_FILE = path.join(__dirname, "data", "families.json");

// Ensure required files exist
function ensureFile(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf8");
    console.log("📁 Created file:", file);
  }
}
ensureFile(EFFORT_FILE);
ensureFile(ROUTINE_FILE);
ensureFile(KIDS_STARS_FILE);
ensureFile(FAMILIES_FILE);

function loadJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// ======================================================
// ✅ Effort APIs (with family)
// ======================================================
app.post("/api/efforts", (req, res) => {
  const { name, date, items, checkedData, family } = req.body;

  if (!name || !date || !Array.isArray(items))
    return res.status(400).json({ error: "Invalid data" });
  if (!family) return res.status(400).json({ error: "Missing family" });

  // Load efforts
  const allEfforts = loadJSON(EFFORT_FILE);
  const index = allEfforts.findIndex(
    (r) => r.name === name && r.family === family && r.date === date
  );

  const record = { name, family, date, items, checkedData };
  if (index >= 0) allEfforts[index] = record;
  else allEfforts.push(record);

  if (!saveJSON(EFFORT_FILE, allEfforts))
    return res.status(500).json({ error: "Failed to save effort" });

  // ⭐ Update kid stars
  const allStars = loadJSON(KIDS_STARS_FILE);

  let kidIndex = allStars.findIndex(
    (k) => k.name === name && k.family === family
  );
  if (kidIndex < 0) {
    allStars.push({ name, family, starsPerDay: [] });
    kidIndex = allStars.length - 1;
  }

  const totalStars = items.reduce(
    (sum, it) => sum + Number(it.evaluation || 0),
    0
  );

  const todayIndex = allStars[kidIndex].starsPerDay.findIndex(
    (d) => d.date === date
  );

  if (todayIndex >= 0)
    allStars[kidIndex].starsPerDay[todayIndex].stars = totalStars;
  else
    allStars[kidIndex].starsPerDay.push({ date, stars: totalStars });

  if (!saveJSON(KIDS_STARS_FILE, allStars))
    return res.status(500).json({ error: "Failed to update stars" });

  res.json({
    message: "✅ Effort saved and stars updated!",
    starsToday: totalStars,
  });
});

// Search efforts
app.get("/api/efforts/search", (req, res) => {
  const { name, date, family } = req.query;
  let results = loadJSON(EFFORT_FILE);

  if (name) results = results.filter(r => r.name.toLowerCase() === name.toLowerCase());
  if (family) results = results.filter(r => r.family.toLowerCase() === family.toLowerCase());
  if (date) results = results.filter(r => r.date === date);

  res.json(results);
});

// Debug
app.get("/api/debug/efforts", (req, res) => res.json(loadJSON(EFFORT_FILE)));


// ======================================================
// ✅ Routine APIs (with family)
// ======================================================
app.post("/api/routines/save", (req, res) => {
  const { name, date, items, family, checkedData } = req.body;

  if (!name || !date || !Array.isArray(items))
    return res.status(400).json({ error: "Invalid routine data" });

  if (!family) return res.status(400).json({ error: "Missing family" });

  const all = loadJSON(ROUTINE_FILE);
  const index = all.findIndex(
    (r) => r.name === name && r.date === date && r.family === family
  );

  const record = { name, family, date, items, checkedData };

  if (index >= 0) all[index] = record;
  else all.push(record);

  saveJSON(ROUTINE_FILE, all);
  res.json({ message: "✅ Routine saved!" });
});

// Search routine
app.get("/api/routines/search", (req, res) => {
  try {
    const { name, date } = req.query;
    const result = loadJSON(ROUTINE_FILE).filter(
      (r) =>
        r.name?.trim().toLowerCase() === name?.trim().toLowerCase() &&
        r.date === date
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Server error while searching routines" });
  }
});

// Get all routines for a user
app.get("/api/routines/:name", (req, res) => {
  try {
    const { name } = req.params;
    const all = loadJSON(ROUTINE_FILE);
    res.json(all.filter((r) => r.name.toLowerCase() === name.toLowerCase()));
  } catch (err) {
    res.status(500).json({ message: "Failed to load routines!" });
  }
});


// ======================================================
// ⭐ WEEKLY STARS SUMMARY (with proper family selection)
// ======================================================
app.get("/api/kidsStars/week", (req, res) => {
  try {
    const efforts = loadJSON(EFFORT_FILE);
    const routines = loadJSON(ROUTINE_FILE);
    const families = loadJSON(FAMILIES_FILE);

    const kidsWithFamily = [];

    families.forEach((family) => {
      if (family.dad) kidsWithFamily.push({ name: family.dad, family: family.name });
      if (family.mom) kidsWithFamily.push({ name: family.mom, family: family.name });
      (family.members || []).forEach((m) => {
        kidsWithFamily.push({ name: m.name, family: family.name });
      });
    });

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const result = kidsWithFamily.map((k) => ({
      name: k.name,
      family: k.family,
      starsPerDay: days.map((date) => {
        let totalStars = 0;

        efforts
          .filter((r) => r.name === k.name && r.family === k.family && r.date === date)
          .forEach((rec) => {
            totalStars += rec.items.reduce(
              (sum, it) => sum + (Number(it.evaluation) || 0),
              0
            );
          });

        routines
          .filter((r) => r.name === k.name && r.family === k.family && r.date === date)
          .forEach((rec) => {
            totalStars += (rec.items || []).filter((i) => i.done).length;
          });

        return { date, stars: totalStars };
      }),
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Error in /api/kidsStars/week:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// Server Health Check
// ======================================================
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ Server is alive!" });
});

console.log("📡 Environment PORT =", process.env.PORT);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running → http://0.0.0.0:${PORT}`);
});

// Helper
function calculateStars(items) {
  return items.reduce((sum, item) => sum + (Number(item.evaluation) || 0), 0);
}

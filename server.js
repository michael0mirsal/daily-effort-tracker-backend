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
// ✅ File paths and utilities
// ======================================================
const EFFORT_FILE = path.join(__dirname, "efforts.json");
const ROUTINE_FILE = path.join(__dirname, "routines.json");

function ensureFile(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}
ensureFile(EFFORT_FILE);
ensureFile(ROUTINE_FILE);

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
// ✅ Effort APIs
// ======================================================
// ✅ Effort APIs (with family field)
// ======================================================
app.post("/api/efforts", (req, res) => {
  const { name, date, items, checkedData, family } = req.body;

  if (!name || !date || !Array.isArray(items))
    return res.status(400).json({ error: "Invalid data" });

  if (!family) return res.status(400).json({ error: "Missing family" });

  const all = loadJSON(EFFORT_FILE);
  const index = all.findIndex((r) => r.name === name && r.family === family && r.date === date);
  const record = { name, family, date, items, checkedData };

  if (index >= 0) all[index] = record;
  else all.push(record);

  if (saveJSON(EFFORT_FILE, all)) res.json({ message: "✅ Effort saved!" });
  else res.status(500).json({ error: "Failed to save effort" });
});

app.get("/api/efforts/search", (req, res) => {
  const { name, date } = req.query;
  let results = loadJSON(EFFORT_FILE);
  if (name)
    results = results.filter(
      (r) => r.name?.toLowerCase() === name.toLowerCase()
    );
  if (date) results = results.filter((r) => r.date === date);
  res.json(results);
});

app.get("/api/debug/efforts", (req, res) => res.json(loadJSON(EFFORT_FILE)));

// ======================================================
// ✅ Routine APIs
// ✅ Routine APIs (with family field)
// ======================================================
app.post("/api/routines/save", (req, res) => {
  const { name, date, items, family, checkedData } = req.body;

  if (!name || !date || !Array.isArray(items))
    return res.status(400).json({ error: "Invalid routine data" });

  if (!family) return res.status(400).json({ error: "Missing family" });

  // Save routine
  const all = loadJSON(ROUTINE_FILE);
  const index = all.findIndex(r =>
    r.name === name && r.family === family && r.date === date
  );

  const routine = { name, family, date, items, checkedData };

  if (index >= 0) all[index] = routine;
  else all.push(routine);

  saveJSON(ROUTINE_FILE, all);

  // ⭐ ALSO SAVE STARS ⭐
  const starsAll = loadJSON(STARS_FILE);
  starsAll.push({
    name,
    family,
    date,
    stars: checkedData
  });

  saveJSON(STARS_FILE, starsAll);

  res.json({ message: "✅ Routine saved!" });
});



// ✅ Search routine by name and date
app.get("/api/routines/search", async (req, res) => {
  try {
    const { name, date } = req.query;
    const file = await fs.promises.readFile(ROUTINE_FILE, "utf8");
    const data = JSON.parse(file);

    const matched = data.filter((r) => {
      const nameMatch =
        r.name?.trim().toLowerCase() === name?.trim().toLowerCase();
      const dateMatch = r.date?.trim() === date?.trim();
      return nameMatch && dateMatch;
    });

    res.json(matched);
  } catch (err) {
    console.error("❌ Error in /api/routines/search:", err);
    res.status(500).json({ error: "Server error while searching routines" });
  }
});

// ✅ Get all routines for a single user
app.get("/api/routines/:name", (req, res) => {
  try {
    const { name } = req.params;
    const all = loadJSON(ROUTINE_FILE);
    const userRoutines = all.filter(
      (r) => r.name?.trim().toLowerCase() === name.trim().toLowerCase()
    );
    res.json(userRoutines);
  } catch (err) {
    console.error("❌ Failed to load routines:", err);
    res.status(500).json({ message: "❌ Failed to load routines!" });
  }
});

// ✅ Update a single effort evaluation
app.patch("/api/efforts/updateEvaluation", (req, res) => {
  const { name, date, index, evaluation } = req.body;
  if (!name || !date || index === undefined)
    return res.status(400).json({ message: "Missing fields." });

  try {
    let efforts = loadJSON(EFFORT_FILE);
    const userEffort = efforts.find((r) => r.name === name && r.date === date);
    if (!userEffort)
      return res.status(404).json({ message: "Effort not found." });
    if (!userEffort.items[index])
      return res.status(400).json({ message: "Invalid index." });

    userEffort.items[index].evaluation = evaluation;

    if (saveJSON(EFFORT_FILE, efforts))
      res.json({ message: "✅ Evaluation updated successfully!" });
    else
      res.status(500).json({ message: "Failed to save updated evaluation." });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error while updating evaluation." });
  }
});

// ✅ Weekly stars summary for all kids
// ✅ Weekly stars summary for all kids (with family)
app.get("/api/kidsStars/week", (req, res) => {
  try {
    const efforts = loadJSON(EFFORT_FILE);
    const routines = loadJSON(ROUTINE_FILE);
    const families = loadJSON(path.join(__dirname, "families.json")); // Assuming families.json stores all families

    // Collect all kids with their family
    const kidsWithFamily = [];

    families.forEach(family => {
      // Dad
      if (family.dad) kidsWithFamily.push({ name: family.dad, family: family.name });
      // Mom
      if (family.mom) kidsWithFamily.push({ name: family.mom, family: family.name });
      // Kids
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

        // Sum effort stars
        efforts
          .filter(r => r.name === k.name && r.family === k.family && r.date === date)
          .forEach(rec => {
            if (Array.isArray(rec.items))
              totalStars += rec.items.reduce(
                (sum, it) => sum + (Number(it.evaluation) || 0),
                0
              );
          });

        // Sum routine stars
        routines
          .filter(r => r.name === k.name && r.family === k.family && r.date === date)
          .forEach(rec => {
            const completed = (rec.items || []).filter(i => i.done).length;
            totalStars += completed;
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
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ Server is alive!" });
});

console.log("📡 Environment PORT =", process.env.PORT);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running → http://0.0.0.0:${PORT}`);
});

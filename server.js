import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
// ✅ Serve welcome page when visiting root URL


// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "public", "welcome.html"));
});
// ===== File paths =====
const EFFORT_FILE = path.join(__dirname, "efforts.json");
const ROUTINE_FILE = path.join(__dirname, "routines.json");


// ===== Ensure data files exist =====
function ensureFile(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}
ensureFile(EFFORT_FILE);
ensureFile(ROUTINE_FILE);

// ===== Helper functions =====
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
// ✅ EFFORT APIs
// ======================================================
app.post("/api/efforts", (req, res) => {
  const { name, date, items, checkedData } = req.body;
  if (!name || !date || !Array.isArray(items))
    return res.status(400).json({ error: "Invalid data" });

  const all = loadJSON(EFFORT_FILE);
  const index = all.findIndex(r => r.name === name && r.date === date);
  const record = { name, date, items, checkedData };
  if (index >= 0) all[index] = record;
  else all.push(record);

  if (saveJSON(EFFORT_FILE, all)) res.json({ message: "✅ Effort saved!" });
  else res.status(500).json({ error: "Failed to save effort" });
});

app.get("/api/efforts/search", (req, res) => {
  const { name, date } = req.query;
  let results = loadJSON(EFFORT_FILE);
  if (name) results = results.filter(r => r.name?.toLowerCase() === name.toLowerCase());
  if (date) results = results.filter(r => r.date === date);
  res.json(results);
});

app.get("/api/debug/efforts", (req, res) => res.json(loadJSON(EFFORT_FILE)));

// ======================================================
// ✅ ROUTINE APIs
// ======================================================
app.post("/api/routines/save", (req, res) => {
  const { name, date, items } = req.body;
  if (!name || !date || !Array.isArray(items))
    return res.status(400).json({ error: "Invalid routine data" });

  const all = loadJSON(ROUTINE_FILE);
  const index = all.findIndex(r => r.name === name && r.date === date);
  const routine = { name, date, items };

  if (index >= 0) all[index] = routine;
  else all.push(routine);

  if (saveJSON(ROUTINE_FILE, all)) {
    res.json({ message: "✅ Routine saved!" });
  } else {
    res.status(500).json({ error: "Failed to save routine" });
  }
});

// ✅ Search routine by name and date
app.get("/api/routines/search", async (req, res) => {
  try {
    const { name, date } = req.query;
    const file = await fs.promises.readFile(ROUTINE_FILE, "utf8");
    const data = JSON.parse(file);
    const matched = data.filter(
      r => r.name?.trim().toLowerCase() === name?.trim().toLowerCase() && r.date?.trim() === date?.trim()
    );
    res.json(matched);
  } catch (err) {
    res.status(500).json({ error: "Server error while searching routines" });
  }
});

// ✅ Get all routines for a user
app.get("/api/routines/:name", (req, res) => {
  try {
    const { name } = req.params;
    const all = loadJSON(ROUTINE_FILE);
    const userRoutines = all.filter(
      r => r.name?.trim().toLowerCase() === name.trim().toLowerCase()
    );
    res.json(userRoutines);
  } catch {
    res.status(500).json({ message: "❌ Failed to load routines!" });
  }
});

// ✅ PATCH evaluation
app.patch("/api/efforts/updateEvaluation", (req, res) => {
  const { name, date, index, evaluation } = req.body;
  if (!name || !date || index === undefined) return res.status(400).json({ message: "Missing fields." });

  let efforts = loadJSON(EFFORT_FILE);
  const userEffort = efforts.find(r => r.name === name && r.date === date);
  if (!userEffort) return res.status(404).json({ message: "Effort not found." });
  if (!userEffort.items[index]) return res.status(400).json({ message: "Invalid index." });

  userEffort.items[index].evaluation = evaluation;
  if (saveJSON(EFFORT_FILE, efforts)) res.json({ message: "✅ Evaluation updated!" });
  else res.status(500).json({ message: "Failed to save update." });
});

// ✅ Weekly stars summary
app.get("/api/kidsStars/week", (req, res) => {
  try {
    const efforts = loadJSON(EFFORT_FILE);
    const routines = loadJSON(ROUTINE_FILE);
    const kids = [...new Set([...efforts, ...routines].map(r => r.name))];
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    const result = kids.map(name => ({
      name,
      starsPerDay: days.map(date => {
        let total = 0;
        efforts.filter(r => r.name === name && r.date === date)
          .forEach(r => total += r.items?.reduce((s, it) => s + (Number(it.evaluation) || 0), 0) || 0);
        routines.filter(r => r.name === name && r.date === date)
          .forEach(r => total += (r.items || []).filter(i => i.done).length);
        return { date, stars: total };
      })
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// ✅ Start server (only once, at the end)
// ======================================================



app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running → http://localhost:${PORT}`);
});

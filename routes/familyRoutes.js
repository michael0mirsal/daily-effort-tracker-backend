import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "../data/families.json");

// ✅ Ensure the JSON file exists
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");

// ======================================================
// ✅ Helper functions
// ======================================================
function loadFamilies() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8") || "[]");
  } catch (err) {
    console.error("Error reading families.json", err);
    return [];
  }
}

function saveFamilies(arr) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing families.json", err);
    return false;
  }
}

function findFamilyByName(families, name) {
  return families.find(f => f.name.toLowerCase() === name.toLowerCase());
}

// ======================================================
// ✅ POST /signup - create new family
// ======================================================
router.post("/signup", async (req, res) => {
  const { family, dad, mom, passkey } = req.body;
  if (!family || !dad || !mom || !passkey)
    return res.status(400).json({ message: "Missing data" });

  const families = loadFamilies();
  if (findFamilyByName(families, family))
    return res.status(400).json({ message: "Family already exists" });

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(passkey, salt);

  const newFamily = {
    id: Date.now(),
    name: family,
    dad,
    mom,
    passhash: hash,
    members: []
  };

  families.push(newFamily);
  saveFamilies(families);

  res.json({ message: "Family created", family: { name: family, dad, mom, members: [] } });
});

// ======================================================
// ✅ POST /signin - login to existing family
// ======================================================
router.post("/signin", async (req, res) => {
  const { family, nickname, passkey } = req.body;
  if (!family || !nickname || !passkey)
    return res.status(400).json({ message: "Missing data" });

  const families = loadFamilies();
  const found = findFamilyByName(families, family);
  if (!found) return res.status(401).json({ message: "Family not found or wrong passkey" });

  const match = await bcrypt.compare(passkey, found.passhash);
  if (!match) return res.status(401).json({ message: "Family not found or wrong passkey" });

  // Add member if new
  const existing = found.members.find(m => m.nickname.toLowerCase() === nickname.toLowerCase());
  if (!existing) {
    const member = { id: Date.now(), nickname };
    found.members.push(member);
    saveFamilies(families);
  }

  res.json({ message: "Login successful", family: { name: found.name }, nickname });
});

// ======================================================
// ✅ POST /add-member - add new member to family
// ======================================================
router.post("/add-member", (req, res) => {
  const { family, nickname } = req.body;
  if (!family || !nickname) return res.status(400).json({ message: "Missing data" });

  const families = loadFamilies();
  const found = findFamilyByName(families, family);
  if (!found) return res.status(404).json({ message: "Family not found" });

  if (found.members.some(m => m.nickname.toLowerCase() === nickname.toLowerCase()))
    return res.status(400).json({ message: "Nickname already exists" });

  const member = { id: Date.now(), nickname };
  found.members.push(member);
  saveFamilies(families);

  res.json({ message: "Member added", member });
});

export default router;

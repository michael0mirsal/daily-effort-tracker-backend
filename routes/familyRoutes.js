import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "../data/families.json");

// ✅ Ensure JSON file exists
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

  res.json({
    message: "Family created",
    family: { name: family, dad, mom, members: [] }
  });
});

// ======================================================
// ✅ POST /signin - login with name, role, and passkey
// ======================================================
router.post("/signin", async (req, res) => {
  const { name, role, passkey } = req.body;
  if (!name || !role || !passkey)
    return res.status(400).json({ message: "Missing data" });

  const families = loadFamilies();
  let found = families.find(
    f =>
      f.dad.toLowerCase() === name.toLowerCase() ||
      f.mom.toLowerCase() === name.toLowerCase() ||
      f.members.some(m => m.name.toLowerCase() === name.toLowerCase())
  );

  if (!found)
    return res.status(401).json({ message: "Family not found" });

  const match = await bcrypt.compare(passkey, found.passhash);
  if (!match)
    return res.status(401).json({ message: "Wrong passkey" });

  // ✅ Validate role logic
  if (role === "dad" && found.dad.toLowerCase() !== name.toLowerCase())
    return res.status(403).json({ message: "You are not the dad of this family" });

  if (role === "mom" && found.mom.toLowerCase() !== name.toLowerCase())
    return res.status(403).json({ message: "You are not the mom of this family" });

  if (
    role === "kid" &&
    !found.members.some(m => m.name.toLowerCase() === name.toLowerCase())
  ) {
    // Add new kid if not found
    found.members.push({ id: Date.now(), name, role });
    saveFamilies(families);
  }

  res.json({
    message: "Login successful",
    family: found
  });
});

// ======================================================
// ✅ POST /add-member - add a new member to a family
// ======================================================
router.post("/add-member", (req, res) => {
  const { family, name, role } = req.body;
  if (!family || !name || !role)
    return res.status(400).json({ message: "Missing data" });

  const families = loadFamilies();
  const found = findFamilyByName(families, family);
  if (!found) return res.status(404).json({ message: "Family not found" });

  if (found.members.some(m => m.name.toLowerCase() === name.toLowerCase()))
    return res.status(400).json({ message: "Member already exists" });

  found.members.push({ id: Date.now(), name, role });
  saveFamilies(families);

  res.json({ message: "Member added", family: found });
});

// ======================================================
// ✅ GET /api/family/:familyName - return family data
// ======================================================
router.get("/family/:familyName", (req, res) => {
  const familyName = req.params.familyName;
  const families = loadFamilies();
  const family = families.find(f => f.name.toLowerCase() === familyName.toLowerCase());
  if (!family) return res.status(404).json({ message: "Family not found" });
  res.json(family);
});

// ======================================================
// 🔹 DEBUG - list all families (for testing only)
// ======================================================
router.get("/debug", (req, res) => {
  const families = loadFamilies();
  res.json(families);
});

export default router;

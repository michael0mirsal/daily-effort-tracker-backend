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

  // Find family by matching dad/mom name or by member name
  const found = families.find(
    f =>
      f.dad.toLowerCase() === name.toLowerCase() ||
      f.mom.toLowerCase() === name.toLowerCase() ||
      f.members.some(m => m.name.toLowerCase() === name.toLowerCase())
  );

  if (!found)
    return res.status(401).json({ message: "Family not found or wrong passkey" });

  const match = await bcrypt.compare(passkey, found.passhash);
  if (!match)
    return res.status(401).json({ message: "Family not found or wrong passkey" });

  // Add new member if not parent and not existing
  if (role === "kid" && !found.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
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

export default router;

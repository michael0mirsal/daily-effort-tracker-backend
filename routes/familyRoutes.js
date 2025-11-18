// familyRoutes.js
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
  if (!name) return null;
  return families.find(f => (f.name || "").toLowerCase() === name.toLowerCase());
}

// ======================================================
// ✅ Rate limiter (simple in-memory sketch)
// - Limits by IP address (or by key) to avoid brute-force on /signin.
// - This is intentionally simple and reset in-memory; for production use
//   replace with a Redis-backed limiter (e.g., express-rate-limit with store).
// ======================================================
const signinAttempts = new Map(); // key -> { count, firstTs }
const LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 6;

function checkRateLimit(key) {
  const now = Date.now();
  const rec = signinAttempts.get(key);
  if (!rec) {
    signinAttempts.set(key, { count: 1, firstTs: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  // reset window if elapsed
  if (now - rec.firstTs > LIMIT_WINDOW_MS) {
    signinAttempts.set(key, { count: 1, firstTs: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  rec.count++;
  signinAttempts.set(key, rec);
  if (rec.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((LIMIT_WINDOW_MS - (now - rec.firstTs)) / 1000) };
  }
  return { allowed: true, remaining: MAX_ATTEMPTS - rec.count };
}

// Periodic cleanup to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of signinAttempts.entries()) {
    if (now - rec.firstTs > LIMIT_WINDOW_MS * 2) signinAttempts.delete(key);
  }
}, LIMIT_WINDOW_MS);

// ======================================================
// ✅ POST /signup - create new family (unchanged, minor safeguards)
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
// ✅ POST /signin - STRICT MODE (require `family` always)
// Security improvements included:
//  - Require family field (strict mode) to avoid ambiguous multi-family lookup
//  - Rate limiting (in-memory sketch) per IP to slow brute force
//  - Clear and appropriate HTTP status codes:
//      400 -> missing data, 401 -> wrong passkey, 404 -> family not found,
//      403 -> role/name mismatch, 429 -> too many attempts
//  - Server-side role detection (do not trust client role input)
//  - Returns minimal family info + user role (no passhash)
// ======================================================
router.post("/signin", async (req, res) => {
  const { family, name, role: clientRole, passkey } = req.body;

  // Rate limiter key: using IP (req.ip). If you prefer per-family use family value.
  const limiterKey = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const rl = checkRateLimit(limiterKey);
  if (!rl.allowed) {
    return res.status(429).json({ message: "Too many signin attempts. Try again later.", retryAfterSeconds: rl.retryAfter });
  }

  // Basic validation (strict mode requires family, name, passkey)
  if (!family || !name || !passkey) {
    return res.status(400).json({ message: "Missing fields. 'family', 'name' and 'passkey' are required." });
  }

  try {
    const families = loadFamilies();

    // Find exact family by name (case-insensitive)
    const found = findFamilyByName(families, family);
    if (!found) {
      // 404 family not found
      return res.status(404).json({ message: "Family not found" });
    }

    // Compare passkey with stored passhash
    const match = await bcrypt.compare(passkey, found.passhash);
    if (!match) {
      // 401 wrong passkey
      return res.status(401).json({ message: "Wrong passkey" });
    }

    // Server-side role detection: do NOT trust clientRole
    const nameLower = (name || "").toLowerCase();
    let detectedRole = null;
    if ((found.dad || "").toLowerCase() === nameLower) detectedRole = "dad";
    else if ((found.mom || "").toLowerCase() === nameLower) detectedRole = "mom";
    else if (Array.isArray(found.members) && found.members.some(m => (m.name || "").toLowerCase() === nameLower && (m.role || "kid") === "kid")) {
      detectedRole = "kid";
    }

    if (!detectedRole) {
      // 403 – name does not belong to this family
      return res.status(403).json({ message: "This name is not registered in the provided family." });
    }

    // Success: return family object (without sensitive passhash) and user role
    const safeFamily = {
      id: found.id,
      name: found.name,
      dad: found.dad,
      mom: found.mom,
      members: found.members || []
    };

    // Reset rate limiter for this key on successful login (optional but friendly)
    if (signinAttempts.has(limiterKey)) signinAttempts.delete(limiterKey);

    return res.json({
      message: "Login successful (family mode)",
      family: safeFamily,
      user: { name, role: detectedRole }
    });
  } catch (err) {
    console.error("Signin error:", err);
    return res.status(500).json({ message: "Server error during signin" });
  }
});

// ======================================================
// ✅ POST /add-member - add a new member to a family (unchanged)
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
// ✅ GET /:familyName - return family data (unchanged)
// ======================================================
router.get("/:familyName", (req, res) => {
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

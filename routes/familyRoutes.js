// familyRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import Family from "../models/Family.js"; // MongoDB Family model

const router = express.Router();

// ======================================================
// ✅ Rate limiter (simple in-memory sketch)
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

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of signinAttempts.entries()) {
    if (now - rec.firstTs > LIMIT_WINDOW_MS * 2) signinAttempts.delete(key);
  }
}, LIMIT_WINDOW_MS);

// ======================================================
// ✅ POST /signup - create new family with id preserved
// ======================================================
router.post("/signup", async (req, res) => {
  const { family, dad, mom, passkey } = req.body;
  if (!family || !dad || !mom || !passkey)
    return res.status(400).json({ message: "Missing data" });

  try {
    const existing = await Family.findOne({ name: family });
    if (existing) return res.status(400).json({ message: "Family already exists" });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passkey, salt);

    const newFamily = new Family({
      id: Date.now(), // preserve old id style
      name: family,
      dad,
      mom,
      passhash: hash,
      members: []
    });

    await newFamily.save();

    res.json({
      message: "Family created",
      family: { id: newFamily.id, name: family, dad, mom, members: [] }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error during signup" });
  }
});

// ======================================================
// ✅ POST /signin
// ======================================================
router.post("/signin", async (req, res) => {
  const { family, name, passkey } = req.body;
  const limiterKey = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const rl = checkRateLimit(limiterKey);
  if (!rl.allowed)
    return res.status(429).json({ message: "Too many signin attempts. Try again later.", retryAfterSeconds: rl.retryAfter });

  if (!family || !name || !passkey)
    return res.status(400).json({ message: "Missing fields. 'family', 'name', 'passkey' required." });

  try {
    const found = await Family.findOne({ name: family });
    if (!found) return res.status(404).json({ message: "Family not found" });

    const match = await bcrypt.compare(passkey, found.passhash);
    if (!match) return res.status(401).json({ message: "Wrong passkey" });

    const nameLower = name.toLowerCase();
    let detectedRole = null;
    if ((found.dad || "").toLowerCase() === nameLower) detectedRole = "dad";
    else if ((found.mom || "").toLowerCase() === nameLower) detectedRole = "mom";
    else if ((found.members || []).some(m => (m.name || "").toLowerCase() === nameLower)) detectedRole = "kid";

    if (!detectedRole)
      return res.status(403).json({ message: "This name is not registered in the family." });

    if (signinAttempts.has(limiterKey)) signinAttempts.delete(limiterKey);

    res.json({
      message: "Login successful (family mode)",
      family: {
        id: found.id, // preserve old id
        name: found.name,
        dad: found.dad,
        mom: found.mom,
        members: found.members
      },
      user: { name, role: detectedRole }
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ message: "Server error during signin" });
  }
});

// ======================================================
// ✅ POST /add-member
// ======================================================
router.post("/add-member", async (req, res) => {
  const { family, name, role } = req.body;
  if (!family || !name || !role) {
    return res.status(400).json({ message: "Missing data" });
  }

  try {
    const found = await Family.findOne({ name: family });
    if (!found) {
      return res.status(404).json({ message: "Family not found" });
    }

    // Check duplicate
    if (found.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: "Member already exists" });
    }

    // Generate member ID
    const id = Date.now();

    // Add correct member format
    found.members.push({ id, name, role });

    await found.save();

    res.json({
      message: "Member added",
      family: found
    });

  } catch (err) {
    console.error("Add member error:", err);
    res.status(500).json({ message: "Server error while adding member" });
  }
});


// ======================================================
// ✅ GET /:familyName
// ======================================================
router.get("/:familyName", async (req, res) => {
  try {
    const { familyName } = req.params;
    const found = await Family.findOne({ name: familyName });
    if (!found) return res.status(404).json({ message: "Family not found" });
    res.json(found);
  } catch (err) {
    console.error("Get family error:", err);
    res.status(500).json({ message: "Server error while fetching family" });
  }
});

// ======================================================
// 🔹 DEBUG - list all families
// ======================================================
router.get("/debug", async (req, res) => {
  try {
    const families = await Family.find();
    res.json(families);
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ message: "Server error while fetching families" });
  }
});

export default router;

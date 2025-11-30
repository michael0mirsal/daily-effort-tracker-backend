// familyRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import Family from "../models/Family.js";
import Member from "../models/Member.js";
import mongoose from "mongoose";


const router = express.Router();

// ======================================================
// ✅ Rate limiter (in-memory sketch)
// ======================================================
const signinAttempts = new Map(); // key -> { count, firstTs }
const LIMIT_WINDOW_MS = 10 * 60 * 1000;
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

setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of signinAttempts.entries()) {
    if (now - rec.firstTs > LIMIT_WINDOW_MS * 2) signinAttempts.delete(key);
  }
}, LIMIT_WINDOW_MS);

// ======================================================
// ✅ POST /signup
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
      id: Date.now(),
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
// ✅ POST /signin
router.post("/signin", async (req, res) => {
  const { family, name, passkey } = req.body;
  const limiterKey = req.ip || req.headers["x-forwarded-for"] || "unknown";

  // Rate limiter
  const rl = checkRateLimit(limiterKey);
  if (!rl.allowed)
    return res.status(429).json({ 
      message: "Too many signin attempts. Try again later.", 
      retryAfterSeconds: rl.retryAfter 
    });

  // Validate input
  if (!family || !name || !passkey)
    return res.status(400).json({ message: "Missing fields. 'family', 'name', 'passkey' required." });

  try {
    // Find family and populate members
    const found = await Family.findOne({ name: family }).populate("members");
    if (!found) return res.status(404).json({ message: "Family not found" });

    // Check passkey
    const match = await bcrypt.compare(passkey, found.passhash);
    if (!match) return res.status(401).json({ message: "Wrong passkey" });

    // Determine role (dad, mom, or kid)
    const nameLower = name.trim().toLowerCase();
    let detectedRole = null;

    if ((found.dad || "").trim().toLowerCase() === nameLower) detectedRole = "dad";
    else if ((found.mom || "").trim().toLowerCase() === nameLower) detectedRole = "mom";
    else if ((found.members || []).some(m => (m.name || "").trim().toLowerCase() === nameLower)) detectedRole = "kid";

    if (!detectedRole)
      return res.status(403).json({ message: "This name is not registered in this family." });

    // Clear limiter on successful login
    if (signinAttempts.has(limiterKey)) signinAttempts.delete(limiterKey);

    // Return family + detected role for frontend
    res.json({
      message: "Login successful (family mode)",
      family: {
        id: found.id,
        name: found.name,
        dad: found.dad,
        mom: found.mom,
        members: found.members // populated with actual Member objects
      },
      user: {
        name,
        role: detectedRole
      }
    });

  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ message: "Server error during signin" });
  }
});


// ======================================================
// ✅ POST /add-member (embedded objects)
// ======================================================
router.post("/add-member", async (req, res) => {
  try {
    const { family, name, role, age } = req.body;
    if (!family || !name) return res.status(400).json({ message: "Missing data" });

    // Find family by name or id
    let familyDoc = null;
    if (mongoose.isValidObjectId(family)) familyDoc = await Family.findById(family);
    else familyDoc = await Family.findOne({ name: family });

    if (!familyDoc) return res.status(404).json({ message: "Family not found" });

    // Prevent duplicates
    const existing = await Member.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      family: familyDoc._id
    });
    if (existing) {
  return res.json({
    message: "Already exists",
    member: existing
  });
}

    const memberDoc = await Member.create({
      name: name.trim(),
      role: role || "kid",
      age: age ?? null,
      family: familyDoc._id
    });

    familyDoc.members.push(memberDoc._id);
    await familyDoc.save();

    // return populated member
    res.json({ message: "Member added", member: memberDoc });
  } catch (err) {
    console.error("Add member error:", err);
    res.status(500).json({ message: "Server error while adding member" });
  }
});

// Delete member by name (or id)
router.delete("/delete-member", async (req, res) => {
  try {
    const { family, name, id } = req.body;
    if (!family || (!name && !id)) return res.status(400).json({ message: "Missing data" });

    // Resolve family
    let familyDoc = null;
    if (mongoose.isValidObjectId(family)) familyDoc = await Family.findById(family);
    else familyDoc = await Family.findOne({ name: family });

    if (!familyDoc) return res.status(404).json({ message: "Family not found" });

    // Find member
    const memberQuery = id ? { _id: id, family: familyDoc._id } : { name: { $regex: `^${name.trim()}$`, $options: "i" }, family: familyDoc._id };
    const memberDoc = await Member.findOne(memberQuery);
    if (!memberDoc) return res.status(404).json({ message: "Member not found" });

    // Remove refs and document
    await Member.deleteOne({ _id: memberDoc._id });
    familyDoc.members = familyDoc.members.filter(m => m.toString() !== memberDoc._id.toString());
    await familyDoc.save();

    res.json({ message: "Member deleted", memberId: memberDoc._id });
  } catch (err) {
    console.error("Delete member error:", err);
    res.status(500).json({ message: "Server error while deleting member" });
  }
});

// Update member by id
router.put("/update-member", async (req, res) => {
  try {
    const { id, name, role, age } = req.body;
    if (!id) return res.status(400).json({ message: "Missing member id" });

    const update = {};
    if (name) update.name = name.trim();
    if (role) update.role = role;
    if (age !== undefined) update.age = age === "" ? null : Number(age);

    const memberDoc = await Member.findByIdAndUpdate(id, update, { new: true });
    if (!memberDoc) return res.status(404).json({ message: "Member not found" });

    res.json({ message: "Member updated", member: memberDoc });
  } catch (err) {
    console.error("Update member error:", err);
    res.status(500).json({ message: "Server error while updating member" });
  }
});

// Get family with members populated
router.get("/:familyName", async (req, res) => {
  try {
    const family = req.params.familyName;

    let familyDoc;

    if (mongoose.isValidObjectId(family)) {
      familyDoc = await Family.findById(family).populate("members");
    } else {
      familyDoc = await Family.findOne({ name: family }).populate("members");
    }

    if (!familyDoc) {
      return res.status(404).json({ message: "Family not found" });
    }

    res.json([familyDoc]); // same structure your frontend expects
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

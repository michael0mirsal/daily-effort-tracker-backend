import KidMood from "../models/KidMood.js";

/**
 * ✅ Create or Update Kid Mood (one per day)
 * POST /api/mood
 */
export const saveKidMood = async (req, res) => {
  try {
    const {
      date,
      nursery,
      class: classId,
      schoolMember,
      mood,
      recordedBy,
      note
    } = req.body;

    // 🔒 Basic validation
    if (!date || !nursery || !classId || !schoolMember || !mood) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // 🔁 Check if mood already exists for this kid today
    let existingMood = await KidMood.findOne({
      date,
      schoolMember
    });

    if (existingMood) {
      existingMood.mood = mood;
      existingMood.recordedBy = recordedBy || existingMood.recordedBy;
      existingMood.note = note || existingMood.note;

      await existingMood.save();

      return res.json({
        success: true,
        updated: true,
        data: existingMood
      });
    }

    // 🆕 Create new mood
    const newMood = await KidMood.create({
      date,
      nursery,
      class: classId,
      schoolMember,
      mood,
      recordedBy,
      note
    });

    res.status(201).json({
      success: true,
      created: true,
      data: newMood
    });

  } catch (error) {
    console.error("❌ Save Kid Mood Error:", error.message);

    // Handle duplicate index error safely
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Mood already recorded for this kid today"
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

/**
 * 📅 Get moods by class & date
 * GET /api/mood?classId=xxx&date=yyyy-mm-dd
 */
export const getMoodsByClassAndDate = async (req, res) => {
  try {
    const { classId, date } = req.query;

    if (!classId || !date) {
      return res.status(400).json({
        success: false,
        message: "classId and date are required"
      });
    }

    const moods = await KidMood.find({
      class: classId,
      date
    })
      .populate("schoolMember", "member role")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      count: moods.length,
      data: moods
    });

  } catch (error) {
    console.error("❌ Get Moods Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

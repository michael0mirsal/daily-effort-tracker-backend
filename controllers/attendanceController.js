import Attendance from "../models/Attendance.js";

// --- CREATE attendance ---
export const createAttendance = async (req, res) => {
  console.log("🔥 CREATE ATTENDANCE HIT");
  console.log("BODY:", req.body);

  try {
    const attendance = await Attendance.create(req.body);
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- GET attendance by class and date ---
export const getAttendanceByClass = async (req, res) => {
  try {
    const { classId, date } = req.query;
    const attendanceList = await Attendance.find({ class: classId, date })
      .populate("schoolMember")
      .populate("markedBy", "name");
    res.status(200).json({ success: true, data: attendanceList });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- UPDATE attendance status or times ---
export const updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// --- DELETE attendance ---
export const deleteAttendance = async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Attendance deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

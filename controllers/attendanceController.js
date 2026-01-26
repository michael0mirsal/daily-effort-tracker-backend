// controllers/attendanceController.js
import { markAttendance } from "../services/attendanceService.js";
import { logInfo, logError } from "../utils/logger.js";
import Attendance from "../models/Attendance.js";

// ✅ CREATE Attendance
export const createAttendance = async (req, res) => {
  try {
    logInfo("CREATE Attendance request received", { body: req.body });

    // Call the service
    const attendance = await markAttendance(req.body);

    logInfo("Attendance successfully created", { attendanceId: attendance._id });

    res.status(201).json({ success: true, data: attendance });
  } catch (err) {
    logError("Attendance error", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ GET attendance by class and date
export const getAttendanceByClass = async (req, res) => {
  try {
    const { classId, date } = req.query;

    if (!classId || !date) {
      return res.status(400).json({ success: false, message: "Missing classId or date" });
    }

    const attendanceList = await Attendance.find({ class: classId, date })
      .populate("schoolMember")
      .populate("markedBy", "name");

    res.status(200).json({ success: true, data: attendanceList });
  } catch (err) {
    logError("Error fetching attendance", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ UPDATE attendance
export const updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: attendance });
  } catch (err) {
    logError("Error updating attendance", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ✅ DELETE attendance
export const deleteAttendance = async (req, res) => {
  try {
    await Attendance.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Attendance deleted" });
  } catch (err) {
    logError("Error deleting attendance", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

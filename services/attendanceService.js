import Attendance from "../models/Attendance.js";
import { sendWhatsAppReport } from "../utils/whatsapp.js"; // your Twilio function

export const markAttendance = async ({
  schoolMember,
  classId,
  date,
  status,
  checkInTime,
  leaveTime,
  markedBy,
  notes,
  parentPhone
}) => {
  if (!schoolMember || !classId || !date) {
    throw new Error("Missing required fields");
  }

  // Check if attendance already exists
  let attendance = await Attendance.findOne({ schoolMember, class: classId, date });
  if (attendance) {
    // Update existing
    attendance.status = status;
    attendance.checkInTime = checkInTime;
    attendance.leaveTime = leaveTime;
    attendance.notes = notes;
    attendance.markedBy = markedBy;
  } else {
    // Create new
    attendance = new Attendance({
      schoolMember,
      class: classId,
      date,
      status,
      checkInTime,
      leaveTime,
      notes,
      markedBy
    });
  }

  await attendance.save();

  // ✅ Send WhatsApp if parent phone provided
  if (parentPhone) {
    const stars = status === "present" ? "⭐" : "❌"; // Example: star for present
    await sendWhatsAppReport(parentPhone, date, stars);
  }

  return attendance;
};

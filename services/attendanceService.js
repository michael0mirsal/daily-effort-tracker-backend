import Attendance from "../models/Attendance.js";
import SchoolMember from "../models/SchoolMember.js";
import { sendWhatsAppReport } from "../utils/whatsapp.js";

export const markAttendance = async ({
  schoolMember,
  classId,
  date,
  status,
  checkInTime,
  leaveTime,
  markedBy,
  notes
}) => {
  if (!schoolMember || !classId || !date) {
    throw new Error("Missing required fields");
  }

  // 1️⃣ Check if attendance already exists
  let attendance = await Attendance.findOne({ schoolMember, class: classId, date });
  if (attendance) {
    attendance.status = status;
    attendance.checkInTime = checkInTime;
    attendance.leaveTime = leaveTime;
    attendance.notes = notes;
    attendance.markedBy = markedBy;
  } else {
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

  // 2️⃣ Fetch SchoolMember to get parent phones
  const member = await SchoolMember.findById(schoolMember);

  // 3️⃣ Format phone numbers for WhatsApp
  const phones = [];
  if (member?.dadPhone) phones.push("+20" + member.dadPhone.replace(/^0/, ""));
  if (member?.momPhone) phones.push("+20" + member.momPhone.replace(/^0/, ""));

  // 4️⃣ Send WhatsApp to each parent
  for (const phone of phones) {
    const stars = status === "present" ? "⭐" : "❌"; // or map other statuses
    await sendWhatsAppReport(phone, date, stars);
  }

  return attendance;
};

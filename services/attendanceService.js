import Attendance from "../models/Attendance.js";
import SchoolMember from "../models/sch-Member.js";
import { sendWhatsAppReport } from "../routes/whatsappService.js";
import { logInfo, logWarn, logError } from "../utils/logger.js";

// Map attendance status to message or stars
const statusMap = {
  present: "✅ Present",
  absent: "❌ Absent",
  late: "⏰ Late",
  excused: "📝 Excused",
  left_early: "🏃 Left Early"
};


export const markAttendance = async ({
  schoolMember,
  classId,
  nursery,
  date,
  status,
  checkInTime,
  leaveTime,
  markedBy,
  notes
}) => {
  logInfo("Attendance request received", { schoolMember, classId, date });

  if (!schoolMember || !classId || !date || !status) {
    throw new Error("Missing required fields");
  }

  // ✅ Check if attendance already exists today for this member
  let attendance = await Attendance.findOne({ schoolMember, class: classId, date });

  if (attendance) {
    // Only allow updates, do not create a new record
    logInfo("Attendance already exists, updating instead", { attendanceId: attendance._id });
    attendance.status = status;
    attendance.checkInTime = checkInTime || attendance.checkInTime;
    attendance.leaveTime = leaveTime || attendance.leaveTime;
    attendance.notes = notes || attendance.notes;
    attendance.markedBy = markedBy;
    attendance.nursery = nursery;
  } else {
    // Create new attendance for today
    logInfo("Creating new attendance record");
    attendance = new Attendance({
      schoolMember,
      class: classId,
      nursery,
      date,
      status,
      checkInTime,
      leaveTime,
      notes,
      markedBy
    });
  }

  await attendance.save();
  logInfo("Attendance saved", { attendanceId: attendance._id });
  return attendance;
};

/* watsapp
  // --- 2️⃣ Fetch SchoolMember for parent phones ---
  const member = await SchoolMember.findById(schoolMember);

  if (!member) {
    logWarn("SchoolMember not found for WhatsApp notification", { schoolMember });
    return attendance;
  }

  // --- 3️⃣ Format parent phone numbers ---
  const phones = [];
  if (member.dadPhone) phones.push("+20" + member.dadPhone.replace(/^0/, ""));
  if (member.momPhone) phones.push("+20" + member.momPhone.replace(/^0/, ""));

  // --- 4️⃣ Send WhatsApp messages ---
  for (const phone of phones) {
    try {
      const messageText = statusMap[status] || status;
      const msg = await sendWhatsAppReport(phone, date, messageText);
      logInfo("WhatsApp sent", { phone, memberId: member._id, sid: msg.sid, status: msg.status });
    } catch (err) {
      logError(`Error sending WhatsApp to ${phone}`, err);
    }
  }

  return attendance;
};
*/
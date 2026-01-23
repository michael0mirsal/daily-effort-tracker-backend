import Twilio from "twilio";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" }); // load env variables

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const sandboxNumber = process.env.WHATSAPP_SANDBOX_NUMBER;

const client = new Twilio(accountSid, authToken);

export async function sendWhatsAppReport(toPhone, reportDate, stars) {
  try {
    console.log("📤 Sending WhatsApp via Twilio:", toPhone, reportDate, stars);
    const message = await client.messages.create({
      to: `whatsapp:${toPhone}`,
      from: sandboxNumber,
      body: `📘 Attendance Update
Date: ${reportDate}
Status: ${statusText}`
    });

    console.log("✅ Twilio accepted message:", message.sid);
    return message; // <-- return for logging
  } catch (err) {
    console.error("❌ Error sending WhatsApp:", err);
    throw err; // <-- allow caller to handle/log
  }
}


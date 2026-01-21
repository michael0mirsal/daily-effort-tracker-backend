import Twilio from "twilio";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" }); // load env variables

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const sandboxNumber = process.env.WHATSAPP_SANDBOX_NUMBER;

const client = new Twilio(accountSid, authToken);

export async function sendWhatsAppReport(toPhone, reportDate, stars) {
  try {
    const message = await client.messages.create({
      to: `whatsapp:${toPhone}`,
      from: sandboxNumber,
      contentSid: "HXb5b62575e6e4ff6129ad7c8efe1f983e", // Template SID
      contentVariables: JSON.stringify({
        "1": reportDate,
        "2": stars
      }),
    });

    // ✅ Log Twilio status
    console.log(`Twilio Message SID: ${message.sid}`);
    console.log(`Status: ${message.status}`);
    console.log(`To: ${message.to}, From: ${message.from}`);
  } catch (err) {
    console.error("❌ Error sending WhatsApp:", err);
  }
}


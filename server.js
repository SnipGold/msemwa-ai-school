weimport express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), "public")));

const PORT = process.env.PORT || 3000;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v24.0";
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

async function loadDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  } catch {
    const db = {
      settings: {
        schoolName: process.env.SCHOOL_NAME || "Lightness Pre and Primary School",
        location: process.env.SCHOOL_LOCATION || "Manyoni, Singida, Tanzania",
        phone: process.env.SCHOOL_PHONE || "",
        email: process.env.SCHOOL_EMAIL || "",
        feesInfo: process.env.SCHOOL_FEES_INFO || "Contact the school office for current fee schedules.",
        officeHours: process.env.OFFICE_HOURS || "Monday-Friday 07:30-16:30"
      },
      students: [], admissions: [], attendance: [], messages: []
    };
    await saveDb(db);
    return db;
  }
}

async function saveDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function sanitizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}
function nowIso() { return new Date().toISOString(); }

function adminAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) {
    return res.status(401).set("WWW-Authenticate", "Basic").send("Authentication required");
  }
  const decoded = Buffer.from(auth.slice(6), "base64").toString();
  const i = decoded.indexOf(":");
  const u = i >= 0 ? decoded.slice(0, i) : "";
  const p = i >= 0 ? decoded.slice(i + 1) : "";
  if (u !== (process.env.ADMIN_USERNAME || "admin") ||
      p !== (process.env.ADMIN_PASSWORD || "CHANGE_ME")) {
    return res.status(401).set("WWW-Authenticate", "Basic").send("Invalid credentials");
  }
  next();
}

function extractTextMessages(body) {
  const out = [];
  for (const entry of body?.entry || []) {
    for (const change of entry?.changes || []) {
      const value = change?.value;
      for (const message of value?.messages || []) {
        if (message.type !== "text" || !message.text?.body) continue;
        const contact = (value?.contacts || []).find(c => c.wa_id === message.from);
        out.push({
          from: message.from,
          name: contact?.profile?.name || "",
          text: message.text.body,
          messageId: message.id
        });
      }
    }
  }
  return out;
}

async function sendWhatsAppText(to, text) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp credentials are not configured.");
  }
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: sanitizePhone(to).replace("+", ""),
      type: "text",
      text: { preview_url: false, body: text }
    })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`WhatsApp API ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

function buildInstructions(db) {
  return `You are the official WhatsApp AI assistant for ${db.settings.schoolName}.
Location: ${db.settings.location}.
School phone: ${db.settings.phone || "not provided"}.
School email: ${db.settings.email || "not provided"}.
Office hours: ${db.settings.officeHours}.
Fee information: ${db.settings.feesInfo}.

Rules:
1. Be polite, concise and helpful.
2. Answer in English or Swahili, matching the parent's language.
3. Never invent fees, dates, policies, student results, payment status or other school facts.
4. Do not reveal private student information without an authenticated process.
5. When information is unavailable, direct the parent to the school office.
6. You are the school's AI assistant, not a human employee.`;
}

async function generateReply(db, phone, userText) {
  if (!openai) {
    return "Asante kwa kuwasiliana na shule. AI haijaunganishwa bado. Tafadhali wasiliana na ofisi ya shule kwa msaada.";
  }

  const history = db.messages
    .filter(m => m.phone === phone)
    .slice(-8)
    .map(m => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.text
    }));

  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    store: false,
    instructions: buildInstructions(db),
    input: [...history, { role: "user", content: userText }]
  });
  return (response.output_text || "Tafadhali wasiliana na ofisi ya shule.").trim();
}

/* Meta/WhatsApp webhook verification */
app.get("/webhook", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }
  return res.sendStatus(403);
});

/* Meta/WhatsApp inbound messages */
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const db = await loadDb();
    for (const msg of extractTextMessages(req.body)) {
      const inbound = {
        id: crypto.randomUUID(),
        phone: sanitizePhone(msg.from),
        name: msg.name,
        direction: "inbound",
        text: msg.text,
        createdAt: nowIso(),
        whatsappMessageId: msg.messageId
      };
      db.messages.push(inbound);
      await saveDb(db);

      const reply = await generateReply(db, inbound.phone, msg.text);
      db.messages.push({
        id: crypto.randomUUID(),
        phone: inbound.phone,
        name: msg.name,
        direction: "outbound",
        text: reply,
        createdAt: nowIso()
      });
      await saveDb(db);

      try {
        await sendWhatsAppText(msg.from, reply);
      } catch (e) {
        console.error("WhatsApp send error:", e.message);
      }
    }
  } catch (e) {
    console.error("Webhook error:", e);
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    whatsappConfigured: !!(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
    )
  });
});

app.get("/api/stats", adminAuth, async (req, res) => {
  const db = await loadDb();
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    students: db.students.length,
    admissions: db.admissions.length,
    attendanceToday: db.attendance.filter(a => String(a.date).slice(0, 10) === today).length,
    absentToday: db.attendance.filter(a => String(a.date).slice(0, 10) === today && a.status === "Absent").length,
    messages: db.messages.length
  });
});

app.get("/api/messages", adminAuth, async (req, res) => {
  const db = await loadDb();
  res.json(db.messages.slice(-200).reverse());
});

app.get("/api/students", adminAuth, async (req, res) => {
  const db = await loadDb();
  res.json(db.students);
});

app.post("/api/students", adminAuth, async (req, res) => {
  const db = await loadDb();
  const student = {
    id: crypto.randomUUID(),
    name: String(req.body.name || "").trim(),
    className: String(req.body.className || "").trim(),
    parentPhone: sanitizePhone(req.body.parentPhone),
    feeBalance: Number(req.body.feeBalance || 0),
    feeStatus: String(req.body.feeStatus || "Due"),
    createdAt: nowIso()
  };
  if (!student.name || !student.parentPhone) {
    return res.status(400).json({ error: "Student name and parent phone are required." });
  }
  db.students.push(student);
  await saveDb(db);
  res.status(201).json(student);
});

app.get("/api/admissions", adminAuth, async (req, res) => {
  const db = await loadDb();
  res.json(db.admissions.slice().reverse());
});

app.post("/api/admissions", adminAuth, async (req, res) => {
  const db = await loadDb();
  const item = {
    id: crypto.randomUUID(),
    parentName: String(req.body.parentName || "").trim(),
    childName: String(req.body.childName || "").trim(),
    className: String(req.body.className || "").trim(),
    phone: sanitizePhone(req.body.phone),
    createdAt: nowIso(),
    status: "New"
  };
  db.admissions.push(item);
  await saveDb(db);
  res.status(201).json(item);
});

app.post("/api/attendance", adminAuth, async (req, res) => {
  const db = await loadDb();
  const item = {
    id: crypto.randomUUID(),
    studentId: String(req.body.studentId || ""),
    studentName: String(req.body.studentName || ""),
    className: String(req.body.className || ""),
    status: req.body.status === "Present" ? "Present" : "Absent",
    date: req.body.date || nowIso(),
    createdAt: nowIso()
  };
  db.attendance.push(item);
  await saveDb(db);

  if (item.status === "Absent") {
    const student = db.students.find(s => s.id === item.studentId);
    if (student?.parentPhone) {
      const message =
        `Dear Parent, ${student.name} was marked absent from ${db.settings.schoolName} today. ` +
        `Please contact the school office if assistance is needed.`;
      db.messages.push({
        id: crypto.randomUUID(),
        phone: student.parentPhone,
        direction: "outbound",
        text: message,
        createdAt: nowIso()
      });
      await saveDb(db);
      try { await sendWhatsAppText(student.parentPhone, message); }
      catch (e) { console.error("Attendance alert error:", e.message); }
    }
  }
  res.status(201).json(item);
});

app.post("/api/fee-reminders/run", adminAuth, async (req, res) => {
  const db = await loadDb();
  let sent = 0, failed = 0;
  for (const s of db.students.filter(x => x.feeStatus === "Due" && Number(x.feeBalance) > 0)) {
    if (!s.parentPhone) continue;
    const message =
      `Dear Parent, this is a reminder from ${db.settings.schoolName} that ${s.name}'s ` +
      `outstanding school fee balance is TSh ${Number(s.feeBalance).toLocaleString()}. ` +
      `Please contact the school office for payment details.`;
    try {
      await sendWhatsAppText(s.parentPhone, message);
      db.messages.push({
        id: crypto.randomUUID(),
        phone: s.parentPhone,
        direction: "outbound",
        text: message,
        createdAt: nowIso()
      });
      sent++;
    } catch {
      failed++;
    }
  }
  await saveDb(db);
  res.json({ sent, failed });
});

app.get("/api/settings", adminAuth, async (req, res) => {
  const db = await loadDb();
  res.json(db.settings);
});

app.put("/api/settings", adminAuth, async (req, res) => {
  const db = await loadDb();
  db.settings = {
    ...db.settings,
    schoolName: String(req.body.schoolName || db.settings.schoolName),
    location: String(req.body.location || db.settings.location),
    phone: String(req.body.phone || ""),
    email: String(req.body.email || ""),
    feesInfo: String(req.body.feesInfo || ""),
    officeHours: String(req.body.officeHours || "")
  };
  await saveDb(db);
  res.json(db.settings);
});

});
app.listen(PORT, () => {
  console.log(`Msemwa AI School Automation running on port ${PORT}`);
});

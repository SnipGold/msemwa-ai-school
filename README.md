# Msemwa AI School Automation — v1.0

This is a complete lightweight starter application for a school WhatsApp AI assistant.

## Included
- WhatsApp webhook receiver
- WhatsApp text replies via Meta Cloud API
- OpenAI Responses API integration
- School-specific AI instructions
- Student database
- Admissions records
- Attendance records
- Automatic absence alert
- Fee reminder endpoint
- Mobile-friendly admin dashboard
- Dockerfile for deployment

## Run
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Add your credentials.
4. Run:
   npm install
   npm start
5. Open http://localhost:3000

## External credentials still required
The software cannot create Meta or OpenAI accounts on your behalf. You must supply:
- Meta WhatsApp Cloud API access token
- WhatsApp phone number ID
- WhatsApp webhook verification token
- OpenAI API key

The OpenAI API uses the Responses API and the official JavaScript SDK.

## WhatsApp webhook
Use:
https://YOUR-DOMAIN/webhook

Verification token:
the same value as WHATSAPP_VERIFY_TOKEN.

Subscribe to the WhatsApp `messages` webhook.

## Important
- Use HTTPS for production.
- Change ADMIN_PASSWORD immediately.
- Keep API keys in server environment variables.
- Student data should move to PostgreSQL/Supabase before large-scale use.
- Add role-based authentication before selling to multiple schools.
- Follow Meta WhatsApp template/messaging-window requirements for business-initiated messages.

## Production roadmap
1. PostgreSQL/Supabase multi-school database.
2. Teacher accounts and attendance UI.
3. Parent portal.
4. Report card generation.
5. Timetable and notices.
6. Approved WhatsApp templates.
7. Multi-tenant SaaS billing.

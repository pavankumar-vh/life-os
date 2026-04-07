import Mailjet from 'node-mailjet'

let client: ReturnType<typeof Mailjet.apiConnect> | null = null

function getClient() {
  if (!client) {
    const apiKey = process.env.MAILJET_API_KEY
    const apiSecret = process.env.MAILJET_API_SECRET
    if (!apiKey || !apiSecret) throw new Error('MAILJET_API_KEY and MAILJET_API_SECRET are required')
    client = Mailjet.apiConnect(apiKey, apiSecret)
  }
  return client
}

const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'noreply@lifeos.app'
const FROM_NAME  = process.env.MAILJET_FROM_NAME  || 'LifeOS'
const APP_URL    = process.env.FRONTEND_URL        || process.env.APP_URL || 'https://example.com'

// ─── Welcome Email ────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string) {
  try {
    await getClient().post('send', { version: 'v3.1' }).request({
      Messages: [{
        From: { Email: FROM_EMAIL, Name: FROM_NAME },
        To: [{ Email: to, Name: name }],
        Subject: `Welcome to LifeOS, ${name} ⚡`,
        HTMLPart: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to LifeOS</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,rgba(232,213,183,0.12),rgba(201,168,124,0.06));padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:rgba(232,213,183,0.1);border:1px solid rgba(232,213,183,0.2);border-radius:14px;margin-bottom:16px;">
              <span style="font-size:22px;">⚡</span>
            </div>
            <h1 style="color:#e8d5b7;font-size:28px;font-weight:700;margin:0;letter-spacing:-0.5px;">LifeOS</h1>
            <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:6px 0 0;">Your personal command center</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h2 style="color:#f5f0e8;font-size:20px;font-weight:600;margin:0 0 12px;">Welcome aboard, ${name}!</h2>
            <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;margin:0 0 24px;">
              Your LifeOS account is ready. Start tracking your habits, goals, workouts, diet and everything in between — all in one place.
            </p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:12px 0;border-top:1px solid rgba(255,255,255,0.05);">
                  <span style="color:rgba(255,255,255,0.35);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Get started with</span>
                </td>
              </tr>
              ${[['🎯','Goals','Set your first monthly goal'],['✅','Habits','Build a daily routine in 30 seconds'],['💬','AI Chat','Ask your AI coach anything'],['📊','Dashboard','Your life, at a glance']].map(([icon,title,desc])=>`
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                  <span style="font-size:16px;">${icon}</span>&nbsp;
                  <span style="color:#e8d5b7;font-size:13px;font-weight:600;">${title}</span>
                  <span style="color:rgba(255,255,255,0.35);font-size:13px;"> — ${desc}</span>
                </td>
              </tr>`).join('')}
            </table>
            <div style="margin-top:28px;text-align:center;">
              <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#e8d5b7,#c9a87c);color:#1a1a1a;text-decoration:none;font-size:13px;font-weight:700;padding:12px 28px;border-radius:10px;letter-spacing:0.2px;">
                Open LifeOS →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
            <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
              Built for those who track everything · You received this because you signed up at LifeOS
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }],
    })
  } catch (err) {
    console.error('[mailer] Welcome email failed:', err)
  }
}

// ─── Password Reset Email ─────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
  try {
    await getClient().post('send', { version: 'v3.1' }).request({
      Messages: [{
        From: { Email: FROM_EMAIL, Name: FROM_NAME },
        To: [{ Email: to, Name: name }],
        Subject: 'Reset your LifeOS password',
        HTMLPart: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Reset Password</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,rgba(232,213,183,0.12),rgba(201,168,124,0.06));padding:36px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:rgba(232,213,183,0.1);border:1px solid rgba(232,213,183,0.2);border-radius:14px;margin-bottom:16px;">
              <span style="font-size:22px;">🔒</span>
            </div>
            <h1 style="color:#e8d5b7;font-size:24px;font-weight:700;margin:0;">Reset Password</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;margin:0 0 8px;">Hi <strong style="color:#f5f0e8;">${name}</strong>,</p>
            <p style="color:rgba(255,255,255,0.55);font-size:14px;line-height:1.7;margin:0 0 24px;">
              We received a request to reset your password. Click the button below to create a new one. This link expires in <strong style="color:#e8d5b7;">30 minutes</strong>.
            </p>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#e8d5b7,#c9a87c);color:#1a1a1a;text-decoration:none;font-size:13px;font-weight:700;padding:13px 32px;border-radius:10px;">
                Reset My Password →
              </a>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px 16px;">
              <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;">Or paste this link</p>
              <p style="color:rgba(232,213,183,0.5);font-size:11px;margin:0;word-break:break-all;">${resetUrl}</p>
            </div>
            <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:20px 0 0;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
            <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">LifeOS · Built for those who track everything</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }],
    })
  } catch (err) {
    console.error('[mailer] Reset email failed:', err)
    throw err
  }
}

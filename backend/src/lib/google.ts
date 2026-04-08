import { google, Auth } from 'googleapis'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
]

// Single canonical redirect URI for ALL Google OAuth flows.
// Only ONE URI needs to be registered in Google Cloud Console:
//   - Local:  http://localhost:3000/auth/google/callback
//   - Prod:   https://life-os.pavankumarvh.me/auth/google/callback
export function getRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    (process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/auth/google/callback`
      : 'http://localhost:3000/auth/google/callback')
  )
}

export function getOAuth2Client(): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  )
}

export function getAuthUrl(state?: string): string {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  })
}

export function getAuthedClient(tokens: { access_token?: string; refresh_token?: string }): Auth.OAuth2Client {
  const client = getOAuth2Client()
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
  return client
}

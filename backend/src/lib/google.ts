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

export function getOAuth2Client(): Auth.OAuth2Client {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
    || (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/api/google/callback` : undefined)

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
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

export function getAuthedClient(tokens: { access_token: string; refresh_token?: string }): Auth.OAuth2Client {
  const client = getOAuth2Client()
  client.setCredentials(tokens)
  return client
}

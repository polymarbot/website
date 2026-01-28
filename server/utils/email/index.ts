import { Resend } from 'resend'

/**
 * Create Resend client
 */
function getResendClient () {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }

  return new Resend(apiKey)
}

/**
 * Build verification email HTML content
 */
function buildVerificationEmailHtml (t: I18nTranslatorFn, code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${t('verification.title')}</h2>
      <p>${t('verification.description')}</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
        ${code}
      </div>
      <p>${t('verification.expiry')}</p>
      <p>${t('verification.ignore')}</p>
    </div>
  `
}

/**
 * Send verification code email
 */
export async function sendVerificationEmail (email: string, code: string) {
  const resend = getResendClient()
  const event = useEvent()
  const t = await getTranslations(event, 'server.utils.email')

  const { error } = await resend.emails.send({
    from: 'PolymarBot <noreply@polymarbot.com>',
    to: email,
    subject: t('verification.subject'),
    html: buildVerificationEmailHtml(t, code),
  })

  if (error) {
    console.error('Resend error:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

/**
 * Extract name from email address
 * Returns the part before the '@' symbol
 */
export function extractNameFromEmail (email?: string | null): string {
  if (!email) return 'Anonymous'
  if (!email.includes('@')) return email
  return email.split('@')[0] || ''
}

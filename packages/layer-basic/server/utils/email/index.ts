import { Resend } from 'resend'

const appName = process.env.APP_NAME
const appDomain = process.env.APP_DOAMIN
const appOrigin = process.env.APP_ORIGIN

/**
 * Extract root domain from a domain string (e.g. "app.example.com" -> "example.com")
 */
function getRootDomain (domain: string): string {
  const parts = domain.split('.')
  if (parts.length <= 2) return domain
  return parts.slice(-2).join('.')
}

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
 * Build brand header HTML for email templates
 */
function buildBrandHeader (): string {
  if (!appOrigin || !appName) return ''

  return `
    <a href="${appOrigin}" target="_blank" style="text-decoration: none; display: inline-block;">
      <img src="${appOrigin}/img/logo.bg.png" alt="${appName}" width="40" height="40" style="display: inline-block; vertical-align: middle;" />
      <span style="font-size: 20px; font-weight: bold; color: #111; margin-left: 8px; vertical-align: middle;">${appName}</span>
    </a>
  `
}

/**
 * Build brand footer HTML for email templates
 */
function buildBrandFooter (t: I18nTranslatorFn, email: string): string {
  const footerText = t('server.utils.email.verification.footer', { email })

  return `
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0 24px;" />
    <p style="font-size: 13px; line-height: 1.6; color: #888; margin: 0;">${footerText}</p>
    ${appOrigin && appDomain ? `<p style="font-size: 13px; color: #888; margin: 16px 0 0;"><a href="${appOrigin}" target="_blank" style="color: #888; text-decoration: none;">${appDomain}</a></p>` : ''}
  `
}

/**
 * Build email subject with optional brand prefix
 */
function buildSubject (subject: string): string {
  return appName ? `${appName} - ${subject}` : subject
}

/**
 * Build verification email HTML content
 */
function buildVerificationEmailHtml (t: I18nTranslatorFn, email: string, code: string, expiresIn: number): string {
  const minutes = Math.round(expiresIn / 60)
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 40px;">
      ${buildBrandHeader()}
      <h2 style="font-size: 18px; font-weight: bold; color: #111; margin: 28px 0 16px;">${t('server.utils.email.verification.title')}</h2>
      <p style="font-size: 15px; color: #333; line-height: 1.6; margin: 0 0 24px;">${t('server.utils.email.verification.description')}</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">
        ${code}
      </div>
      <p style="font-size: 15px; font-weight: bold; color: #111; margin: 24px 0 0;">${t('server.utils.email.verification.expiry', { minutes })}</p>
      ${buildBrandFooter(t, email)}
    </div>
  `
}

/**
 * Send verification code email
 * @param email - Recipient email address
 * @param code - OTP verification code
 * @param expiresIn - OTP expiration time in seconds
 */
export async function sendVerificationEmail (email: string, code: string, expiresIn: number) {
  const resend = getResendClient()
  const event = useEvent()
  const t = await getTranslations(event)

  const { error } = await resend.emails.send({
    from: `${appName} <noreply@${appDomain ? getRootDomain(appDomain) : ''}>`,
    to: email,
    subject: buildSubject(t('server.utils.email.verification.subject')),
    html: buildVerificationEmailHtml(t, email, code, expiresIn),
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

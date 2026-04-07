import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | LifeOS',
  description: 'How LifeOS collects, uses, protects, and shares personal information.',
}

const LAST_UPDATED = 'April 8, 2026'

const navItems = [
  { id: 'scope', label: 'Scope and Controller' },
  { id: 'data-we-collect', label: 'Data We Collect' },
  { id: 'how-we-use-data', label: 'How We Use Data' },
  { id: 'lawful-bases', label: 'Lawful Bases' },
  { id: 'cookies-storage', label: 'Cookies and Storage' },
  { id: 'google-api', label: 'Google API Data' },
  { id: 'sharing', label: 'Sharing and Disclosure' },
  { id: 'retention', label: 'Retention' },
  { id: 'security', label: 'Security' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'international-transfers', label: 'International Transfers' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Policy Changes' },
  { id: 'contact', label: 'Contact' },
]

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg md:text-xl font-semibold text-text-primary">{title}</h2>
      <div className="space-y-3 text-sm md:text-[15px] leading-7 text-text-secondary">{children}</div>
    </section>
  )
}

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-6xl">
        <div
          className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl"
          style={{ boxShadow: '0 24px 64px -24px rgba(0,0,0,0.7)' }}
        >
          <header className="border-b border-white/10 px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted/70">Legal</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Privacy Policy</h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base text-text-muted">
              This Privacy Policy explains what information LifeOS collects, how we use it, and the choices you have. It is
              designed to be transparent, specific, and aligned with common global privacy standards.
            </p>
            <p className="mt-4 text-xs md:text-sm text-text-muted">Last updated: {LAST_UPDATED}</p>
          </header>

          <div className="grid gap-8 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[260px,1fr]">
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted/70">On this page</p>
                <nav className="mt-3 space-y-2">
                  {navItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block text-sm text-text-muted hover:text-accent transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            <article className="space-y-8">
              <Section id="scope" title="1. Scope and Data Controller">
                <p>
                  LifeOS ("LifeOS", "we", "our", or "us") provides a personal productivity platform that includes tools such as
                  planning, journaling, habits, health tracking, and AI-assisted workflows. This policy applies to personal data
                  processed through our website, web application, and related services.
                </p>
                <p>
                  For privacy law purposes, LifeOS is the controller of the personal data we collect directly from users for account
                  management, security, and service operations.
                </p>
              </Section>

              <Section id="data-we-collect" title="2. Data We Collect">
                <p>We collect only the data needed to operate and improve LifeOS, including:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-medium text-text-primary">Account and identity data:</span> name, email address, profile
                    image, authentication provider identifiers, and basic account preferences.
                  </li>
                  <li>
                    <span className="font-medium text-text-primary">User-generated content:</span> entries, tasks, habits, notes,
                    whiteboards, wellness logs, and other content you create in the product.
                  </li>
                  <li>
                    <span className="font-medium text-text-primary">Device and technical data:</span> IP address, browser type,
                    operating system, approximate location from IP, and diagnostic events for reliability.
                  </li>
                  <li>
                    <span className="font-medium text-text-primary">Usage data:</span> feature interactions, event timestamps,
                    navigation patterns, and performance telemetry used to improve product quality.
                  </li>
                  <li>
                    <span className="font-medium text-text-primary">Support communications:</span> feedback, issue reports, and
                    direct messages sent to support channels.
                  </li>
                </ul>
              </Section>

              <Section id="how-we-use-data" title="3. How We Use Personal Data">
                <p>We use personal data to:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Create and manage your account, including login and security verification.</li>
                  <li>Provide product functionality and store the content you create.</li>
                  <li>Maintain platform stability, detect abuse, and investigate security incidents.</li>
                  <li>Improve existing features and develop new product capabilities.</li>
                  <li>Communicate service notices, policy changes, and support responses.</li>
                  <li>Comply with legal obligations and enforce our contractual terms.</li>
                </ul>
              </Section>

              <Section id="lawful-bases" title="4. Lawful Bases for Processing (Where Applicable)">
                <p>
                  If you are in a jurisdiction that requires legal basis disclosures (such as the EEA/UK), we process personal data
                  under one or more of the following bases:
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <span className="font-medium text-text-primary">Contract performance:</span> to provide the service you request.
                  </li>
                  <li>
                    <span className="font-medium text-text-primary">Legitimate interests:</span> to secure, maintain, and improve
                    LifeOS.
                  </li>
                  <li>
                    <span className="font-medium text-text-primary">Consent:</span> where required, such as for optional integrations
                    or certain analytics practices.
                  </li>
                  <li>
                    <span className="font-medium text-text-primary">Legal obligation:</span> where processing is required by law.
                  </li>
                </ul>
              </Section>

              <Section id="cookies-storage" title="5. Cookies, Local Storage, and Similar Technologies">
                <p>
                  LifeOS uses browser storage and similar technologies for authentication, session continuity, product preferences,
                  and application performance.
                </p>
                <p>
                  We do not use storage technologies to sell personal data. You can manage cookies through browser settings, but
                  disabling essential storage may impact core features such as sign-in and state persistence.
                </p>
              </Section>

              <Section id="google-api" title="6. Google API Services and OAuth Data">
                <p>
                  If you choose "Continue with Google," we receive limited account profile data from Google, such as your name,
                  email address, and profile image. We use this information only for authentication, account linking, and account
                  security.
                </p>
                <p>
                  LifeOS handling of information received from Google APIs will adhere to the
                  <a
                    href="https://developers.google.com/terms/api-services-user-data-policy"
                    target="_blank"
                    rel="noreferrer"
                    className="mx-1 text-accent hover:underline"
                  >
                    Google API Services User Data Policy
                  </a>
                  including the Limited Use requirements where applicable.
                </p>
              </Section>

              <Section id="sharing" title="7. Sharing and Disclosure">
                <p>We do not sell personal data. We may share personal data only in these limited situations:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>With service providers that process data under contractual confidentiality obligations.</li>
                  <li>With integrations you explicitly connect and authorize.</li>
                  <li>To comply with legal process or valid requests from authorities.</li>
                  <li>To protect rights, safety, and platform security in fraud or abuse investigations.</li>
                  <li>As part of a merger, acquisition, or asset transfer, with notice where required by law.</li>
                </ul>
              </Section>

              <Section id="retention" title="8. Data Retention">
                <p>
                  We retain personal data for as long as needed to provide LifeOS, comply with legal obligations, resolve disputes,
                  and enforce our agreements. Retention periods vary by data type and operational need.
                </p>
                <p>
                  When data is no longer required, we delete or anonymize it within reasonable technical and operational timelines.
                </p>
              </Section>

              <Section id="security" title="9. Security Measures">
                <p>
                  We use administrative, technical, and organizational safeguards intended to protect personal data, including access
                  controls, authenticated access paths, and monitoring for suspicious activity.
                </p>
                <p>
                  No online system is absolutely secure. You are responsible for maintaining secure credentials and for notifying us
                  promptly if you suspect unauthorized account access.
                </p>
              </Section>

              <Section id="your-rights" title="10. Your Privacy Rights">
                <p>Depending on your location, you may have rights to:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Access a copy of your personal data.</li>
                  <li>Correct inaccurate personal data.</li>
                  <li>Delete personal data, subject to legal and contractual limits.</li>
                  <li>Object to or restrict specific processing activities.</li>
                  <li>Request portability of eligible data.</li>
                  <li>Withdraw consent where processing is based on consent.</li>
                </ul>
                <p>
                  To exercise rights, contact us using the details in the Contact section. We may verify your identity before
                  processing requests.
                </p>
              </Section>

              <Section id="international-transfers" title="11. International Data Transfers">
                <p>
                  If data is transferred across borders, we use appropriate safeguards required under applicable law, such as
                  contractual protections and equivalent security controls.
                </p>
              </Section>

              <Section id="children" title="12. Children and Age Restrictions">
                <p>
                  LifeOS is not directed to children under 13 (or higher minimum ages where required locally). If we learn that we
                  have collected personal data from a child without valid authorization, we will take steps to delete it.
                </p>
              </Section>

              <Section id="changes" title="13. Changes to This Policy">
                <p>
                  We may update this policy to reflect changes in legal requirements, product capabilities, or operational practices.
                  Material changes will be communicated through appropriate channels before they take effect when required.
                </p>
              </Section>

              <Section id="contact" title="14. Contact Information">
                <p>
                  For privacy questions, data rights requests, or security concerns, contact: 
                  <a href="mailto:privacy@lifeos.app" className="text-accent hover:underline">privacy@lifeos.app</a>
                </p>
                <p>
                  You can also review our service conditions in the
                  <Link href="/terms" className="mx-1 text-accent hover:underline">
                    Terms of Service
                  </Link>
                  page.
                </p>
              </Section>

              <div className="border-t border-white/10 pt-6 text-sm text-text-muted">
                <Link href="/" className="text-accent hover:underline">
                  Return to Home
                </Link>
              </div>
            </article>
          </div>
        </div>
      </div>
    </main>
  )
}

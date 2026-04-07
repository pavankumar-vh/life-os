import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | LifeOS',
  description: 'The terms that govern access to and use of LifeOS.',
}

const LAST_UPDATED = 'April 8, 2026'

const navItems = [
  { id: 'acceptance', label: 'Acceptance' },
  { id: 'eligibility', label: 'Eligibility and Accounts' },
  { id: 'service-scope', label: 'Service Scope' },
  { id: 'acceptable-use', label: 'Acceptable Use' },
  { id: 'user-content', label: 'User Content' },
  { id: 'ai-features', label: 'AI Features' },
  { id: 'third-party', label: 'Third-Party Services' },
  { id: 'intellectual-property', label: 'Intellectual Property' },
  { id: 'termination', label: 'Suspension and Termination' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Liability Limits' },
  { id: 'indemnification', label: 'Indemnification' },
  { id: 'law-disputes', label: 'Law and Disputes' },
  { id: 'changes', label: 'Changes to Terms' },
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

export default function TermsOfService() {
  return (
    <main className="min-h-screen px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-6xl">
        <div
          className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-xl"
          style={{ boxShadow: '0 24px 64px -24px rgba(0,0,0,0.7)' }}
        >
          <header className="border-b border-white/10 px-6 py-8 md:px-10 md:py-10">
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted/70">Legal</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-text-primary">Terms of Service</h1>
            <p className="mt-3 max-w-3xl text-sm md:text-base text-text-muted">
              These Terms of Service govern your access to and use of LifeOS. Please read them carefully because they define your
              rights, responsibilities, and limitations when using the platform.
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
              <Section id="acceptance" title="1. Acceptance of Terms">
                <p>
                  By creating an account, accessing, or using LifeOS, you agree to be bound by these Terms of Service and our
                  Privacy Policy. If you do not agree, do not use the service.
                </p>
              </Section>

              <Section id="eligibility" title="2. Eligibility and Account Responsibilities">
                <p>
                  You must be at least the minimum age required by applicable law in your jurisdiction to use LifeOS. You are
                  responsible for maintaining accurate account information and safeguarding your credentials.
                </p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Keep your password and authentication methods secure.</li>
                  <li>Notify us promptly about any suspected unauthorized account activity.</li>
                  <li>Remain responsible for activity under your account unless caused by our breach.</li>
                </ul>
              </Section>

              <Section id="service-scope" title="3. Service Scope and Availability">
                <p>
                  LifeOS provides digital productivity and personal management features, including optional AI-assisted tools. We may
                  update, improve, or discontinue features over time to maintain product quality, security, and legal compliance.
                </p>
                <p>
                  We do not guarantee uninterrupted or error-free operation and may perform maintenance or emergency changes without
                  prior notice when necessary.
                </p>
              </Section>

              <Section id="acceptable-use" title="4. Acceptable Use and Prohibited Conduct">
                <p>You agree not to misuse LifeOS. Prohibited behavior includes:</p>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Violating laws, regulations, or third-party rights.</li>
                  <li>Attempting unauthorized access to systems, data, or accounts.</li>
                  <li>Reverse engineering or interfering with service reliability and security.</li>
                  <li>Submitting malicious code, spam, fraudulent content, or abusive material.</li>
                  <li>Using the service in ways that materially degrade performance for other users.</li>
                </ul>
              </Section>

              <Section id="user-content" title="5. User Content and License">
                <p>
                  You retain ownership of the content you create in LifeOS. By uploading or submitting content, you grant us a
                  limited, non-exclusive license to host, process, store, and display that content solely to operate and improve the
                  service.
                </p>
                <p>
                  You represent that you have the rights required to provide such content and that your content does not violate law
                  or third-party rights.
                </p>
              </Section>

              <Section id="ai-features" title="6. AI Features and Output Disclaimer">
                <p>
                  LifeOS may include AI-generated suggestions or summaries. AI output can be inaccurate, incomplete, or unsuitable
                  for your context. You are responsible for reviewing and validating AI output before relying on it.
                </p>
                <p>
                  AI features are provided for informational and productivity assistance and are not professional advice of any kind.
                </p>
              </Section>

              <Section id="third-party" title="7. Third-Party Services and Integrations">
                <p>
                  LifeOS may integrate with third-party services, including Google authentication and APIs. Your use of third-party
                  services is governed by their own terms and privacy policies.
                </p>
                <p>
                  We are not responsible for third-party services, their availability, or their data handling practices beyond our
                  direct control.
                </p>
              </Section>

              <Section id="intellectual-property" title="8. Intellectual Property Rights">
                <p>
                  LifeOS, including software, design, branding, and documentation, is protected by applicable intellectual property
                  laws. Except for the limited license to use the service, no rights are transferred to you.
                </p>
              </Section>

              <Section id="termination" title="9. Suspension and Termination">
                <p>
                  You may stop using LifeOS at any time. We may suspend or terminate access if we reasonably believe you have
                  violated these terms, created security risk, or used the platform unlawfully.
                </p>
                <p>
                  After termination, provisions that by nature should survive termination will remain in effect, including ownership,
                  disclaimers, liability limits, and dispute terms.
                </p>
              </Section>

              <Section id="disclaimers" title="10. Disclaimers">
                <p>
                  To the fullest extent permitted by law, LifeOS is provided on an "as is" and "as available" basis. We disclaim all
                  implied warranties, including merchantability, fitness for a particular purpose, and non-infringement.
                </p>
              </Section>

              <Section id="liability" title="11. Limitation of Liability">
                <p>
                  To the fullest extent permitted by law, LifeOS and its affiliates will not be liable for indirect, incidental,
                  special, consequential, or punitive damages, or loss of profits, data, goodwill, or business interruption.
                </p>
                <p>
                  Where permitted by law, our aggregate liability for claims arising out of or relating to the service will not exceed
                  the greater of the amount you paid to us in the prior 12 months or USD $100.
                </p>
              </Section>

              <Section id="indemnification" title="12. Indemnification">
                <p>
                  You agree to defend, indemnify, and hold harmless LifeOS and its affiliates from claims, liabilities, damages,
                  losses, and expenses arising from your misuse of the service, your content, or your breach of these terms.
                </p>
              </Section>

              <Section id="law-disputes" title="13. Governing Law and Dispute Resolution">
                <p>
                  These terms are governed by applicable local law in the jurisdiction where LifeOS operates, without regard to
                  conflict-of-law principles. Disputes will be resolved in competent courts of that jurisdiction unless otherwise
                  required by mandatory consumer law.
                </p>
              </Section>

              <Section id="changes" title="14. Changes to These Terms">
                <p>
                  We may revise these terms from time to time. If changes are material, we will provide notice by appropriate means.
                  Continued use of LifeOS after updated terms become effective constitutes acceptance.
                </p>
              </Section>

              <Section id="contact" title="15. Contact Information">
                <p>
                  For legal inquiries, contact: <a href="mailto:legal@lifeos.app" className="text-accent hover:underline">legal@lifeos.app</a>
                </p>
                <p>
                  For data handling details, see our
                  <Link href="/privacy" className="mx-1 text-accent hover:underline">
                    Privacy Policy
                  </Link>
                  .
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

import React from 'react';

export const metadata = {
  title: 'Privacy Policy | LifeOS',
  description: 'Privacy Policy for LifeOS',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-bg-dark text-text-primary p-8 md:p-16 max-w-4xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-accent">Privacy Policy</h1>
      <p className="text-sm text-text-muted mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-sm md:text-base leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
          <p>
            When you use LifeOS, we collect information you provide directly to us when you create an account, build your dashboard, and use our application. This includes your email address, profile information, and the data you input into your habits, journals, and other modules.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, to personalize your dashboard, and to communicate with you about your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Third-Party Services</h2>
          <p>
            We use Google as an authentication provider. When you sign in with Google, we receive basic profile information (like your email and public profile picture) according to your Google account settings and their privacy policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
          <p>
            We implement appropriate technical and organizational security measures to protect your personal data against accidental or unlawful destruction, loss, alteration, and unauthorized disclosure or access.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-border/50">
        <a href="/" className="text-accent hover:underline text-sm">
          Return to App
        </a>
      </div>
    </div>
  );
}

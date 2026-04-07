import React from 'react';

export const metadata = {
  title: 'Terms of Service | LifeOS',
  description: 'Terms of Service for LifeOS',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-bg-dark text-text-primary p-8 md:p-16 max-w-4xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6 text-accent">Terms of Service</h1>
      <p className="text-sm text-text-muted mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-sm md:text-base leading-relaxed text-text-secondary">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using LifeOS, you accept and agree to be bound by the terms and provision of this agreement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
          <p>
            LifeOS is a personal dashboard and productivity application. We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Acceptable Use</h2>
          <p>
            You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service. You may not attempt to gain unauthorized access to the service or its related systems.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Disclaimer of Warranties</h2>
          <p>
            Our service is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the operation or availability of the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Limitation of Liability</h2>
          <p>
            LifeOS shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the service.
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

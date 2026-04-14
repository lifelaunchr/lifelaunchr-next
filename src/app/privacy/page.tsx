import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Soar Platform Privacy Policy — LifeLaunchr, Inc.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-gray-900 tracking-tight">
            Soar <span className="text-sm font-normal text-gray-400">by LifeLaunchr</span>
          </Link>
          <Link href="/chat" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Go to app →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective Date: April 1, 2026 &nbsp;|&nbsp; Last Updated: April 1, 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Introduction</h2>
            <p>
              LifeLaunchr, Inc. (&ldquo;LifeLaunchr,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
              &ldquo;our&rdquo;) operates Soar, an AI-powered college and career research platform. This
              Privacy Policy explains what information Soar collects, how we use and protect it, who we share
              it with, and what rights you have.
            </p>
            <p className="mt-3">
              Soar serves several types of users: independent educational consultants and counseling practices
              (&ldquo;Tenants&rdquo; and &ldquo;Counselors&rdquo;), students, and parents. This policy
              addresses data practices for all of them.
            </p>
            <p className="mt-3">
              <strong>LifeLaunchr coaching clients.</strong> If you access Soar as part of a LifeLaunchr
              coaching program, both this Soar Privacy Policy and the LifeLaunchr Privacy Policy may apply.
              In the event of a conflict regarding Soar platform functionality, this Soar Privacy Policy
              controls for that platform-specific processing.
            </p>
            <p className="mt-3">
              By using Soar, you agree to the collection and use of your information as described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p>
              <strong>Account information.</strong> When you create a Soar account, we collect your name, email
              address, and account type (Counselor, Student, Parent, or Tenant). For Tenant accounts, we also
              collect organization name and relevant contact details. Subscription and billing information is
              collected for paid plans.
            </p>
            <p className="mt-3">
              <strong>Student profile data.</strong> Students and counselors may enter academic and personal
              information into Soar to support college and career research, including academic records (GPA,
              course load, class rank, test scores), college preferences, career interests, extracurricular
              activities, and planning notes.
            </p>
            <p className="mt-3">
              <strong>Research and conversation history.</strong> Soar stores the conversations, queries,
              college lists, and AI-generated outputs from your use of the platform. How long this history
              is retained depends on your subscription plan — see Section 7.
            </p>
            <p className="mt-3">
              <strong>Usage data.</strong> We collect information about how you use Soar — features accessed,
              session frequency, and general platform activity. This helps us understand how the platform is
              used and improve it over time.
            </p>
            <p className="mt-3">
              <strong>Communications.</strong> If you contact us for support or other reasons, we retain
              records of that communication.
            </p>
            <p className="mt-3">
              <strong>Payment information.</strong> Payments are processed by Stripe. LifeLaunchr does not
              store your payment card number — Stripe handles all card data under their own security standards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>Deliver Soar&rsquo;s research, planning, and AI-powered features</li>
              <li>Store and retrieve your research history and saved content</li>
              <li>Process payments and manage your subscription</li>
              <li>Send account-related communications (confirmations, notices, security alerts)</li>
              <li>Send product updates and relevant communications to Counselors and Tenants who have opted in</li>
              <li>Improve Soar using aggregated, de-identified usage data</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-3">
              <strong>We do not use your data to serve advertisements. We do not sell your data.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. AI Processing: Anthropic and Claude</h2>
            <p>
              <strong>How it works.</strong> Soar is powered by Claude, a large language model developed by
              Anthropic, PBC. When you interact with Soar — entering questions, student profile details,
              college preferences, or any other input — that information is transmitted to Anthropic&rsquo;s
              servers to generate a response. Anthropic processes this data as part of providing the underlying
              AI capability that powers the platform.
            </p>
            <p className="mt-3">
              <strong>Anthropic&rsquo;s data practices.</strong> Anthropic handles your data in accordance with
              their privacy policy, available at{' '}
              <a href="https://anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                anthropic.com/privacy
              </a>
              . Under Anthropic&rsquo;s API terms, inputs submitted via the API are not used to train
              Anthropic&rsquo;s models by default.
            </p>
            <p className="mt-3">
              <strong>What this means for you.</strong> Your inputs into Soar pass through Anthropic&rsquo;s
              infrastructure as well as LifeLaunchr&rsquo;s. We send only what is necessary to generate a
              useful response.
            </p>
            <p className="mt-3">
              If you have specific concerns about AI processing of your or your student&rsquo;s data, please
              contact us at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>{' '}
              before using Soar&rsquo;s AI features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How We Share Your Information</h2>
            <p>
              <strong>Within your organization.</strong> For Tenant accounts, administrators can view activity
              and data for counselors under their account. Counselors can view data for connected students,
              based on the permissions those students or parents have set.
            </p>
            <p className="mt-3">
              <strong>Third-party service providers.</strong> We use service providers that process data on our
              behalf to operate Soar. See Section 6 for the full list.
            </p>
            <p className="mt-3">
              <strong>Legal process.</strong> We may receive a subpoena, court order, or other legal process
              requiring disclosure of user information. When legally permitted, we will notify the affected user
              before producing records so they have the opportunity to seek a protective order.
            </p>
            <p className="mt-3">
              <strong>Safety and legal requirements.</strong> We may disclose information when necessary to
              protect the safety of any person, prevent fraud, or respond to an emergency.
            </p>
            <p className="mt-3">
              <strong>Business transfers.</strong> If LifeLaunchr is acquired, merges, or transfers its assets,
              your information may transfer as part of that transaction. Where practicable, we will endeavor to
              notify current clients.
            </p>
            <p className="mt-3">
              <strong>We do not sell personal information. We do not share it for advertising purposes.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Counselor and Tenant Responsibility for Student Data</h2>
            <p>
              When a Counselor or Tenant enters student information into Soar, they represent that they have
              the student&rsquo;s permission — and for students under 18, the parent or guardian&rsquo;s
              permission — to enter and process that information for legitimate educational counseling purposes.
            </p>
            <p className="mt-3">
              With respect to student data entered by Counselors or Tenants, LifeLaunchr commits to the following:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>We will not sell student data to any third party</li>
              <li>We will not use student data entered by Counselors or Tenants to market to those students or their families</li>
              <li>We may use aggregated, de-identified data derived from platform usage to improve Soar, provided that such data cannot reasonably be used to identify any individual student or organization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Third-Party Services</h2>
            <p>The following services currently process personal information as part of Soar&rsquo;s operation:</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-900">Service</th>
                    <th className="text-left py-2 pr-4 font-semibold text-gray-900">Purpose</th>
                    <th className="text-left py-2 font-semibold text-gray-900">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { name: 'Anthropic (Claude API)', purpose: 'AI processing for all research and planning features', url: 'anthropic.com/privacy', href: 'https://anthropic.com/privacy' },
                    { name: 'Stripe', purpose: 'Payment processing for paid subscriptions', url: 'stripe.com/privacy', href: 'https://stripe.com/privacy' },
                    { name: 'SendGrid', purpose: 'Transactional account emails', url: 'sendgrid.com/policies/privacy', href: 'https://sendgrid.com/policies/privacy' },
                    { name: 'Google Analytics', purpose: 'Platform usage analytics', url: 'policies.google.com/privacy', href: 'https://policies.google.com/privacy' },
                    { name: 'Render / Vercel', purpose: 'Platform hosting and infrastructure', url: 'render.com/privacy', href: 'https://render.com/privacy' },
                  ].map((row) => (
                    <tr key={row.name}>
                      <td className="py-2 pr-4 text-gray-700">{row.name}</td>
                      <td className="py-2 pr-4 text-gray-700">{row.purpose}</td>
                      <td className="py-2">
                        <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {row.url}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
            <p>
              Soar retains research conversation history according to your subscription plan. After the
              retention period, conversation and research history is deleted or de-identified. Account
              information and financial records are retained for longer periods as required by law (financial
              records for seven years).
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-6 font-semibold text-gray-900">Plan</th>
                    <th className="text-left py-2 font-semibold text-gray-900">History Retention</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Counselor Micro (Free)', '90 days'],
                    ['Counselor Paid', '365 days'],
                    ['Practice', '730 days'],
                    ['School', 'Duration of active agreement, plus 1 year'],
                    ['Student Starter (Free)', '90 days'],
                    ['Student Plus', '365 days'],
                    ['Student Pro', '730 days'],
                    ['Parent Starter (Free)', '90 days'],
                    ['Parent Plus', '365 days'],
                    ['Parent Pro', '730 days'],
                  ].map(([plan, retention]) => (
                    <tr key={plan}>
                      <td className="py-2 pr-6 text-gray-700">{plan}</td>
                      <td className="py-2 text-gray-700">{retention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children&rsquo;s Privacy</h2>
            <p>
              Soar requires users to be at least 13 years old. We do not knowingly collect personal information
              from children under 13. If you believe a child under 13 has created a Soar account, contact us at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>{' '}
              and we will delete the account promptly.
            </p>
            <p className="mt-3">
              Student accounts for users under 18 require parental or guardian consent. When a Counselor
              connects a minor student with Soar, the Counselor is responsible for confirming that parental
              consent has been obtained.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Your Privacy Rights</h2>
            <p>California residents have the following rights under the CCPA:</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li><strong>Right to know.</strong> You may request a summary of the categories and specific pieces of personal information we hold about you.</li>
              <li><strong>Right to delete.</strong> You may request deletion of your personal information, subject to legal retention exceptions.</li>
              <li><strong>Right to correct.</strong> You may request that we correct inaccurate personal information.</li>
              <li><strong>Right to opt out of sale.</strong> We do not sell personal information. There is nothing to opt out of.</li>
              <li><strong>Right to non-discrimination.</strong> We will not penalize you for exercising your privacy rights.</li>
            </ul>
            <p className="mt-3">
              <strong>How to submit a request.</strong> Email{' '}
              <a href="mailto:privacy@lifelaunchr.com" className="text-blue-600 hover:underline">
                privacy@lifelaunchr.com
              </a>
              . We will acknowledge within 10 business days and respond within 45 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Data Export and Account Deletion</h2>
            <p>
              <strong>Data export.</strong> You may request a full export of your account data at any time by
              emailing{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>
              . We will provide your data in a commonly used, machine-readable format within 30 days.
            </p>
            <p className="mt-3">
              <strong>Account deletion.</strong> To delete your account and data, email{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>
              . We will delete your data within 30 days, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Data Security</h2>
            <p>
              We implement commercially reasonable technical, administrative, and organizational safeguards
              designed to protect personal information against unauthorized access, disclosure, alteration,
              and destruction.
            </p>
            <p className="mt-3">
              Soar is a multi-tenant platform. Application-level controls prevent counselors from accessing
              other counselors&rsquo; data, and tenants from accessing other tenants&rsquo; data. Authorized
              LifeLaunchr personnel may access underlying platform data where reasonably necessary for
              operational support, security, or legal compliance.
            </p>
            <p className="mt-3">
              In the event of a data breach affecting your personal information, we will notify you as required
              by applicable law. If you believe your account has been compromised, contact us immediately at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Schools and FERPA</h2>
            <p>
              If you are a K–12 school, school district, or similar institution, student education records
              processed through Soar are governed by a separate Data Processing Agreement (DPA) executed
              between your institution and LifeLaunchr. That DPA designates LifeLaunchr as a &ldquo;school
              official&rdquo; with a &ldquo;legitimate educational interest&rdquo; as required under FERPA.
              Please contact us at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>{' '}
              to request an institutional agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. For material changes, we will notify current
              users by email and/or in-app notice at least 30 days before the change takes effect. Continued
              use of Soar after the effective date of an update constitutes acceptance of the revised Privacy
              Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact</h2>
            <p>Privacy questions and requests:</p>
            <div className="mt-3">
              <p>
                <a href="mailto:privacy@lifelaunchr.com" className="text-blue-600 hover:underline">
                  privacy@lifelaunchr.com
                </a>
              </p>
              <p className="mt-1">LifeLaunchr, Inc.</p>
              <p>1275 4th Street, Santa Rosa, California 95404</p>
              <p>
                <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                  help@lifelaunchr.com
                </a>
              </p>
              <p>855-236-6363</p>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

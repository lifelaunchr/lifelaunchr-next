import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Soar Platform Terms of Use — LifeLaunchr, Inc.',
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective Date: April 1, 2026 &nbsp;|&nbsp; Last Updated: April 1, 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction and Acceptance</h2>
            <p>
              These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use of Soar, LifeLaunchr&rsquo;s
              AI-powered college and career research platform (&ldquo;Soar&rdquo; or &ldquo;the Platform&rdquo;),
              operated by LifeLaunchr, Inc., a Delaware corporation based in Santa Rosa, California.
            </p>
            <p className="mt-3">
              By creating an account, clicking &ldquo;I Agree,&rdquo; or continuing to use Soar, you confirm that
              you have read, understood, and agree to these Terms. If you do not agree, please do not use Soar.
            </p>
            <p className="mt-3">
              <strong>LifeLaunchr coaching clients.</strong> If you are enrolled in a LifeLaunchr coaching program,
              you have already accepted these Terms by reference through the LifeLaunchr Terms of Service. You do
              not need to separately agree.
            </p>
            <p className="mt-3">
              <strong>Minor users.</strong> If you are under 18, your parent or legal guardian must review and
              consent to these Terms on your behalf. By creating or authorizing a student account, the parent or
              guardian confirms they have read and agreed to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. About Soar</h2>
            <p>
              Soar is an AI-powered platform designed to help students, counselors, and families research colleges,
              explore scholarships and enrichment programs, discover career pathways, and plan for life after high
              school. Soar provides information, analysis, and research tools to support that process — it is not
              a substitute for professional college counseling.
            </p>
            <p className="mt-3">
              Soar is built on Anthropic&rsquo;s Claude API. This means Soar&rsquo;s research capabilities are
              powered by artificial intelligence. Section 6 explains in detail what this means for how you use the
              platform and how your information is processed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Definitions</h2>
            <p>As used in these Terms:</p>
            <ul className="mt-3 space-y-2 list-none pl-0">
              <li><strong>Tenant —</strong> An organization — such as an independent educational consulting (IEC) practice or institution — that has created an organizational Soar account and may have multiple counselors operating under it.</li>
              <li><strong>Counselor —</strong> An individual who uses Soar to work with students, either as part of a Tenant or independently as a solo practitioner.</li>
              <li><strong>Student —</strong> An individual student who accesses Soar through their own student account.</li>
              <li><strong>Parent —</strong> A parent or legal guardian who accesses Soar through their own parent account, linked to a student&rsquo;s profile.</li>
              <li><strong>User —</strong> Any individual with a Soar account, including Counselors, Students, and Parents.</li>
              <li><strong>Account —</strong> The login credentials and profile associated with a User&rsquo;s access to Soar.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Eligibility and Account Creation</h2>
            <p>
              <strong>Age.</strong> You must be at least 13 years old to create a Soar account. Students between
              13 and 17 must have parental or guardian consent. We do not knowingly allow children under 13 to
              use Soar. If you are a Counselor connecting minor students with Soar, you are responsible for
              confirming that appropriate parental consent has been obtained.
            </p>
            <p className="mt-3">
              <strong>Accurate information.</strong> You agree to provide accurate, current, and complete
              information when creating your account and to keep it up to date. Providing false information —
              including false academic records or profile data — violates these Terms.
            </p>
            <p className="mt-3">
              <strong>Account security.</strong> You are responsible for the confidentiality of your login
              credentials and for all activity that occurs under your account. Notify us immediately at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>{' '}
              if you believe your account has been compromised.
            </p>
            <p className="mt-3">
              <strong>One account per person.</strong> You may not create multiple accounts to circumvent usage
              limits, plan restrictions, or account suspensions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Subscription Plans and Access</h2>
            <p>
              Soar offers subscription plans for Counselors, Students, and Parents. Each plan includes specific
              limits on the number of student connections, monthly message volume, AI model access, available
              research modules, and other features. Full details for each plan — including current pricing —
              are available on the Soar pricing page.
            </p>
            <p className="mt-3">
              By subscribing to a plan, you confirm that you have reviewed the plan details and understand what
              is and is not included. Your specific limits are displayed in your account settings.
            </p>
            <p className="mt-3">
              <strong>Individual adjustments.</strong> LifeLaunchr may, by written mutual agreement with a
              subscriber, adjust the limits or features of a plan on an individual basis.
            </p>
            <p className="mt-3">
              <strong>Free tier.</strong> Soar offers a free tier for Counselors, Students, and Parents with
              limited features and usage. Free tier access may be modified or discontinued with reasonable
              advance notice.
            </p>
            <p className="mt-3">
              <strong>Billing and renewal.</strong> Paid subscriptions are billed monthly or annually depending
              on your selection at signup. Prices are as shown on the pricing page at the time of subscription.
              LifeLaunchr will provide at least 30 days&rsquo; notice before changing prices for existing
              subscribers. Paid subscriptions renew automatically at the end of each billing period unless
              cancelled before renewal. All fees are non-refundable except where required by applicable law.
              You may cancel at any time through your account settings or by contacting{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>
              , and cancellation will take effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. AI Disclosure: How Soar Works</h2>
            <p>
              Soar is powered by Claude, a large language model developed by Anthropic, PBC. We are required by
              Anthropic&rsquo;s usage policies to make this disclosure clearly, and we want you to understand
              what it means for your use of the platform.
            </p>
            <p className="mt-3">
              <strong>Your inputs are processed by Anthropic.</strong> When you interact with Soar, the
              information you enter — including questions, college preferences, academic profile details, and
              research queries — is transmitted to and processed by Anthropic&rsquo;s servers to generate
              Soar&rsquo;s responses. Anthropic handles your data in accordance with their privacy policy,
              available at{' '}
              <a href="https://anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                anthropic.com/privacy
              </a>
              .
            </p>
            <p className="mt-3">
              <strong>Soar&rsquo;s responses are AI-generated.</strong> Responses are produced by an AI model.
              They are not reviewed by a human counselor before being delivered to you. AI-generated outputs may
              be incomplete, inaccurate, biased, out of date, or inappropriate for a user&rsquo;s specific
              circumstances. Users are responsible for independently reviewing and verifying information before
              relying on it.
            </p>
            <p className="mt-3">
              <strong>No misuse of the AI.</strong> You may not attempt to manipulate, override, or circumvent
              Soar&rsquo;s AI systems — including by using prompts designed to bypass safety measures, generate
              prohibited content, or produce outputs outside Soar&rsquo;s intended college and career research
              purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Acceptable Use</h2>
            <p>
              You agree to use Soar only for legitimate college and career research, planning, and related
              educational purposes. You agree not to:
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-1">
              <li>Submit false, misleading, or fraudulent information about yourself or any student</li>
              <li>Attempt to generate content that violates Anthropic&rsquo;s usage policies</li>
              <li>Use Soar to produce, store, or transmit harmful, harassing, illegal, or abusive content</li>
              <li>Attempt to reverse engineer, scrape, or extract Soar&rsquo;s underlying models, databases, or infrastructure</li>
              <li>Share your account credentials or permit others to access Soar through your account</li>
              <li>Use Soar in any way that violates applicable law or the rights of any person</li>
            </ul>
            <p className="mt-3">
              <strong>Academic integrity.</strong> Soar is a research, planning, and brainstorming tool. It is
              not intended to generate college application essays, personal statements, supplemental essays, or
              other materials for submission by a student as the student&rsquo;s own original work. Users may
              not use Soar to create or submit AI-generated application materials in violation of a
              school&rsquo;s, college&rsquo;s, university&rsquo;s, scholarship program&rsquo;s, or other
              institution&rsquo;s academic integrity or authenticity requirements. Students remain solely
              responsible for ensuring that all submitted work is their own and complies with applicable rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Tenant and Counselor Responsibilities</h2>
            <p>
              <strong>Tenants — responsibility for your organization.</strong> You are responsible for ensuring
              all counselors operating under your account comply with these Terms; maintaining accurate records
              of authorized counselors; and promptly removing access for counselors who leave your organization
              or violate these Terms.
            </p>
            <p className="mt-3">
              <strong>Counselors and Tenants — responsibility for students you work with.</strong> When you
              connect students with Soar or enter student information into the Platform, you represent and
              warrant that you have all permissions and authority necessary to do so, including parent or
              guardian consent where required.
            </p>
            <p className="mt-3">
              <strong>Professional judgment.</strong> Counselors represent that they will apply independent
              professional judgment when presenting or acting on Soar&rsquo;s AI-generated outputs, and will
              not represent AI research as their own independent professional analysis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Student and Parent Accounts</h2>
            <p>
              Soar has separate account types for Counselors, Students, and Parents. Each person accesses Soar
              through their own individual account and accepts these Terms directly at the time of registration.
              Counselor, Student, and Parent accounts are connected within the platform to enable collaboration —
              but each user is independently responsible for their own account and their own compliance with
              these Terms.
            </p>
            <p className="mt-3">
              <strong>Parents.</strong> Parent accounts are linked to a student profile. Parents may view their
              student&rsquo;s Soar activity and interact with the platform on their student&rsquo;s behalf.
              Parents are responsible for supervising their student&rsquo;s use of Soar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Intellectual Property</h2>
            <p>
              <strong>Soar&rsquo;s platform.</strong> Soar — including its design, features, research modules,
              college and scholarship data, and underlying technology — is owned by LifeLaunchr, Inc. These
              Terms do not grant you any ownership interest in Soar or its content.
            </p>
            <p className="mt-3">
              <strong>Trademarks.</strong> &ldquo;LifeLaunchr&rdquo; and &ldquo;Soar&rdquo; are trademarks of
              LifeLaunchr, Inc. and may not be used without prior written permission.
            </p>
            <p className="mt-3">
              <strong>Your content.</strong> Information you enter into Soar — student profiles, college lists,
              notes, research queries — belongs to you. You grant LifeLaunchr a non-exclusive, worldwide,
              royalty-free license to use, store, process, and display that content as reasonably necessary to
              operate and deliver the service to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. User Data and Privacy</h2>
            <p>
              Your use of Soar is also governed by the{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Soar Privacy Policy
              </Link>
              . Key points: the data you enter is yours — we don&rsquo;t sell it; your inputs are processed
              by Anthropic as described in Section 6; and you may request export or deletion of your data as
              described in Section 12 and the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Data Portability and Account Closure</h2>
            <p>
              <strong>Data export.</strong> You may request a full export of your account data at any time by
              contacting{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>
              . We will provide your data in a commonly used, machine-readable format within 30 days.
            </p>
            <p className="mt-3">
              <strong>Cancellation.</strong> You may cancel your subscription at any time. Cancellation takes
              effect at the end of your current billing period. Your data is retained for the period specified
              in your plan&rsquo;s history retention setting, then permanently deleted.
            </p>
            <p className="mt-3">
              <strong>Account deletion.</strong> You may request deletion of your account and data at any time
              by contacting us at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>
              . We will delete your data within 30 days, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Disclaimer of AI-Generated Content</h2>
            <p className="uppercase text-sm leading-relaxed">
              Soar is an AI-powered research and planning tool. Its outputs are generated by artificial
              intelligence and are provided for informational and educational purposes only. Soar does not
              provide professional college counseling, financial aid advice, legal advice, or career counseling.
              AI-generated content may contain errors, inaccuracies, omissions, or outdated information.
              LifeLaunchr makes no representation that Soar&rsquo;s outputs are accurate, complete, current,
              or suitable for any particular purpose. Users should independently verify any information that is
              material to their decisions, and should consult with a qualified professional counselor before
              making significant decisions based on Soar&rsquo;s outputs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Limitation of Liability</h2>
            <p className="uppercase text-sm leading-relaxed">
              To the fullest extent permitted by applicable law, LifeLaunchr&rsquo;s total liability to you
              for any claim arising from or related to Soar shall not exceed the greater of (a) the total
              amount you paid to LifeLaunchr for your Soar subscription in the three months immediately
              preceding the claim, or (b) fifty dollars ($50).
            </p>
            <p className="mt-3 uppercase text-sm leading-relaxed">
              In no event shall LifeLaunchr be liable for any indirect, incidental, consequential, special,
              exemplary, or punitive damages — including loss of opportunity, lost profits, emotional distress,
              or any harm arising from reliance on AI-generated content — even if LifeLaunchr has been advised
              of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Term and Termination</h2>
            <p>
              These Terms remain in effect for as long as you have a Soar account. We may suspend, restrict,
              or terminate your access to Soar if you violate these Terms, misuse the Platform, fail to pay
              applicable fees, or if required by law. If LifeLaunchr discontinues the Platform, we will
              endeavor to provide at least 30 days&rsquo; advance notice and will issue a pro-rata refund of
              prepaid but unused subscription fees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">16. Dispute Resolution and Governing Law</h2>
            <p>
              <strong>Talk to us first.</strong> If you have a concern or dispute, please contact us at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>{' '}
              before taking any formal action.
            </p>
            <p className="mt-3">
              <strong>Binding arbitration.</strong> Except for matters that may be brought in small claims
              court, any unresolved dispute shall be resolved by final and binding arbitration administered by
              JAMS under its Streamlined Arbitration Rules, on an individual basis only.
            </p>
            <p className="mt-3">
              <strong>Class action waiver.</strong> You and LifeLaunchr each agree that any dispute will be
              brought only in an individual capacity, and not as a plaintiff or class member in any purported
              class or representative proceeding, to the maximum extent permitted by law.
            </p>
            <p className="mt-3">
              <strong>Governing law.</strong> These Terms are governed by the laws of the State of California,
              without regard to conflict-of-laws rules.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">17. General Provisions</h2>
            <p>
              These Terms, together with the Soar Privacy Policy, constitute the entire agreement between you
              and LifeLaunchr regarding Soar. If any provision is found invalid, it will be modified to the
              minimum extent necessary to make it enforceable, or severed. We may update these Terms from time
              to time. For material changes, we will notify users by email and/or in-app notice at least 30
              days before the change takes effect.
            </p>
            <p className="mt-3">
              <strong>Schools and institutions.</strong> K–12 schools, school districts, or similar institutions
              must execute a signed Data Processing Agreement (DPA) with LifeLaunchr before activating any
              student accounts. Contact us at{' '}
              <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                help@lifelaunchr.com
              </a>{' '}
              to request an institutional agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">18. Contact</h2>
            <p>Questions about these Terms or your Soar account:</p>
            <div className="mt-3 not-italic">
              <p>
                <a href="mailto:help@lifelaunchr.com" className="text-blue-600 hover:underline">
                  help@lifelaunchr.com
                </a>
              </p>
              <p className="mt-1">LifeLaunchr, Inc.</p>
              <p>Santa Rosa, California</p>
              <p>855-236-6363</p>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

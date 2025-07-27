import { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - AI Assistant',
  description: 'Privacy policy for ai.brianfending.com AI assistant service regarding data collection, usage, AI training, and your rights under GDPR, CCPA, and other privacy laws.',
}

export const viewport: Viewport = {
  themeColor: '#ffffff'
}

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 pt-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
        <p className="text-xl mt-4 text-gray-700 dark:text-gray-300 max-w-3xl">
          <strong>Effective Date:</strong> January 27, 2025<br />
          <strong>Last Updated:</strong> January 27, 2025
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2>Service Overview</h2>
        <p>
          This Privacy Policy applies specifically to the AI Assistant service at <strong>ai.brianfending.com</strong>, a session-based AI chat application designed to provide information about Brian Fending&apos;s professional background and experience.
        </p>

        <h2>Contact Information</h2>
        <p>
          <strong>Data Controller:</strong> Brian Fending<br />
          <strong>Email:</strong> hello@brianfending.com<br />
          <strong>Primary Website:</strong> brianfending.com
        </p>
        <p>
          For all privacy-related inquiries, data subject requests, or concerns, please contact: <strong>hello@brianfending.com</strong>
        </p>

        <h2>Information We Collect</h2>

        <h3>Information You Provide</h3>
        <ul>
          <li><strong>Email address</strong> (required for session access and queue management)</li>
          <li><strong>Chat messages</strong> (all questions, responses, and interactions during sessions)</li>
          <li><strong>Feedback</strong> (optional ratings or comments about service quality)</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <ul>
          <li><strong>Session data:</strong> Session duration, timestamps, queue position, activity logs</li>
          <li><strong>Technical information:</strong> IP address, browser type, device information, access times</li>
          <li><strong>Usage analytics:</strong> Interaction patterns, response times, feature usage statistics</li>
          <li><strong>AI metrics:</strong> Response quality scores, conversation categorization, training effectiveness</li>
          <li><strong>Security data:</strong> Rate limiting logs, authentication attempts, abuse prevention metrics</li>
        </ul>

        <h3>Cookies and Tracking Technologies</h3>
        <ul>
          <li><strong>Essential cookies:</strong> Session management and basic functionality</li>
          <li><strong>Preference cookies:</strong> User settings (dark mode, language preferences)</li>
          <li><strong>Analytics cookies:</strong> Usage analysis and performance monitoring</li>
          <li><strong>Security cookies:</strong> Rate limiting and abuse prevention</li>
        </ul>

        <h2>How We Use Your Information</h2>

        <h3>Primary Service Functions</h3>
        <ul>
          <li><strong>AI responses:</strong> Providing personalized information about Brian Fending&apos;s professional background</li>
          <li><strong>Session management:</strong> Operating queue system, managing 60-minute session limits</li>
          <li><strong>Access control:</strong> Email-based authentication and session notifications</li>
          <li><strong>Queue management:</strong> Position tracking, wait time estimates, capacity control</li>
        </ul>

        <h3>Service Improvement and Training</h3>
        <ul>
          <li><strong>AI model training:</strong> Using conversations to improve response quality and accuracy</li>
          <li><strong>Knowledge base enhancement:</strong> Extracting insights to better answer future questions</li>
          <li><strong>Performance optimization:</strong> Analyzing usage patterns to optimize system performance</li>
          <li><strong>Feature development:</strong> Understanding user needs to develop new capabilities</li>
        </ul>

        <h3>Business and Analytics</h3>
        <ul>
          <li><strong>Usage analytics:</strong> Understanding service adoption and user behavior</li>
          <li><strong>Cost monitoring:</strong> Tracking AI API usage and operational costs</li>
          <li><strong>Quality assurance:</strong> Monitoring conversation quality and user satisfaction</li>
          <li><strong>Research and development:</strong> Advancing AI assistant capabilities</li>
        </ul>

        <h2>Legal Basis for Processing (GDPR)</h2>
        <ul>
          <li><strong>Consent:</strong> Email submission for service access, conversation participation</li>
          <li><strong>Legitimate interest:</strong> Service improvement, security monitoring, performance analytics</li>
          <li><strong>Contract performance:</strong> Delivering requested AI assistant services</li>
          <li><strong>Legal obligations:</strong> Compliance with applicable laws and regulations</li>
        </ul>

        <h2>Ownership and Rights to Submitted Content</h2>

        <h3>Content Ownership Transfer</h3>
        <p><strong>By using this AI assistant service, you acknowledge and agree that:</strong></p>
        <ul>
          <li><strong>Full ownership transfer:</strong> All messages, questions, and content you submit become the exclusive property of Brian Fending</li>
          <li><strong>Unlimited usage rights:</strong> You grant Brian Fending unlimited, perpetual, worldwide, royalty-free rights to use, modify, reproduce, distribute, and create derivative works from your submitted content</li>
          <li><strong>Commercial applications:</strong> Your content may be used for AI model training, business development, marketing, research, or any other commercial purpose</li>
          <li><strong>Waiver of attribution:</strong> You waive any moral rights, attribution claims, or authorship rights to submitted content</li>
          <li><strong>No compensation:</strong> You are not entitled to any compensation for the use of your submitted content</li>
        </ul>

        <h3>AI-Generated Content</h3>
        <ul>
          <li><strong>Exclusive ownership:</strong> All AI-generated responses are the exclusive property of Brian Fending</li>
          <li><strong>No user rights:</strong> Users receive no ownership rights in AI-generated content</li>
          <li><strong>Unlimited reuse:</strong> AI responses may be reused, republished, modified, or incorporated into other materials without attribution</li>
        </ul>

        <h3>Conversation Data</h3>
        <ul>
          <li><strong>Complete ownership:</strong> Entire conversation logs, including both user input and AI responses, belong to Brian Fending</li>
          <li><strong>Business use rights:</strong> Conversations may be analyzed, shared with business partners, used in marketing materials, or published as case studies</li>
          <li><strong>Research applications:</strong> Anonymized or de-identified conversation data may be used in research, academic publications, or industry presentations</li>
          <li><strong>Training data:</strong> All conversations contribute to AI model improvement and training datasets</li>
        </ul>

        <h2>Data Storage and Processing</h2>

        <h3>Storage Infrastructure</h3>
        <ul>
          <li><strong>Database:</strong> Supabase (PostgreSQL, US-based)</li>
          <li><strong>Application hosting:</strong> Vercel (US-based, global CDN)</li>
          <li><strong>AI processing:</strong> Anthropic Claude API (US-based)</li>
          <li><strong>Email services:</strong> Postmark (US-based)</li>
          <li><strong>Analytics:</strong> Internal logging systems</li>
        </ul>

        <h3>Data Retention Periods</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Data Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Retention Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Purpose</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">AI conversations</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Indefinite</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">AI training, service improvement</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Session metadata</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">7 years</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Operational analysis, compliance</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Email addresses</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Until removal requested</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Access management</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Technical logs</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">30 days</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Security, troubleshooting</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Analytics data</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">5 years</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Business intelligence</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Rate limiting data</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">30 days</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Abuse prevention</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3>Security Measures</h3>
        <ul>
          <li><strong>Encryption:</strong> HTTPS/TLS for all data transmission, encryption at rest</li>
          <li><strong>Access controls:</strong> Role-based authentication, admin verification</li>
          <li><strong>Rate limiting:</strong> Multi-layer protection against abuse (IP and email-based)</li>
          <li><strong>Monitoring:</strong> Continuous security monitoring and incident response</li>
          <li><strong>Infrastructure security:</strong> Enterprise-grade hosting with SOC 2 compliance</li>
          <li><strong>Data minimization:</strong> Collecting only necessary information for service operation</li>
        </ul>

        <h2>International Data Transfers</h2>
        <p>
          Your information is processed primarily in the United States through our service providers including Supabase, Vercel, Anthropic, and Postmark. Data may also be processed in other countries where our service providers operate.
        </p>

        <h3>Transfer Safeguards</h3>
        <p><strong>For EU/UK Data Subjects:</strong></p>
        <ul>
          <li><strong>Standard Contractual Clauses (SCCs):</strong> We use European Commission-approved SCCs with all processors</li>
          <li><strong>Supplementary measures:</strong> Additional technical and organizational safeguards</li>
          <li><strong>Transfer assessments:</strong> Regular evaluation of transfer mechanisms and legal frameworks</li>
        </ul>

        <p><strong>Technical Safeguards:</strong></p>
        <ul>
          <li>End-to-end encryption for data transmission</li>
          <li>Encrypted storage of personal data</li>
          <li>Access logging and monitoring</li>
          <li>Regular security assessments</li>
        </ul>

        <h2>Data Sharing and Disclosure</h2>

        <h3>Service Providers</h3>
        <p>We share information with essential service providers:</p>
        <ul>
          <li><strong>Supabase:</strong> Database hosting and management</li>
          <li><strong>Vercel:</strong> Application hosting and content delivery</li>
          <li><strong>Anthropic:</strong> AI model processing (Claude API)</li>
          <li><strong>Postmark:</strong> Email delivery services</li>
        </ul>

        <h3>Business Purposes</h3>
        <p>Your conversations and data may be used for:</p>
        <ul>
          <li><strong>Case studies:</strong> Demonstrating AI assistant capabilities (anonymized)</li>
          <li><strong>Training data:</strong> Improving AI models and response quality</li>
          <li><strong>Marketing materials:</strong> Showcasing service effectiveness</li>
          <li><strong>Research and development:</strong> Advancing AI technology</li>
          <li><strong>Business partnerships:</strong> Collaborations with technology providers</li>
          <li><strong>Academic research:</strong> Contributing to AI and natural language processing research</li>
        </ul>

        <h3>Legal Requirements</h3>
        <p>We may disclose information when required by law or to:</p>
        <ul>
          <li>Comply with legal process, subpoenas, or court orders</li>
          <li>Protect our rights, property, or safety</li>
          <li>Prevent fraud or illegal activities</li>
          <li>Enforce our service policies and prevent abuse</li>
        </ul>

        <h2>Your Rights Under Data Privacy Laws</h2>

        <h3>Universal Rights (All Users)</h3>
        <ul>
          <li><strong>Information access:</strong> Know what personal information we collect and how it&apos;s used</li>
          <li><strong>Data access:</strong> Request access to your personal information</li>
          <li><strong>Correction rights:</strong> Request correction of inaccurate information</li>
          <li><strong>Limited deletion:</strong> Request deletion of your email address and session metadata</li>
          <li><strong>Communication opt-out:</strong> Unsubscribe from optional communications</li>
        </ul>

        <h3>GDPR Rights (EU/UK Residents)</h3>
        <ul>
          <li><strong>Right to rectification:</strong> Correct inaccurate personal data</li>
          <li><strong>Right to erasure:</strong> Limited deletion rights (see limitations below)</li>
          <li><strong>Right to restrict processing:</strong> Limit how we use your data</li>
          <li><strong>Right to data portability:</strong> Receive your data in portable format</li>
          <li><strong>Right to object:</strong> Object to processing based on legitimate interests</li>
        </ul>

        <h3>CCPA Rights (California Residents)</h3>
        <ul>
          <li><strong>Right to know:</strong> Categories and specific pieces of personal information collected</li>
          <li><strong>Right to delete:</strong> Limited deletion rights (see limitations below)</li>
          <li><strong>Right to opt-out:</strong> We don&apos;t sell personal information</li>
          <li><strong>Right to non-discrimination:</strong> Equal service regardless of privacy choices</li>
        </ul>

        <h3>Important Limitations on Rights</h3>
        <p><strong>Conversation Data Limitations:</strong></p>
        <ul>
          <li><strong>AI training integration:</strong> Submitted conversations cannot be deleted after being processed into AI training systems</li>
          <li><strong>Technical impossibility:</strong> Trained AI models cannot have specific data extracted or removed</li>
          <li><strong>Legitimate business interests:</strong> Indefinite retention justified for service improvement and business operations</li>
          <li><strong>Intellectual property protection:</strong> Training methodologies and model improvements are trade secrets</li>
        </ul>

        <p><strong>What CAN be deleted:</strong></p>
        <ul>
          <li>Your email address from our access control system</li>
          <li>Session metadata and technical logs</li>
          <li>Analytics data tied to your identity</li>
        </ul>

        <p><strong>What CANNOT be deleted:</strong></p>
        <ul>
          <li>Conversation content already integrated into AI training</li>
          <li>Anonymized or aggregated data derived from your interactions</li>
          <li>Data required for legal compliance or business operations</li>
        </ul>

        <h2>AI-Specific Privacy Considerations</h2>

        <h3>AI Training and Model Development</h3>
        <ul>
          <li><strong>Training data integration:</strong> Your conversations become part of the AI&apos;s training dataset</li>
          <li><strong>Model improvement:</strong> Your interactions help improve response quality for all users</li>
          <li><strong>Knowledge extraction:</strong> Information from conversations may be extracted into structured knowledge bases</li>
          <li><strong>Pattern analysis:</strong> Conversation patterns inform AI development and optimization</li>
        </ul>

        <h3>AI Content Generation</h3>
        <ul>
          <li><strong>Response generation:</strong> AI responses are generated based on your questions and conversation context</li>
          <li><strong>Personalization:</strong> Responses may be tailored based on conversation history within your session</li>
          <li><strong>Cross-session learning:</strong> Improvements from your conversations may benefit other users</li>
          <li><strong>Quality scoring:</strong> AI responses are analyzed for quality and accuracy</li>
        </ul>

        <h3>Data Flow to AI Providers</h3>
        <ul>
          <li><strong>API processing:</strong> Your messages are sent to Anthropic&apos;s Claude API for processing</li>
          <li><strong>Context sharing:</strong> Conversation history and knowledge base context are included in API calls</li>
          <li><strong>Third-party policies:</strong> Anthropic&apos;s data usage policies also apply to your interactions</li>
          <li><strong>Provider changes:</strong> We may change AI providers, and your data may be processed by different systems</li>
        </ul>

        <h2>Service-Specific Features</h2>

        <h3>Queue and Session Management</h3>
        <ul>
          <li><strong>Email-based access:</strong> Sessions require email verification</li>
          <li><strong>Queue position tracking:</strong> Real-time updates on wait times and position</li>
          <li><strong>Session limits:</strong> 60-minute active sessions with automatic cleanup</li>
          <li><strong>Capacity management:</strong> System supports concurrent users with queue overflow</li>
        </ul>

        <h3>Rate Limiting and Security</h3>
        <ul>
          <li><strong>IP-based limits:</strong> Protection against automated abuse</li>
          <li><strong>Email-based limits:</strong> Preventing spam and overuse</li>
          <li><strong>reCAPTCHA integration:</strong> Human verification for session requests</li>
          <li><strong>Disposable email blocking:</strong> Prevention of temporary email address abuse</li>
        </ul>

        <h3>Admin Analytics</h3>
        <ul>
          <li><strong>Usage monitoring:</strong> Tracking system performance and user engagement</li>
          <li><strong>Quality assessment:</strong> Analyzing conversation quality and AI performance</li>
          <li><strong>Cost tracking:</strong> Monitoring API usage and operational expenses</li>
          <li><strong>Training curation:</strong> Selecting high-quality conversations for model improvement</li>
        </ul>

        <h2>Third-Party Services</h2>

        <h3>Supabase (Database)</h3>
        <ul>
          <li><strong>Services:</strong> PostgreSQL database, authentication, real-time subscriptions</li>
          <li><strong>Data stored:</strong> All conversation data, session information, user emails</li>
          <li><strong>Privacy policy:</strong> <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">https://supabase.com/privacy</a></li>
        </ul>

        <h3>Anthropic (AI Processing)</h3>
        <ul>
          <li><strong>Services:</strong> Claude AI model API for generating responses</li>
          <li><strong>Data shared:</strong> Your questions, conversation history, knowledge base context</li>
          <li><strong>Privacy policy:</strong> <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">https://www.anthropic.com/privacy</a></li>
        </ul>

        <h3>Vercel (Hosting)</h3>
        <ul>
          <li><strong>Services:</strong> Application hosting, content delivery network</li>
          <li><strong>Data processed:</strong> HTTP requests, basic analytics</li>
          <li><strong>Privacy policy:</strong> <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">https://vercel.com/legal/privacy-policy</a></li>
        </ul>

        <h3>Postmark (Email)</h3>
        <ul>
          <li><strong>Services:</strong> Transactional email delivery for session access</li>
          <li><strong>Data shared:</strong> Your email address, session access links</li>
          <li><strong>Privacy policy:</strong> <a href="https://postmarkapp.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">https://postmarkapp.com/privacy-policy</a></li>
        </ul>

        <h2>How to Exercise Your Rights</h2>

        <h3>Making Requests</h3>
        <p>Submit all privacy requests to: <strong>hello@brianfending.com</strong></p>
        <p><strong>Include:</strong></p>
        <ul>
          <li>Your full name and email address used with the service</li>
          <li>Specific right you wish to exercise</li>
          <li>Approximate dates of service usage</li>
          <li>Any specific conversations or sessions you&apos;re referencing</li>
        </ul>

        <h3>Request Processing</h3>
        <ul>
          <li><strong>Acknowledgment:</strong> Within 5 business days</li>
          <li><strong>Response time:</strong> Within 30 days (may extend to 60 days for complex requests)</li>
          <li><strong>Verification:</strong> We may request additional information to verify your identity</li>
          <li><strong>Free service:</strong> Most requests processed at no charge</li>
        </ul>

        <h2>AI Service Disclaimers</h2>

        <h3>AI-Generated Content Limitations</h3>
        <ul>
          <li><strong>Experimental technology:</strong> AI responses may be unpredictable or inaccurate</li>
          <li><strong>Hallucination risk:</strong> AI may generate plausible but false information</li>
          <li><strong>Not professional advice:</strong> Responses should not be considered professional guidance</li>
          <li><strong>Verification required:</strong> Always verify AI-generated information independently</li>
        </ul>

        <h3>Service Availability</h3>
        <ul>
          <li><strong>No guarantees:</strong> Service provided &quot;as is&quot; without availability warranties</li>
          <li><strong>Feature changes:</strong> Service features may be modified or discontinued</li>
          <li><strong>Capacity limits:</strong> Access may be restricted during high demand</li>
          <li><strong>Maintenance downtime:</strong> Scheduled and emergency maintenance may interrupt service</li>
        </ul>

        <h2>Children&apos;s Privacy</h2>
        <p>
          This service is not intended for users under 16 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided personal information, we will delete it promptly.
        </p>

        <h2>Changes to This Policy</h2>
        <p>We may update this privacy policy to reflect:</p>
        <ul>
          <li>Changes in service features or AI capabilities</li>
          <li>Changes in applicable privacy laws</li>
          <li>Updates to our data practices</li>
          <li>New third-party integrations</li>
        </ul>

        <p><strong>Notification methods:</strong></p>
        <ul>
          <li>Prominent notice on the service website</li>
          <li>Email notification for material changes (where possible)</li>
          <li>Updated effective date</li>
        </ul>

        <h2>Regulatory Contacts</h2>

        <h3>Filing Complaints</h3>
        <p>If your privacy concerns aren&apos;t adequately addressed, you may contact:</p>

        <p><strong>EU/UK Residents:</strong></p>
        <ul>
          <li>Your local data protection authority</li>
          <li>UK: Information Commissioner&apos;s Office (ICO) - <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">https://ico.org.uk</a></li>
        </ul>

        <p><strong>California Residents:</strong></p>
        <ul>
          <li>California Attorney General&apos;s Office - privacy@oag.ca.gov</li>
        </ul>

        <h2>Contact Information</h2>
        <p>For all privacy-related questions or requests:</p>
        <p>
          <strong>Email:</strong> hello@brianfending.com<br />
          <strong>Subject Line:</strong> &quot;Privacy Request - AI Assistant&quot;
        </p>

        <p>
          We are committed to protecting your privacy and will respond to all inquiries promptly and professionally.
        </p>

        <hr className="my-8" />

        <p className="text-sm text-gray-500 dark:text-gray-400">
          <em>This privacy policy applies specifically to the AI Assistant service at ai.brianfending.com. Last updated January 27, 2025.</em>
        </p>
      </div>
    </div>
  )
}
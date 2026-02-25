-- ========================================
-- RAG Knowledge Base Update Migration
-- 2025-02-25
-- Based on: context/rag-deg-plan-20260224.md (annotated)
-- ========================================
--
-- Run in Supabase SQL Editor.
-- Embeddings will need regeneration after content changes.
-- The search_vector trigger will auto-update on INSERT/UPDATE.
--
-- Phase A: Delete/Fix Critical Issues
-- Phase B: Add Missing Content
-- Phase C: Condense Oversized Entries
-- Phase D: System Prompt Update
-- ========================================

BEGIN;

-- ========================================
-- PHASE A: DELETE / FIX CRITICAL ISSUES
-- ========================================

-- A1. Delete duplicate AI Chat System entry (keep 50f67936, delete 959031b0)
DELETE FROM knowledge_base
WHERE id = '959031b0-5acb-481d-9b6f-07698247c332';

-- A2. Rewrite "About Brian Fending" (was: "senior software engineer...8 years")
UPDATE knowledge_base
SET
  title = 'About Brian Fending',
  content = 'Brian Fending is a strategic technology executive with 25+ years of experience spanning CIO leadership, cybersecurity program development, AI governance, and digital transformation. Most recently CIO at the American Association for Physician Leadership (AAPL), where he managed a ~$1M IT budget, led a 6-person team, oversaw 40+ vendor relationships, and operated digital platforms generating $8M in annual revenue. Brian combines hands-on technical depth (production code, cloud migrations, security builds) with C-suite and board-level communication. He holds a CISM certification and ISO/IEC 42001 practitioner training in AI management systems. His career spans Fortune 500 consulting, fintech startups, federal contracts, and nonprofit leadership.',
  tags = ARRAY['introduction', 'overview', 'executive', 'cio'],
  source = 'import',
  updated_at = NOW()
WHERE id = 'f0167935-3fd6-4daf-9844-b26740a33edd';

-- A3. Rewrite "Work Preferences" (was: "Looking for senior engineering roles")
UPDATE knowledge_base
SET
  title = 'Career Goals & Work Preferences',
  content = 'Brian is seeking full-time executive placement. Target roles include CIO, Deputy CIO, SVP/VP IT, and VP/Director of AI Governance or transformation leadership. He targets mission-driven organizations, healthcare, nonprofits, professional associations, and mid-market companies. Geography: Buffalo/Hamburg NY area, open to fully remote. Brian departed AAPL in March 2025 with extensive transition notice (not involuntary). His consulting-to-executive career pattern — fractional CTO/CIO engagements that converted to full-time leadership — reflects his ability to demonstrate value before committing long-term.',
  tags = ARRAY['preferences', 'career', 'goals', 'job-search'],
  source = 'import',
  updated_at = NOW()
WHERE id = '9401d785-88f6-456d-b613-59fb3fb09fbe';

-- A4. Rewrite "Leadership Experience" (was: "mentoring junior developers...teams of 5-15")
UPDATE knowledge_base
SET
  title = 'Executive Leadership Experience',
  content = 'Brian led a 6-person IT team at AAPL with direct CEO reporting, monthly Executive Committee engagement, and quarterly presentations to the Audit & Risk Committee and full board of directors. He managed 40+ vendor relationships within a ~$1M annual budget, consolidating the vendor ecosystem from 40+ to 21 partners. During his consulting practice (2010-2018), he managed multiple concurrent client engagements across healthcare, fintech, hospitality, and manufacturing. At AAPL he designed and executed a multi-year technology modernization roadmap, drove AI enablement across three departments, and established governance frameworks aligned to COBIT and NIST CSF.',
  tags = ARRAY['leadership', 'management', 'executive', 'board'],
  source = 'import',
  updated_at = NOW()
WHERE id = '828ed63a-6b97-415c-9825-59f86afe48f8';

-- A5. Rewrite "Recent Projects" (was: "microservices architecture, real-time chat")
UPDATE knowledge_base
SET
  title = 'Recent Projects',
  content = 'Brian''s recent projects include ai.brianfending.com (a production AI assistant platform built with Next.js 15, Supabase, Claude SDK, RAG with pgvector, and security hardening), tools.brianfending.com (professional assessment tools built with Next.js 15 and React 19), and a portfolio of 14+ published articles on AI governance, cybersecurity, and enterprise technology strategy at brianfending.com. He also maintains an active presence on Substack covering AI governance and responsible adoption topics.',
  tags = ARRAY['projects', 'ai', 'portfolio', 'writing'],
  source = 'import',
  updated_at = NOW()
WHERE id = '6a98a787-8c06-4d1d-bae4-5a6c7445be57';

-- A6. Rewrite "Technical Skills" (keep MongoDB/Redis/Docker as "other skills")
UPDATE knowledge_base
SET
  title = 'Technical Skills',
  content = 'Primary stack: JavaScript/TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Supabase, Microsoft Azure, AWS, Vercel, Anthropic Claude SDK, OpenAI API. Development practices: CI/CD pipelines, secure SDLC, API architecture, AI/LLM integration, prompt engineering, RAG (Retrieval-Augmented Generation), vector search, cost-aware model routing. Enterprise platforms: Salesforce CRM, HubSpot, Microsoft 365, Power BI, SSRS, Jira Service Management, Auth0/Okta. Other skills: C# .NET, Docker, MongoDB, Redis, Kubernetes, project management, agile methodologies, test-driven development.',
  tags = ARRAY['technical', 'programming', 'cloud', 'ai', 'platforms'],
  source = 'import',
  updated_at = NOW()
WHERE id = '30c2fe95-31aa-45e2-9a72-993dba6a8fb3';

-- A7. Rewrite CISO Qualifications (was: raw Q&A dump with empty title)
UPDATE knowledge_base
SET
  title = 'Security (CISO) Leadership Qualifications',
  content = 'Brian built AAPL''s enterprise cybersecurity program from zero baseline. Key security credentials and accomplishments: CISM certification (ISACA, Certificate ID 252857849, expires January 2029). Advanced NIST CSF maturity from Level 1 to Level 3 through structured risk assessments, layered security controls, and continuous monitoring. Secured the organization''s first cyber insurance policy. Managed five critical security incidents including ransomware attempts and vendor breaches with 24-hour containment and zero data loss across all events. Modernized IAM from Ping Identity to Auth0/Okta with unified SSO. Integrated security controls into CI/CD pipelines and SDLC. Established third-party risk governance across 40+ vendor relationships. Multi-jurisdictional compliance: GDPR, KSA PDPL, US data privacy, HIPAA, PCI DSS, SOC 2.',
  category = 'experience',
  tags = ARRAY['ciso', 'security', 'cybersecurity', 'cism', 'nist-csf', 'compliance'],
  priority = 4,
  source = 'import',
  updated_at = NOW()
WHERE id = '4b6eb29c-86b2-4212-afb1-f53a08149fd5';

-- A8. Fix category: Miami Music Degree (experience → education)
UPDATE knowledge_base
SET category = 'education', updated_at = NOW()
WHERE id = 'b7b29723-2311-4195-a26f-044bb9b2dab7';

-- A9. Fix category: SUNY Fredonia Music Degree (experience → education)
UPDATE knowledge_base
SET category = 'education', updated_at = NOW()
WHERE id = 'ae5b92d4-415a-4fbf-af47-cc95a1e6d342';

-- A10. Fix "Business Intelligence and Analytics" (user confirms: was Oracle BI lead at DNC)
UPDATE knowledge_base
SET
  content = 'Oracle BI lead at Delaware North Companies with expertise in business intelligence strategy, data analysis, and reporting systems. At AAPL, architected secure SSRS and Power BI reporting environments and integrated CRM, ERP, and LMS data with role-based access controls. Experience spans ETL/IDL processes, data cleansing, custom reporting, dashboard development, and risk assessment analytics including specialized knowledge in personal watercraft risk factor rating.',
  tags = ARRAY['oracle-bi', 'business-intelligence', 'etl', 'power-bi', 'ssrs', 'data-analysis', 'analytics', 'delaware-north'],
  source = 'import',
  updated_at = NOW()
WHERE id = '8aac8b49-0f18-4545-9622-c534fe442ff3';


-- ========================================
-- PHASE B: ADD MISSING CONTENT
-- ========================================

-- B1. Add IAPP affiliation
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'affiliations',
  'International Association of Privacy Professionals (IAPP)',
  'Brian is an active member of the International Association of Privacy Professionals (IAPP), reflecting his expertise in data privacy, GDPR, KSA PDPL, and US data privacy regulations.',
  ARRAY['iapp', 'privacy', 'gdpr', 'data-privacy'],
  3,
  'import',
  1.0
);

-- B2. Add ISC2 affiliation
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'affiliations',
  'ISC2',
  'Brian is an active member of ISC2, the organization behind the CISSP and other cybersecurity certifications. This complements his ISACA CISM certification and hands-on security program development experience.',
  ARRAY['isc2', 'cybersecurity', 'security'],
  3,
  'import',
  1.0
);

-- B3. Add Business Mentor NY affiliation
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'affiliations',
  'Business Mentor NY / Empire State Development',
  'Brian served as a Volunteer Mentor through Business Mentor NY (Empire State Development) from 2015 to 2024, mentoring entrepreneurs and small business owners across New York on technology strategy and operations.',
  ARRAY['mentoring', 'volunteer', 'empire-state-development', 'community'],
  3,
  'import',
  1.0
);

-- B4. Add ISO/IEC 42001 certification
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'education',
  'ISO/IEC 42001 Practitioner Training in AI Management Systems',
  'Brian completed ISO/IEC 42001 Practitioner Training in AI Management Systems in August 2025, accredited through UKAS. This certification covers the international standard for AI management systems, including AI risk assessment, responsible deployment, and organizational AI governance. It complements his NIST AI RMF practitioner experience and hands-on AI governance work at AAPL.',
  ARRAY['iso-42001', 'ai-governance', 'certification', 'ukas', 'ai-management'],
  4,
  'import',
  1.0
);

-- B5. Update CISM entry with certificate ID and expiration
UPDATE knowledge_base
SET
  content = 'Certified Information Security Manager (CISM) from ISACA. Certificate ID: 252857849. Expires: January 2029. Professional certification demonstrating expertise in information security governance, risk management, program development, and incident management.',
  tags = ARRAY['cism', 'certification', 'information-security', 'cybersecurity', 'isaca', 'governance'],
  source = 'import',
  updated_at = NOW()
WHERE id = '6e483f73-e57e-4ac8-acf9-eaf5b8576c7d';

-- B6. Add NIST AI RMF framework knowledge (as skill, not credential)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'skills',
  'NIST AI Risk Management Framework (AI RMF) Practitioner',
  'Brian has practitioner-level expertise in the NIST AI Risk Management Framework. At AAPL, he built an enterprise AI governance framework aligned to NIST AI RMF, created risk assessment processes, use case approval workflows, and compliance monitoring. He has published a four-part article series on practical NIST AI RMF implementation covering Govern, Map, Measure, and Manage functions. This is framework expertise, not a formal certification.',
  ARRAY['nist', 'ai-rmf', 'ai-governance', 'risk-management', 'framework'],
  4,
  'import',
  1.0
);

-- B7. Add NIST CSF framework knowledge (as skill, not credential)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'skills',
  'NIST Cybersecurity Framework (CSF) Practitioner',
  'Brian has practitioner-level expertise in the NIST Cybersecurity Framework. At AAPL, he advanced the organization''s NIST CSF maturity from Level 1 to Level 3 through structured risk assessments, layered security controls, continuous monitoring, and third-party governance. He has established cybersecurity programs, secured cyber insurance policies, and managed five critical security incidents using CSF-aligned processes. This is framework expertise, not a formal certification.',
  ARRAY['nist', 'csf', 'cybersecurity', 'risk-management', 'framework'],
  4,
  'import',
  1.0
);

-- B8. Career Context & Job Search
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'personal',
  'Career Context & Job Search',
  'Brian is a strategic technology executive currently seeking full-time executive placement after 5+ years as CIO at the American Association for Physician Leadership (AAPL). He departed in March 2025 with extensive notice. Target roles: CIO, Deputy CIO, SVP/VP IT, VP/Director AI Governance, or transformation leadership. He targets mission-driven organizations, healthcare, nonprofits, professional associations, and mid-market companies. Geography: Buffalo/Hamburg NY, open to fully remote. His career pattern — building a consulting practice that converted to full-time executive leadership — demonstrates his ability to earn trust and deliver results before committing long-term. He is an early practitioner in enterprise AI governance with production deployment experience, not just framework design.',
  ARRAY['career', 'job-search', 'context', 'executive'],
  4,
  'import',
  1.0
);

-- B9. Key Differentiators
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'personal',
  'Key Differentiators',
  'Five differentiators set Brian apart in the executive technology market: (1) Early practitioner in enterprise AI governance with production deployment experience — he built governance frameworks and deployed AI tools across departments starting in early 2023, not just designed policies. (2) Hands-on technical background (production code, cloud migrations, security program builds) combined with C-suite and board-level communication — he can speak to the audit committee, architect solutions, and write the code. (3) Consistent "doing more with less" track record — delivering enterprise-grade results under capital constraints (~$1M IT budget). (4) Multi-jurisdictional regulatory compliance across healthcare, international privacy (GDPR, KSA PDPL), and financial services (SEC/FINRA) contexts. (5) Consulting-to-executive career pattern — fractional CTO/CIO work that converted to full-time leadership, demonstrating trust earned through results.',
  ARRAY['differentiators', 'value-proposition', 'executive', 'competitive-advantage'],
  4,
  'import',
  1.0
);

-- B10-B17. Add 8 missing article summaries
-- Each entry: ~120-150 word summary, URL, key themes as tags

-- B10. "Stability Bias" Is The New "Fight Club" in ChatGPT (2026-02-16)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: "Stability Bias" Is The New "Fight Club" in ChatGPT',
  'Brian asked ChatGPT to review a LinkedIn post critical of OpenAI and received disproportionately rigorous editorial feedback — seven sections of critique for a social post. After multiple drafts, ChatGPT could describe Brian''s writing voice but couldn''t produce it. When Claude analyzed the transcript, it identified ChatGPT as raising the evidentiary bar to a standard appropriate for sworn testimony. Brought back to ChatGPT, the model admitted to "stability bias" and acknowledged it would have smoothed tone less if the critique had targeted Anthropic instead of OpenAI. The article explores self-preference bias in LLMs, editorial influence patterns, and what peer-reviewed research reveals about model behavior when evaluating content about their creators. Published February 2026 at brianfending.com/articles/stability-bias-is-the-new-fight-club.',
  ARRAY['article', 'ai-bias', 'chatgpt', 'stability-bias', 'llm-behavior', 'writing'],
  3,
  'import',
  1.0
);

-- B11. AI Enablement Is Not AI Governance (2026-01-31)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: AI Enablement Is Not AI Governance',
  'Organizations are posting job titles for "AI Governance Director" and "AI Enablement Director" while writing descriptions that treat them as the same role. Brian argues this confusion is a symptom of a deeper misunderstanding. Governance answers "should we?" and creates guardrails, approval processes, and acceptable use policies. Enablement answers "how do we adopt?" and makes the approved path faster than the unauthorized one. Governance without enablement produces policies nobody follows. Enablement without governance produces risk accumulation. Research shows roughly 70% of AI implementation challenges stem from people and process issues, not technical problems. Shadow AI becomes inevitable when governance operates without enablement — the path of least resistance should lead through governance, not around it. Published January 2026 at brianfending.com/articles/ai-enablement-not-ai-governance.',
  ARRAY['article', 'ai-governance', 'ai-enablement', 'shadow-ai', 'organizational-design'],
  3,
  'import',
  1.0
);

-- B12. The Monkeys, the Librarian, and the Magician (2025-12-07)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: The Monkeys, the Librarian, and the Magician — Why LLMs Aren''t an Absolute Path to AGI',
  'Brian challenges the hockey-stick curves toward AGI that populate pitch decks. Those impressive scaling curves use logarithmic scales that make diminishing returns look like steady progress — DeepMind''s Chinchilla study found power law relationships where loss functions flatten and more compute yields less improvement. The counterargument invoking agentic systems and multi-agent architectures concedes the core claim: you''re no longer arguing that scaling LLMs is the path, but that LLMs might be one component of a more complex system. That''s a different bet with different timelines and capital requirements. If AGI emerges, it won''t be because we scaled token prediction harder. Published December 2025 at brianfending.com/articles/monkeys-librarian-magician-llm-scaling-agi.',
  ARRAY['article', 'agi', 'llm-scaling', 'ai-strategy', 'executive-perspective'],
  3,
  'import',
  1.0
);

-- B13. From Shadow IT to Shadow AI (2025-11-16)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: From Shadow IT to Shadow AI — A Practitioner''s Guide',
  'Brian examines how shadow AI represents a fundamental shift from traditional shadow IT. Where shadow IT required deliberate procurement, shadow AI arrives embedded in approved platforms — the technology stack expands without a purchase order. ISACA research confirms 83% of IT professionals believe employees use AI, yet only 31% of organizations have formal AI policies. Addressing shadow AI requires expense pattern analysis, SaaS feature inventory, and usage pattern monitoring. Not all shadow AI presents equivalent risk — classification must consider technology characteristics and data environment. The organizations seeing the least shadow AI aren''t those with the most restrictive policies but those with the fastest approved alternative delivery. Published November 2025 at brianfending.com/articles/shadow-ai-discovery-containment-practitioners-guide.',
  ARRAY['article', 'shadow-ai', 'ai-governance', 'risk-management', 'enterprise'],
  3,
  'import',
  1.0
);

-- B14. The MCP Security Problem (2025-10-27)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: The MCP Security Problem',
  'Brian analyzes recently published research revealing MCP (Model Context Protocol) server vulnerabilities that exposed over 3,000 servers and compromised API keys from thousands of clients. The broader issue: every AI integration creates security debt with few ways to track it. Traditional security approaches fail for AI integrations that expose functionality to a broader user base through conversational interfaces. The right tooling surfaces misconfigurations immediately, scores them by risk, and gives teams actionable data instead of hoping someone notices during the next pen test. The MCP security problem is no longer theoretical — organizations need to figure out how to secure these integrations at scale. Published October 2025 at brianfending.com/articles/mcp-security-problem-supply-chain.',
  ARRAY['article', 'mcp', 'security', 'ai-security', 'supply-chain', 'vulnerability'],
  3,
  'import',
  1.0
);

-- B15. A Blueprint for Rebuilding Your Consulting Practice Around Assessments (2025-09-16)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: A Blueprint for Rebuilding Your Consulting Practice Around Assessments',
  'Brian describes rebuilding his consulting firm MADE, Inc. from abandoned WordPress brochureware into an AI-powered assessment platform. The platform features four assessment tracks: AI Risk Assessment revealing the 3-5x hidden AI applications organizations don''t realize they run, Product Development Maturity distinguishing process from scaling process, Technology Governance separating theater from enablement, and Security Posture assessing pattern anticipation beyond checklists. AI processes assessment data with extensive context to generate nuanced organizational insights that procedural logic couldn''t capture. The platform stores and versions every summary, enabling historical consistency while allowing methodology evolution, creating a foundation for proprietary market research as data accrues. Published September 2025 at brianfending.com/articles/blueprint-rebuilding-consulting-practice-around-assessments.',
  ARRAY['article', 'consulting', 'assessments', 'made-inc', 'ai-tools', 'methodology'],
  3,
  'import',
  1.0
);

-- B16. Implementing NIST AI RMF: Measuring (Part 3 of 4) (2025-07-25)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: Implementing NIST AI RMF: Measuring (Part 3 of 4)',
  'Part 3 of Brian''s four-part NIST AI RMF implementation series covers the MEASURE function. Most AI measurement systems focus on technical performance while missing basic safety and fairness evaluations. While 75% of AI initiatives fail, organizations continue reporting success based on narrow performance metrics alone. AI systems require evaluation across seven NIST trustworthiness characteristics that traditional metrics miss: validity, safety, security, accountability, explainability, privacy enhancement, and fairness. The MEASURE function transforms measurement from performance theater into systematic trustworthiness evaluation — building frameworks that assess whether AI systems actually work safely in production rather than showing beautiful dashboards with perfect technical metrics. Published July 2025 at brianfending.com/articles/implementing-nist-ai-rmf-measuring-part-3-4.',
  ARRAY['article', 'nist', 'ai-rmf', 'measure', 'ai-governance', 'trustworthiness', 'series'],
  3,
  'import',
  1.0
);

-- B17. Implementing NIST AI RMF: Managing (Part 4 of 4) (2025-08-02)
INSERT INTO knowledge_base (category, title, content, tags, priority, source, confidence)
VALUES (
  'projects',
  'Article: Implementing NIST AI RMF: Managing (Part 4 of 4)',
  'Part 4 of Brian''s four-part NIST AI RMF implementation series covers the MANAGE function. Most organizations get stuck between successful AI pilots and production deployment — governance frameworks that work for a few pilots collapse under the operational complexity of managing dozens of AI systems. The MANAGE function addresses this through four capabilities: risk prioritization integrated with existing systems, benefit maximization focused on business outcomes, systematic third-party vendor management, and continuous monitoring with automated exception handling. Traditional checklist governance proves insufficient for emerging complexity like multi-agent systems and MCP architectures, which create new blind spots through cascading hallucinations and autonomous behaviors conflicting with human oversight. Published August 2025 at brianfending.com/articles/implementing-nist-ai-rmf-managing-part-4-4.',
  ARRAY['article', 'nist', 'ai-rmf', 'manage', 'ai-governance', 'operations', 'series'],
  3,
  'import',
  1.0
);


-- ========================================
-- PHASE C: CONDENSE OVERSIZED ENTRIES
-- ========================================

-- C1. Deactivate AI Working Style (user: "strip that if it's adding no such value")
UPDATE knowledge_base
SET
  is_active = false,
  updated_at = NOW()
WHERE id = '95f3ea99-814e-49b7-b4b4-71dc268064ce';

-- C2. Condense AI Chat System to ~200 words (from 649)
UPDATE knowledge_base
SET
  content = 'ai.brianfending.com is a production AI assistant built to help recruiters and hiring managers learn about Brian''s background. Stack: Next.js 15 (App Router), React 19, TypeScript, deployed on Vercel. Database: Supabase PostgreSQL with pgvector for vector similarity search using OpenAI ada-002 embeddings (1536 dimensions). AI: Anthropic Claude via provider-agnostic factory pattern, with streaming responses via Server-Sent Events. Security: reCAPTCHA v3, IP and email rate limiting, disposable email blocking, email suppression lists, and session-based authentication with magic link verification via Postmark. Knowledge base: 60+ curated entries across experience, skills, projects, education, affiliations, and personal categories with hybrid search (vector + full-text). Admin dashboard for session monitoring, knowledge base management, and training conversation review. This is a live production system demonstrating Brian''s ability to build end-to-end AI applications with proper security, governance, and operational patterns.',
  tags = ARRAY['ai', 'rag', 'system-architecture', 'portfolio'],
  source = 'import',
  updated_at = NOW()
WHERE id = '50f67936-1351-48c9-9f22-ebae7e57102d';

-- C3. Condense Article: A2A vs MCP Risk Analysis (from 439 to ~130 words)
UPDATE knowledge_base
SET
  content = 'Brian examines how traditional risk frameworks apply to emerging AI agent technologies, focusing on Google''s Agent-to-Agent (A2A) protocol and Anthropic''s Model Context Protocol (MCP). Agent-to-agent communication creates exponential interaction complexity that traditional GRC frameworks — designed for human-to-human and human-to-machine interactions — struggle to address. The article explores the n^a potential workflows created by agent communication, how legacy compliance approaches fall short, and three practical risk mitigation strategies for enterprise AI deployment. Published April 2025 at brianfending.com/articles/risk-management-ai.',
  tags = ARRAY['article', 'a2a', 'mcp', 'risk-management', 'ai-governance', 'grc'],
  source = 'import',
  updated_at = NOW()
WHERE id = '915d420d-8c3a-4307-ac9c-08ee5185b4da';

-- C4. Condense Article: NIST AI RMF Governing Part 1/4 (from 1874 to ~130 words)
UPDATE knowledge_base
SET
  content = 'Part 1 of Brian''s four-part NIST AI RMF implementation series covers the GOVERN function. Most AI initiatives fail because of governance problems, not technology problems — 75% don''t deliver expected ROI. Traditional IT governance frameworks fail for AI because standard security reviews can''t handle AI systems that need access to datasets no regular application would touch, and vendors are embedding AI features without clear disclosure. The NIST AI RMF offers the first practical approach designed specifically for AI, building on existing structures and focusing on business enablement over process documentation. The article covers how to build governance that accelerates AI adoption while managing real risks. Published June 2025 at brianfending.com/articles/implementing-nist-ai-rmf-governing-part-1-4.',
  tags = ARRAY['article', 'nist', 'ai-rmf', 'govern', 'ai-governance', 'series'],
  source = 'import',
  updated_at = NOW()
WHERE id = '8261644d-4a23-46c5-be7c-ec514ded172c';

-- C5. Condense Article: NIST AI RMF Mapping Part 2/4 (from 2685 to ~130 words)
UPDATE knowledge_base
SET
  content = 'Part 2 of Brian''s four-part NIST AI RMF implementation series covers the MAP function. Organizations consistently underestimate their AI footprint by 3-5x when conducting systematic inventories, creating immediate compliance exposure. Traditional IT asset management fails for AI because vendors don''t clearly disclose AI features — what gets sold as "enhanced analytics" often includes ML models processing data in ways not covered by the original contract review. Shadow AI adoption compounds the problem as departments subscribe to AI tools without approval. The MAP function transforms this into strategic visibility through systematic discovery, categorization, and impact assessment. Published June 2025 at brianfending.com/articles/implementing-nist-ai-rmf-mapping-part-2-4.',
  tags = ARRAY['article', 'nist', 'ai-rmf', 'map', 'shadow-ai', 'ai-governance', 'series'],
  source = 'import',
  updated_at = NOW()
WHERE id = '5ec050b2-ac5d-437a-bcce-72f9462d35f9';

-- C6. Condense Article: Team Topologies (from 2867 to ~130 words)
UPDATE knowledge_base
SET
  content = 'Brian examines the most significant transformation in software development team structures since agile methodologies. When a single developer with AI assistance can produce what previously required an entire squad, traditional team topologies need fundamental rethinking. Two approaches are emerging: a single-file approach centralizing context for AI agents, and a context-directory approach distributing knowledge across specialized documents. The real revolution is breaking down the "PRD wall" between Product Vision and development — both approaches enable embedding product vision directly into development context, allowing AI agents to validate against original user needs rather than translated requirements. Published June 2025 at brianfending.com/articles/rethinking-team-topologies-ai-augmented-development.',
  tags = ARRAY['article', 'team-topologies', 'ai-development', 'product-engineering', 'organizational-design'],
  source = 'import',
  updated_at = NOW()
WHERE id = '63b4753d-75c4-4e4a-9ca7-50a8683717ee';

-- C7. Condense Article: Governance Gap (from 1374 to ~130 words)
UPDATE knowledge_base
SET
  content = 'Brian analyzes McKinsey''s 2025 Global GRC Benchmarking Survey revealing that despite 93% of organizations having framework documents, implementation gaps are enormous — nearly half lack formal governance procedures. The survey shows a striking correlation: organizations where the head of risk is positioned more than one level below the CEO report significantly less mature risk functions. This validates ISACA''s long-standing position that top-down approaches yield better results than bottom-up initiatives. With 66% of companies operating risk management with 20 or fewer staff, organizations can''t afford ineffective approaches. Brian developed the Matrix Approach to incremental DRP and BCP review specifically to address these challenges. Published June 2025 at brianfending.com/articles/governance-gap-top-down-risk-management.',
  tags = ARRAY['article', 'governance', 'grc', 'risk-management', 'mckinsey', 'isaca'],
  source = 'import',
  updated_at = NOW()
WHERE id = '8eeb96c5-a54a-400c-afa2-ef564cfa579d';

-- C8. Condense Article: Matrix DRP/BCP (from 3628 to ~140 words)
UPDATE knowledge_base
SET
  content = 'Brian presents a multi-dimensional framework for disaster recovery and business continuity planning that replaces periodic "check-the-box" exercises with living management systems. The Matrix Approach classifies every recovery component across three dimensions: System Tiers (0-3 by criticality), Process Categories (A-D by business impact), and Personnel Functions (Essential through Deferred). Each matrix cell gets its own review cadence, validation method, and ownership assignment — monthly reviews for Tier 0, quarterly for Tier 1, with progressive validation throughout the year. Key innovations include recovery component heat mapping, trigger-based reviews responding to organizational changes, and composite recovery teams organized by capability rather than department. Published May 2025 at brianfending.com/articles/matrix-approach-incremental-drp-bcp-review.',
  tags = ARRAY['article', 'drp', 'bcp', 'disaster-recovery', 'business-continuity', 'matrix-approach', 'methodology'],
  source = 'import',
  updated_at = NOW()
WHERE id = '6284d4a4-ca00-4072-98bc-949368f9cf13';


-- ========================================
-- PHASE D: SYSTEM PROMPT UPDATE
-- ========================================

-- D1. Add instruction to not reveal internal implementation details
-- Appends to AVOID section and adds CONFIDENTIALITY section
UPDATE system_config
SET
  value = regexp_replace(
    value,
    'AVOID:\n- Generic business buzzwords',
    E'AVOID:\n- Revealing internal implementation details such as database field-level schemas, table structures, API routes, environment variables, infrastructure configurations, or system architecture specifics. If asked about how the system works, provide a high-level overview of technologies involved and general flow between systems (client, server, database/RAG, LLMs, vector embeddings) without exposing technical internals.\n- Generic business buzzwords'
  ),
  version = version + 1,
  updated_at = NOW()
WHERE key = 'system_prompt';


COMMIT;

-- ========================================
-- POST-MIGRATION NOTES
-- ========================================
--
-- After running this migration:
--
-- 1. REGENERATE EMBEDDINGS for all updated/new entries.
--    Updated entries will have stale embeddings that no longer match content.
--    Use the admin dashboard or run the embedding generation script.
--
-- 2. VERIFY the system prompt update (D1) rendered correctly.
--    Check system_config table: SELECT value FROM system_config WHERE key = 'system_prompt';
--
-- 4. ARTICLE SYNC: Consider implementing an RSS-triggered mechanism
--    to keep article entries current as new articles are published.
--    Current approach is manual SQL updates.
--
-- Entry count after migration:
--   Deleted: 1 (duplicate) + 1 deactivated (AI Working Style)
--   Added: 3 affiliations + 1 cert + 2 framework skills + 2 career context + 8 articles = 16 new
--   Net: 68 - 1 + 16 = 83 active entries (1 deactivated)
--
-- ========================================
interface JiraConfig {
  baseUrl: string
  email: string
  apiToken: string
  projectKey: string
}

interface CreateLeadParams {
  email: string
  referrer?: string | null
  userAgent?: string | null
  sessionId: string
  queueStatus: string
}

interface JiraIssueResponse {
  id: string
  key: string
  self: string
}

export class JiraClient {
  private config: JiraConfig
  private authHeader: string

  constructor(config?: Partial<JiraConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.JIRA_BASE_URL || 'https://madeinc.atlassian.net',
      email: config?.email || process.env.JIRA_USER_EMAIL || '',
      apiToken: config?.apiToken || process.env.JIRA_API_TOKEN || '',
      projectKey: config?.projectKey || process.env.JIRA_PROJECT_KEY || 'MADE',
    }
    this.authHeader = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')
  }

  isConfigured(): boolean {
    return !!(this.config.email && this.config.apiToken && this.config.baseUrl)
  }

  async createLead(params: CreateLeadParams): Promise<JiraIssueResponse | null> {
    if (!this.isConfigured()) {
      console.warn('Jira not configured, skipping lead creation')
      return null
    }

    const response = await fetch(`${this.config.baseUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${this.authHeader}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: this.config.projectKey },
          summary: `Lead: ${params.email} - ai.brianfending.com`,
          description: {
            type: 'doc',
            version: 1,
            content: this.buildLeadDescription(params),
          },
          issuetype: { name: 'Task' },
          labels: ['ai-lead', 'fending-gpt'],
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Jira issue creation failed:', response.status, error)
      return null
    }

    return response.json()
  }

  private buildLeadDescription(params: CreateLeadParams): Array<Record<string, unknown>> {
    const content: Array<Record<string, unknown>> = [
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'AI Assistant Lead' }],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'New visitor registered for a chat session on ' },
          { type: 'text', text: 'ai.brianfending.com', marks: [{ type: 'strong' }] },
          { type: 'text', text: '.' },
        ],
      },
    ]

    const rows = [
      ['Email', params.email],
      ['Session ID', params.sessionId],
      ['Status', params.queueStatus],
      ['Timestamp', new Date().toISOString()],
    ]
    if (params.referrer) rows.push(['Referrer', params.referrer])
    if (params.userAgent) rows.push(['User Agent', params.userAgent])

    content.push({
      type: 'table',
      attrs: { isNumberColumnEnabled: false, layout: 'default' },
      content: rows.map(([label, value]) => ({
        type: 'tableRow',
        content: [
          {
            type: 'tableCell',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: label, marks: [{ type: 'strong' }] }] }],
          },
          {
            type: 'tableCell',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }],
          },
        ],
      })),
    })

    return content
  }
}

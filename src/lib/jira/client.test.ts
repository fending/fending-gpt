import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JiraClient } from './client'

describe('JiraClient', () => {
  describe('constructor', () => {
    it('uses provided config values', () => {
      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
        projectKey: 'TEST',
      })
      expect(client.isConfigured()).toBe(true)
    })

    it('falls back to environment variables', () => {
      vi.stubEnv('JIRA_BASE_URL', 'https://env.atlassian.net')
      vi.stubEnv('JIRA_USER_EMAIL', 'env@example.com')
      vi.stubEnv('JIRA_API_TOKEN', 'env-token')
      vi.stubEnv('JIRA_PROJECT_KEY', 'ENV')

      const client = new JiraClient()
      expect(client.isConfigured()).toBe(true)

      vi.unstubAllEnvs()
    })
  })

  describe('isConfigured', () => {
    it('returns false when email is missing', () => {
      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        email: '',
        apiToken: 'token',
        projectKey: 'TEST',
      })
      expect(client.isConfigured()).toBe(false)
    })

    it('returns false when apiToken is missing', () => {
      vi.stubEnv('JIRA_API_TOKEN', '')
      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: '',
        projectKey: 'TEST',
      })
      expect(client.isConfigured()).toBe(false)
      vi.unstubAllEnvs()
    })

    it('returns true when baseUrl falls back to default', () => {
      // baseUrl has a hardcoded fallback, so isConfigured is true
      // as long as email and apiToken are present
      vi.stubEnv('JIRA_BASE_URL', '')
      const client = new JiraClient({
        baseUrl: '',
        email: 'test@example.com',
        apiToken: 'token',
        projectKey: 'TEST',
      })
      expect(client.isConfigured()).toBe(true)
      vi.unstubAllEnvs()
    })
  })

  describe('createLead', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
    })

    it('returns null when not configured', async () => {
      const client = new JiraClient({ email: '', apiToken: '', baseUrl: '' })
      const result = await client.createLead({
        email: 'lead@example.com',
        sessionId: 'session-123',
        queueStatus: 'active',
      })
      expect(result).toBeNull()
    })

    it('sends correct request to Jira API', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1' }),
      })
      vi.stubGlobal('fetch', mockFetch)
      vi.stubEnv('JIRA_ISSUE_TYPE', 'Lead')

      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        email: 'admin@test.com',
        apiToken: 'secret',
        projectKey: 'TEST',
      })

      const result = await client.createLead({
        email: 'lead@example.com',
        sessionId: 'session-123',
        queueStatus: 'active',
        referrer: 'https://google.com',
      })

      expect(result).toEqual({ id: '1', key: 'TEST-1', self: 'https://test.atlassian.net/rest/api/3/issue/1' })
      expect(mockFetch).toHaveBeenCalledOnce()

      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://test.atlassian.net/rest/api/3/issue')
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(options.body)
      expect(body.fields.project.key).toBe('TEST')
      expect(body.fields.summary).toContain('lead@example.com')
      expect(body.fields.issuetype.name).toBe('Lead')
      expect(body.fields.labels).toContain('ai-lead')

      vi.unstubAllGlobals()
    })

    it('returns null on API error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      })
      vi.stubGlobal('fetch', mockFetch)

      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        email: 'admin@test.com',
        apiToken: 'secret',
        projectKey: 'TEST',
      })

      const result = await client.createLead({
        email: 'lead@example.com',
        sessionId: 'session-123',
        queueStatus: 'active',
      })

      expect(result).toBeNull()
      vi.unstubAllGlobals()
    })

    it('includes auth header as base64 encoded email:token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: '1', key: 'T-1', self: '' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const client = new JiraClient({
        baseUrl: 'https://test.atlassian.net',
        email: 'user@test.com',
        apiToken: 'mytoken',
        projectKey: 'T',
      })

      await client.createLead({
        email: 'lead@example.com',
        sessionId: 's-1',
        queueStatus: 'active',
      })

      const expectedAuth = Buffer.from('user@test.com:mytoken').toString('base64')
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe(`Basic ${expectedAuth}`)

      vi.unstubAllGlobals()
    })
  })
})

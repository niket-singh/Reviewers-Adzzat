import axios, { AxiosInstance, AxiosError } from 'axios'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    // Hardcoded production backend URL
    const apiUrl = 'https://reviewers-backend-app.victoriousfield-13acbce7.southeastasia.azurecontainerapps.io/api'
    const baseURL = this.ensureProtocol(apiUrl)

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add token to all requests
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
      return config
    })

    // Handle 401 errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('authToken')
          window.location.href = '/' // Redirect to home page (signin/signup)
        }
        return Promise.reject(error)
      }
    )
  }

  /**
   * Ensures the API URL has a protocol (http:// or https://)
   * This prevents ERR_NAME_NOT_RESOLVED errors when the protocol is missing
   */
  private ensureProtocol(url: string): string {
    const trimmedUrl = url.trim()

    // If empty, return default localhost
    if (!trimmedUrl) {
      return 'http://localhost:8080/api'
    }

    // If URL already has a protocol, return as-is
    if (/^https?:\/\//i.test(trimmedUrl)) {
      return trimmedUrl
    }

    // If URL starts with localhost or 127.0.0.1, use http://
    if (/^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmedUrl)) {
      return `http://${trimmedUrl}`
    }

    // For all other URLs (production domains), use https://
    // Log a warning in development mode to alert developers
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[API Client] URL missing protocol, adding https://: ${trimmedUrl}\n` +
        `Please update NEXT_PUBLIC_API_URL in your .env file to include the protocol.`
      )
    }

    return `https://${trimmedUrl}`
  }

  /**
   * Get the current API base URL being used
   */
  getBaseURL(): string {
    return this.client.defaults.baseURL || ''
  }

  /**
   * Check if the backend API is reachable
   */
  async checkHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await axios.get(`${this.getBaseURL().replace('/api', '')}/health`, {
        timeout: 5000,
      })
      return { healthy: response.data.status === 'healthy' }
    } catch (error: any) {
      let errorMessage = 'Backend is not reachable'

      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to backend. Make sure the backend server is running.'
      } else if (error.code === 'ERR_NAME_NOT_RESOLVED') {
        errorMessage = 'Backend URL is invalid. Please configure NEXT_PUBLIC_API_URL in Azure Portal.'
      } else if (error.message) {
        errorMessage = error.message
      }

      return { healthy: false, error: errorMessage }
    }
  }

  // Auth
  async signup(data: { email: string; password: string; name: string; role: string }) {
    const response = await this.client.post('/auth/signup', data)
    if (response.data.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.data.token)
      }
    }
    return response.data
  }

  async signin(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/signin', data)
    if (response.data.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', response.data.token)
      }
    }
    return response.data
  }

  async logout() {
    const response = await this.client.post('/auth/logout')
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
    }
    return response.data
  }

  async getMe() {
    const response = await this.client.get('/auth/me')
    return response.data
  }

  async requestPasswordReset(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email })
    return response.data
  }

  async resetPassword(token: string, newPassword: string) {
    const response = await this.client.post('/auth/reset-password', { token, newPassword })
    return response.data
  }

  // Profile
  async getProfile() {
    const response = await this.client.get('/profile')
    return response.data
  }

  async updateProfile(data: { name?: string; password?: string } | FormData) {
    const response = await this.client.put('/profile', data)
    return response.data
  }

  // Submissions
  async uploadSubmission(formData: FormData) {
    const response = await this.client.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  async getSubmissions(params?: { status?: string; search?: string }) {
    const response = await this.client.get('/submissions', { params })
    return response.data.submissions || []
  }

  async getReviewedSubmissions(params?: { search?: string }) {
    const response = await this.client.get('/submissions/reviewed', { params })
    return response.data.submissions || []
  }

  async getSubmission(id: string) {
    const response = await this.client.get(`/submissions/${id}`)
    return response.data.submission
  }

  async deleteSubmission(id: string) {
    const response = await this.client.delete(`/submissions/${id}`)
    return response.data
  }

  async getDownloadURL(id: string) {
    // Backend now proxies the file directly with proper headers
    // We need to request as blob and create a download URL
    const response = await this.client.get(`/submissions/${id}/download`, {
      responseType: 'blob',
    })

    // Create a blob URL for download
    const blob = new Blob([response.data], { type: 'application/zip' })
    const downloadUrl = window.URL.createObjectURL(blob)

    return { downloadUrl, blob }
  }

  async submitFeedback(id: string, data: { feedback: string; accountPostedIn?: string; markEligible: boolean }) {
    const response = await this.client.post(`/submissions/${id}/feedback`, data)
    return response.data
  }

  // Admin
  async getUsers() {
    const response = await this.client.get('/users')
    return response.data.users || []
  }

  async approveTester(userId: string) {
    const response = await this.client.put(`/users/${userId}/approve`)
    return response.data
  }

  async toggleGreenLight(userId: string) {
    const response = await this.client.put(`/users/${userId}/greenlight`)
    return response.data
  }

  async switchUserRole(userId: string, newRole: string) {
    const response = await this.client.put(`/users/${userId}/role`, { newRole })
    return response.data
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/users/${userId}`)
    return response.data
  }

  async approveSubmission(id: string) {
    const response = await this.client.put(`/submissions/${id}/approve`)
    return response.data
  }

  async getLogs(limit?: number) {
    const response = await this.client.get('/logs', { params: { limit } })
    return response.data.logs || []
  }

  async getStats() {
    const response = await this.client.get('/stats')
    return response.data
  }

  async getLeaderboard() {
    const response = await this.client.get('/leaderboard')
    return response.data.leaderboard || []
  }

  // Analytics
  async getAnalytics() {
    const response = await this.client.get('/admin/analytics')
    return response.data
  }

  async getAnalyticsChartData(range: '7d' | '30d' | '90d' = '30d') {
    const response = await this.client.get('/admin/analytics/chart', { params: { range } })
    return response.data
  }

  // Audit Logs
  async getAuditLogs(params?: { limit?: number; offset?: number; action?: string; userId?: string }) {
    const response = await this.client.get('/admin/audit-logs', { params })
    return response.data
  }

  // Project V
  async createProjectVSubmission(formData: FormData) {
    const response = await this.client.post('/projectv/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  }

  async getProjectVSubmissions(params?: { search?: string }) {
    const response = await this.client.get('/projectv/submissions', { params })
    return response.data || []
  }

  async getProjectVSubmission(id: string) {
    const response = await this.client.get(`/projectv/submissions/${id}`)
    return response.data
  }

  async updateProjectVStatus(id: string, status: string, accountPostedIn?: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/status`, {
      status,
      accountPostedIn,
    })
    return response.data
  }

  async markChangesRequested(id: string, feedback: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/changes-requested`, {
      feedback,
    })
    return response.data
  }

  async markFinalChecks(id: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/final-checks`)
    return response.data
  }

  async markChangesDone(id: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/changes-done`)
    return response.data
  }

  async deleteProjectVSubmission(id: string) {
    const response = await this.client.delete(`/projectv/submissions/${id}`)
    return response.data
  }

  async markTaskSubmitted(id: string, submittedAccount: string, taskLinkSubmitted: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/task-submitted`, {
      submittedAccount,
      taskLinkSubmitted,
    })
    return response.data
  }

  async markEligibleForManualReview(id: string, taskLink: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/eligible`, {
      taskLink,
    })
    return response.data
  }

  async sendTesterFeedback(id: string, feedback: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/tester-feedback`, {
      feedback,
    })
    return response.data
  }

  async markRejected(id: string, rejectionReason: string) {
    const response = await this.client.put(`/projectv/submissions/${id}/rejected`, {
      rejectionReason,
    })
    return response.data
  }
}

export const apiClient = new ApiClient()

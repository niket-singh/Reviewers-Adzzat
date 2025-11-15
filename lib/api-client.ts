import axios, { AxiosInstance, AxiosError } from 'axios'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
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

  async updateProfile(data: { name?: string; password?: string }) {
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

  async approveReviewer(userId: string) {
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
}

export const apiClient = new ApiClient()

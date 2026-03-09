export interface ApiConfig {
  apiKey: string
  baseUrl: string
  provider?: string
  apiFormat?: 'anthropic' | 'openai'
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 生成唯一的请求 ID
const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

class ApiService {
  private config: ApiConfig | null = null
  private currentRequestId: string | null = null
  private cleanupFunctions: (() => void)[] = []

  setConfig(config: ApiConfig) {
    this.config = config
  }
}

export const apiService = new ApiService()

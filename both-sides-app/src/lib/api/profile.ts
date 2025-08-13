import { 
  Profile, 
  CreateProfileRequest, 
  UpdateProfileRequest, 
  ProfileStats, 
  ProfileInsights, 
  ApiResponse 
} from '@/types/profile';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ProfileAPIError extends Error {
  constructor(message: string, public status?: number, public response?: any) {
    super(message);
    this.name = 'ProfileAPIError';
  }
}

export class ProfileAPI {
  private static async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ProfileAPIError(
          errorData.message || `HTTP error! status: ${response.status}`,
          response.status,
          errorData
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ProfileAPIError) {
        throw error;
      }
      throw new ProfileAPIError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private static getAuthHeaders(token?: string): HeadersInit {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Current user profile endpoints
  static async getCurrentUserProfile(token: string): Promise<ApiResponse<Profile | null>> {
    return this.makeRequest<Profile | null>('/profiles/me/current', {
      headers: this.getAuthHeaders(token),
    });
  }

  static async createCurrentUserProfile(
    data: CreateProfileRequest, 
    token: string
  ): Promise<ApiResponse<Profile>> {
    return this.makeRequest<Profile>('/profiles/me/create', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    });
  }

  static async updateCurrentUserProfile(
    data: UpdateProfileRequest, 
    token: string
  ): Promise<ApiResponse<Profile>> {
    return this.makeRequest<Profile>('/profiles/me/update', {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    });
  }

  static async markCurrentUserProfileComplete(token: string): Promise<ApiResponse<Profile>> {
    return this.makeRequest<Profile>('/profiles/me/complete', {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
    });
  }

  static async checkCurrentUserProfileCompletion(token: string): Promise<ApiResponse<{ completed: boolean }>> {
    return this.makeRequest<{ completed: boolean }>('/profiles/me/completed', {
      headers: this.getAuthHeaders(token),
    });
  }

  static async getCurrentUserProfileInsights(token: string): Promise<ApiResponse<ProfileInsights>> {
    return this.makeRequest<ProfileInsights>('/profiles/me/insights', {
      headers: this.getAuthHeaders(token),
    });
  }

  // Administrative profile endpoints
  static async getProfile(id: string, token: string): Promise<ApiResponse<Profile>> {
    return this.makeRequest<Profile>(`/profiles/${id}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  static async getProfileByUserId(userId: string, token: string): Promise<ApiResponse<Profile | null>> {
    return this.makeRequest<Profile | null>(`/profiles/user/${userId}`, {
      headers: this.getAuthHeaders(token),
    });
  }

  static async listProfiles(
    token: string,
    params?: {
      page?: number;
      limit?: number;
      role?: string;
      completed?: boolean;
      search?: string;
    }
  ): Promise<ApiResponse<{ profiles: Profile[]; total: number; page: number; limit: number }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.role) searchParams.set('role', params.role);
    if (params?.completed !== undefined) searchParams.set('completed', params.completed.toString());
    if (params?.search) searchParams.set('search', params.search);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    return this.makeRequest<{ profiles: Profile[]; total: number; page: number; limit: number }>(
      `/profiles${query}`,
      {
        headers: this.getAuthHeaders(token),
      }
    );
  }

  static async createProfile(
    data: CreateProfileRequest & { user_id: string }, 
    token: string
  ): Promise<ApiResponse<Profile>> {
    return this.makeRequest<Profile>('/profiles', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    });
  }

  static async updateProfile(
    id: string, 
    data: UpdateProfileRequest, 
    token: string
  ): Promise<ApiResponse<Profile>> {
    return this.makeRequest<Profile>(`/profiles/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(data),
    });
  }

  static async deactivateProfile(id: string, token: string): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>(`/profiles/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(token),
    });
  }

  // Analytics endpoints
  static async getProfileStats(token: string): Promise<ApiResponse<ProfileStats>> {
    return this.makeRequest<ProfileStats>('/profiles/stats/summary', {
      headers: this.getAuthHeaders(token),
    });
  }

  static async getProfileInsights(id: string, token: string): Promise<ApiResponse<ProfileInsights>> {
    return this.makeRequest<ProfileInsights>(`/profiles/${id}/insights`, {
      headers: this.getAuthHeaders(token),
    });
  }
}

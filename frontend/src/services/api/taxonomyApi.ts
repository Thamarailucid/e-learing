import { ApiClient } from './ApiClient';

export interface ICourseCategory {
  id: string;
  organization_id: string | null;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  is_system: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface ICourseDifficultyLevel {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  description?: string;
  badge_color: string;
  is_system: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export const taxonomyApi = {
  // Categories
  async getCategories(): Promise<ICourseCategory[]> {
    const res = await ApiClient.get('/taxonomies/GetCategories');
    return res.data?.data || [];
  },

  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    displayOrder?: number;
  }): Promise<ICourseCategory> {
    const res = await ApiClient.post('/taxonomies/CreateCategory', data);
    return res.data?.data;
  },

  async updateCategory(id: string, data: Partial<ICourseCategory>): Promise<ICourseCategory> {
    const res = await ApiClient.put(`/taxonomies/UpdateCategory/${id}`, data);
    return res.data?.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await ApiClient.delete(`/taxonomies/DeleteCategory/${id}`);
  },

  // Difficulty Levels
  async getDifficultyLevels(): Promise<ICourseDifficultyLevel[]> {
    const res = await ApiClient.get('/taxonomies/GetDifficultyLevels');
    return res.data?.data || [];
  },

  async createDifficultyLevel(data: {
    name: string;
    code?: string;
    description?: string;
    badgeColor?: string;
    displayOrder?: number;
  }): Promise<ICourseDifficultyLevel> {
    const res = await ApiClient.post('/taxonomies/CreateDifficultyLevel', data);
    return res.data?.data;
  },

  async updateDifficultyLevel(id: string, data: Partial<ICourseDifficultyLevel>): Promise<ICourseDifficultyLevel> {
    const res = await ApiClient.put(`/taxonomies/UpdateDifficultyLevel/${id}`, data);
    return res.data?.data;
  },

  async deleteDifficultyLevel(id: string): Promise<void> {
    await ApiClient.delete(`/taxonomies/DeleteDifficultyLevel/${id}`);
  },

  // Public
  async getPublicTaxonomies(orgSlug?: string): Promise<{
    categories: ICourseCategory[];
    difficultyLevels: ICourseDifficultyLevel[];
  }> {
    const res = await ApiClient.get('/taxonomies/GetPublicTaxonomies', {
      params: orgSlug ? { orgSlug } : undefined,
    });
    return res.data?.data || { categories: [], difficultyLevels: [] };
  },
};

import { executeQuery } from '../../database/connection';
import { EnvironmentConfig } from '../../config/environment';
import { ApiError } from '../../utils/ApiError';

export class TaxonomyService {
  private schema = EnvironmentConfig.database.schema;

  // ==========================================
  // CATEGORIES CRUD
  // ==========================================

  async GetCategories(organizationId?: string) {
    let query = `
      SELECT id, organization_id, name, slug, description, icon, is_system, is_active, display_order, created_at
      FROM ${this.schema}.course_categories
      WHERE is_active = TRUE
    `;
    const params: any[] = [];

    if (organizationId) {
      query += ` AND (organization_id IS NULL OR organization_id = $1)`;
      params.push(organizationId);
    } else {
      query += ` AND organization_id IS NULL`;
    }

    query += ` ORDER BY display_order ASC, name ASC`;
    const res = await executeQuery(query, params);
    return res.rows;
  }

  async CreateCategory(organizationId: string | undefined, data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    displayOrder?: number;
  }) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const displayOrder = data.displayOrder ?? 10;

    const res = await executeQuery(
      `INSERT INTO ${this.schema}.course_categories (
        organization_id, name, slug, description, icon, is_system, is_active, display_order
       ) VALUES ($1, $2, $3, $4, $5, FALSE, TRUE, $6)
       RETURNING *`,
      [organizationId || null, data.name.trim(), slug, data.description || null, data.icon || 'book', displayOrder]
    );

    return res.rows[0];
  }

  async UpdateCategory(organizationId: string | undefined, categoryId: string, data: {
    name?: string;
    description?: string;
    icon?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const existingRes = await executeQuery(
      `SELECT * FROM ${this.schema}.course_categories WHERE id = $1`,
      [categoryId]
    );
    if (existingRes.rowCount === 0) {
      throw ApiError.notFound('Category not found.');
    }

    const cat = existingRes.rows[0];
    if (cat.is_system && organizationId && cat.organization_id !== organizationId) {
      throw ApiError.forbidden('System default categories cannot be modified.');
    }

    const fields: string[] = [];
    const params: any[] = [categoryId];

    if (data.name !== undefined) {
      params.push(data.name.trim());
      fields.push(`name = $${params.length}`);
    }
    if (data.description !== undefined) {
      params.push(data.description);
      fields.push(`description = $${params.length}`);
    }
    if (data.icon !== undefined) {
      params.push(data.icon);
      fields.push(`icon = $${params.length}`);
    }
    if (data.displayOrder !== undefined) {
      params.push(data.displayOrder);
      fields.push(`display_order = $${params.length}`);
    }
    if (data.isActive !== undefined) {
      params.push(data.isActive);
      fields.push(`is_active = $${params.length}`);
    }

    if (fields.length === 0) return cat;

    params.push(new Date());
    fields.push(`updated_at = $${params.length}`);

    const res = await executeQuery(
      `UPDATE ${this.schema}.course_categories SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    return res.rows[0];
  }

  async DeleteCategory(organizationId: string | undefined, categoryId: string) {
    const existingRes = await executeQuery(
      `SELECT * FROM ${this.schema}.course_categories WHERE id = $1`,
      [categoryId]
    );
    if (existingRes.rowCount === 0) {
      throw ApiError.notFound('Category not found.');
    }

    const cat = existingRes.rows[0];
    if (cat.is_system) {
      throw ApiError.badRequest('System default categories cannot be deleted.');
    }

    if (organizationId && cat.organization_id !== organizationId) {
      throw ApiError.forbidden('Cannot delete categories belonging to another organization.');
    }

    await executeQuery(`DELETE FROM ${this.schema}.course_categories WHERE id = $1`, [categoryId]);
    return { id: categoryId, deleted: true };
  }

  // ==========================================
  // DIFFICULTY LEVELS CRUD
  // ==========================================

  async GetDifficultyLevels(organizationId?: string) {
    let query = `
      SELECT id, organization_id, name, code, description, badge_color, is_system, is_active, display_order, created_at
      FROM ${this.schema}.course_difficulty_levels
      WHERE is_active = TRUE
    `;
    const params: any[] = [];

    if (organizationId) {
      query += ` AND (organization_id IS NULL OR organization_id = $1)`;
      params.push(organizationId);
    } else {
      query += ` AND organization_id IS NULL`;
    }

    query += ` ORDER BY display_order ASC, name ASC`;
    const res = await executeQuery(query, params);
    return res.rows;
  }

  async CreateDifficultyLevel(organizationId: string | undefined, data: {
    name: string;
    code?: string;
    description?: string;
    badgeColor?: string;
    displayOrder?: number;
  }) {
    const code = data.code || data.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    const displayOrder = data.displayOrder ?? 10;

    const res = await executeQuery(
      `INSERT INTO ${this.schema}.course_difficulty_levels (
        organization_id, name, code, description, badge_color, is_system, is_active, display_order
       ) VALUES ($1, $2, $3, $4, $5, FALSE, TRUE, $6)
       RETURNING *`,
      [organizationId || null, data.name.trim(), code, data.description || null, data.badgeColor || 'blue', displayOrder]
    );

    return res.rows[0];
  }

  async UpdateDifficultyLevel(organizationId: string | undefined, levelId: string, data: {
    name?: string;
    description?: string;
    badgeColor?: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const existingRes = await executeQuery(
      `SELECT * FROM ${this.schema}.course_difficulty_levels WHERE id = $1`,
      [levelId]
    );
    if (existingRes.rowCount === 0) {
      throw ApiError.notFound('Difficulty level not found.');
    }

    const lvl = existingRes.rows[0];
    if (lvl.is_system && organizationId && lvl.organization_id !== organizationId) {
      throw ApiError.forbidden('System default difficulty levels cannot be modified.');
    }

    const fields: string[] = [];
    const params: any[] = [levelId];

    if (data.name !== undefined) {
      params.push(data.name.trim());
      fields.push(`name = $${params.length}`);
    }
    if (data.description !== undefined) {
      params.push(data.description);
      fields.push(`description = $${params.length}`);
    }
    if (data.badgeColor !== undefined) {
      params.push(data.badgeColor);
      fields.push(`badge_color = $${params.length}`);
    }
    if (data.displayOrder !== undefined) {
      params.push(data.displayOrder);
      fields.push(`display_order = $${params.length}`);
    }
    if (data.isActive !== undefined) {
      params.push(data.isActive);
      fields.push(`is_active = $${params.length}`);
    }

    if (fields.length === 0) return lvl;

    params.push(new Date());
    fields.push(`updated_at = $${params.length}`);

    const res = await executeQuery(
      `UPDATE ${this.schema}.course_difficulty_levels SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    return res.rows[0];
  }

  async DeleteDifficultyLevel(organizationId: string | undefined, levelId: string) {
    const existingRes = await executeQuery(
      `SELECT * FROM ${this.schema}.course_difficulty_levels WHERE id = $1`,
      [levelId]
    );
    if (existingRes.rowCount === 0) {
      throw ApiError.notFound('Difficulty level not found.');
    }

    const lvl = existingRes.rows[0];
    if (lvl.is_system) {
      throw ApiError.badRequest('System default difficulty levels cannot be deleted.');
    }

    if (organizationId && lvl.organization_id !== organizationId) {
      throw ApiError.forbidden('Cannot delete difficulty levels belonging to another organization.');
    }

    await executeQuery(`DELETE FROM ${this.schema}.course_difficulty_levels WHERE id = $1`, [levelId]);
    return { id: levelId, deleted: true };
  }

  // ==========================================
  // PUBLIC COMBINED TAXONOMY LOOKUP
  // ==========================================

  async GetPublicTaxonomies(orgSlug?: string) {
    let orgId: string | undefined;

    if (orgSlug) {
      const orgRes = await executeQuery(
        `SELECT id FROM ${this.schema}.organizations WHERE slug = $1 AND status = 'ACTIVE'`,
        [orgSlug.toLowerCase().trim()]
      );
      if (orgRes.rowCount! > 0) {
        orgId = orgRes.rows[0].id;
      }
    }

    const [categories, difficultyLevels] = await Promise.all([
      this.GetCategories(orgId),
      this.GetDifficultyLevels(orgId),
    ]);

    return {
      categories,
      difficultyLevels,
    };
  }
}

export const taxonomyService = new TaxonomyService();

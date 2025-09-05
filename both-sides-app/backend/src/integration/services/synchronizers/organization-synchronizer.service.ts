/**
 * Organization Synchronizer Service
 * 
 * Handles synchronization of organization data between external systems and internal database.
 * Manages schools, districts, departments, and organizational hierarchies.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ExternalIdMappingService } from '../external-id-mapping.service';
import { IntegrationRegistry } from '../integration-registry.service';
import { BaseSynchronizerService, SyncContext, ValidationResult, SyncConflict } from './base-synchronizer.service';
import { OrganizationType } from '@prisma/client';

// ===================================================================
// ORGANIZATION-SPECIFIC INTERFACES
// ===================================================================

export interface ExternalOrganizationData {
  id: string;
  name: string;
  type?: string;
  description?: string;
  code?: string;
  parentId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  settings?: Record<string, any>;
  isActive?: boolean;
  metadata?: Record<string, any>;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface InternalOrganizationData {
  id?: string;
  name: string;
  type: OrganizationType;
  description?: string;
  code?: string;
  parent_id?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  contact_phone?: string;
  contact_email?: string;
  website?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
  external_id?: string;
  external_system_id?: string;
  sync_status?: string;
  last_sync_at?: Date;
  sync_version?: number;
  created_at?: Date;
  updated_at?: Date;
}

// ===================================================================
// ORGANIZATION SYNCHRONIZER SERVICE
// ===================================================================

@Injectable()
export class OrganizationSynchronizerService extends BaseSynchronizerService {
  private readonly logger = new Logger(OrganizationSynchronizerService.name);

  constructor(
    prisma: PrismaService,
    mappingService: ExternalIdMappingService,
    integrationRegistry: IntegrationRegistry,
  ) {
    super(prisma, mappingService, integrationRegistry);
  }

  // ===================================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================================================================

  getEntityType(): string {
    return 'organization';
  }

  getConflictableFields(): string[] {
    return [
      'name',
      'description',
      'code',
      'address_street',
      'address_city',
      'address_state',
      'address_zip',
      'contact_phone',
      'contact_email',
      'website',
      'settings',
      'is_active',
    ];
  }

  extractExternalId(data: ExternalOrganizationData): string {
    return data.id;
  }

  extractInternalId(data: InternalOrganizationData): string {
    return data.id!;
  }

  // ===================================================================
  // VALIDATION
  // ===================================================================

  validateExternalData(data: ExternalOrganizationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!data.id?.trim()) {
      errors.push('Organization ID is required');
    }

    if (!data.name?.trim()) {
      errors.push('Organization name is required');
    } else if (data.name.length > 200) {
      errors.push('Organization name too long (max 200 characters)');
    }

    // Validate type
    if (data.type && !this.isValidOrganizationType(data.type)) {
      warnings.push(`Unknown organization type: ${data.type}`);
    }

    // Validate parent reference
    if (data.parentId && !data.parentId.trim()) {
      warnings.push('Empty parent organization ID provided');
    }

    // Validate optional fields
    if (data.description && data.description.length > 1000) {
      errors.push('Organization description too long (max 1000 characters)');
    }

    if (data.code && data.code.length > 50) {
      errors.push('Organization code too long (max 50 characters)');
    }

    // Validate address
    if (data.address) {
      const addressValidation = this.validateAddress(data.address);
      errors.push(...addressValidation.errors);
      warnings.push(...addressValidation.warnings);
    }

    // Validate contact info
    if (data.contact) {
      const contactValidation = this.validateContact(data.contact);
      errors.push(...contactValidation.errors);
      warnings.push(...contactValidation.warnings);
    }

    // Suggestions
    if (!data.description) {
      suggestions.push('Consider providing organization description');
    }

    if (!data.contact?.email && !data.contact?.phone) {
      suggestions.push('Consider providing contact information');
    }

    if (!data.address) {
      suggestions.push('Consider providing organization address');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  private validateAddress(address: ExternalOrganizationData['address']): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (address?.zipCode && !/^\d{5}(-\d{4})?$/.test(address.zipCode)) {
      warnings.push('Invalid ZIP code format');
    }

    if (address?.state && address.state.length !== 2) {
      warnings.push('State should be 2-letter code');
    }

    if (address?.email && !this.isValidEmail(address.email)) {
      errors.push('Invalid email address in contact info');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: [],
    };
  }

  private validateContact(contact: ExternalOrganizationData['contact']): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (contact?.email && !this.isValidEmail(contact.email)) {
      errors.push('Invalid email address');
    }

    if (contact?.phone && !this.isValidPhone(contact.phone)) {
      warnings.push('Invalid phone number format');
    }

    if (contact?.website && !this.isValidUrl(contact.website)) {
      warnings.push('Invalid website URL');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: [],
    };
  }

  // ===================================================================
  // DATA TRANSFORMATION
  // ===================================================================

  async transformExternalToInternal(
    externalData: ExternalOrganizationData,
    context: SyncContext,
  ): Promise<InternalOrganizationData> {
    // Map parent organization ID
    let parentId = null;
    if (externalData.parentId) {
      parentId = await this.mappingService.mapExternalToInternal(
        context.integrationId,
        'organization',
        externalData.parentId,
      );
      
      if (!parentId) {
        this.logger.warn(`Parent organization mapping not found: ${externalData.parentId}`, {
          syncId: context.syncId,
          organizationId: externalData.id,
        });
      }
    }

    const organizationType = this.mapExternalType(externalData.type);

    return {
      name: externalData.name.trim(),
      type: organizationType,
      description: externalData.description?.trim() || null,
      code: externalData.code?.trim() || null,
      parent_id: parentId,
      address_street: externalData.address?.street?.trim() || null,
      address_city: externalData.address?.city?.trim() || null,
      address_state: externalData.address?.state?.trim() || null,
      address_zip: externalData.address?.zipCode?.trim() || null,
      address_country: externalData.address?.country?.trim() || 'US',
      contact_phone: externalData.contact?.phone?.trim() || null,
      contact_email: externalData.contact?.email?.toLowerCase().trim() || null,
      website: externalData.contact?.website?.trim() || null,
      settings: externalData.settings || {},
      is_active: externalData.isActive ?? true,
      external_id: externalData.id,
      external_system_id: context.externalSystemId,
      sync_status: 'SYNCED',
      last_sync_at: context.startTime,
      sync_version: 1,
    };
  }

  async transformInternalToExternal(
    internalData: InternalOrganizationData,
    context: SyncContext,
  ): Promise<ExternalOrganizationData> {
    // Map internal parent ID back to external ID
    let parentId = undefined;
    if (internalData.parent_id) {
      parentId = await this.mappingService.mapInternalToExternal(
        context.integrationId,
        'organization',
        internalData.parent_id,
      );
    }

    return {
      id: internalData.external_id || internalData.id!,
      name: internalData.name,
      type: this.mapInternalType(internalData.type),
      description: internalData.description || undefined,
      code: internalData.code || undefined,
      parentId,
      address: (internalData.address_street || internalData.address_city) ? {
        street: internalData.address_street || undefined,
        city: internalData.address_city || undefined,
        state: internalData.address_state || undefined,
        zipCode: internalData.address_zip || undefined,
        country: internalData.address_country || 'US',
      } : undefined,
      contact: (internalData.contact_phone || internalData.contact_email || internalData.website) ? {
        phone: internalData.contact_phone || undefined,
        email: internalData.contact_email || undefined,
        website: internalData.website || undefined,
      } : undefined,
      settings: internalData.settings,
      isActive: internalData.is_active,
      createdAt: internalData.created_at,
      updatedAt: internalData.updated_at,
    };
  }

  // ===================================================================
  // CRUD OPERATIONS
  // ===================================================================

  async createEntity(data: InternalOrganizationData, context: SyncContext): Promise<InternalOrganizationData> {
    this.logger.log(`Creating organization: ${data.name}`, { syncId: context.syncId });

    const created = await this.prisma.organization.create({
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        code: data.code,
        parent_id: data.parent_id,
        address_street: data.address_street,
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        address_country: data.address_country,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        website: data.website,
        settings: data.settings,
        is_active: data.is_active,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: data.sync_version,
      },
    });

    this.logger.log(`Successfully created organization: ${created.id}`, {
      syncId: context.syncId,
      organizationId: created.id,
      organizationName: created.name,
    });

    return created;
  }

  async updateEntity(
    id: string,
    data: InternalOrganizationData,
    context: SyncContext,
  ): Promise<InternalOrganizationData> {
    this.logger.log(`Updating organization: ${id}`, { syncId: context.syncId });

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        description: data.description,
        code: data.code,
        parent_id: data.parent_id,
        address_street: data.address_street,
        address_city: data.address_city,
        address_state: data.address_state,
        address_zip: data.address_zip,
        address_country: data.address_country,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        website: data.website,
        settings: data.settings,
        is_active: data.is_active,
        external_id: data.external_id,
        external_system_id: data.external_system_id,
        sync_status: data.sync_status as any,
        last_sync_at: data.last_sync_at,
        sync_version: (data.sync_version || 0) + 1,
        updated_at: new Date(),
      },
    });

    this.logger.log(`Successfully updated organization: ${updated.id}`, {
      syncId: context.syncId,
      organizationId: updated.id,
    });

    return updated;
  }

  async findEntityByExternalId(
    externalId: string,
    context: SyncContext,
  ): Promise<InternalOrganizationData | null> {
    return await this.prisma.organization.findFirst({
      where: {
        external_id: externalId,
        external_system_id: context.externalSystemId,
      },
    });
  }

  async findEntityByInternalId(
    internalId: string,
    context: SyncContext,
  ): Promise<InternalOrganizationData | null> {
    return await this.prisma.organization.findUnique({
      where: { id: internalId },
    });
  }

  // ===================================================================
  // ORGANIZATION-SPECIFIC METHODS
  // ===================================================================

  /**
   * Synchronize organization hierarchy
   */
  async synchronizeOrganizationHierarchy(
    externalOrganizations: ExternalOrganizationData[],
    context: SyncContext,
  ): Promise<any[]> {
    // Sort organizations to process parents before children
    const sortedOrgs = this.sortOrganizationsByHierarchy(externalOrganizations);
    
    this.logger.log(`Synchronizing ${sortedOrgs.length} organizations in hierarchical order`, {
      syncId: context.syncId,
    });

    const results = [];
    
    // Process organizations level by level
    for (const org of sortedOrgs) {
      try {
        const result = await this.synchronizeEntity(org, context);
        results.push(result);
        
        // Small delay to ensure parent-child relationships are properly established
        await this.delay(50);
      } catch (error) {
        this.logger.error(`Failed to sync organization ${org.id}: ${error.message}`);
        results.push({
          entityId: org.id,
          entityType: 'organization',
          action: 'error',
          error: error.message,
          processingTime: 0,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Get organization tree structure
   */
  async getOrganizationTree(context: SyncContext): Promise<any> {
    const organizations = await this.prisma.organization.findMany({
      where: {
        external_system_id: context.externalSystemId,
        is_active: true,
      },
      orderBy: [
        { parent_id: 'asc' },
        { name: 'asc' },
      ],
    });

    return this.buildOrganizationTree(organizations);
  }

  /**
   * Synchronize organizations by type
   */
  async synchronizeOrganizationsByType(
    externalOrganizations: ExternalOrganizationData[],
    type: OrganizationType,
    context: SyncContext,
  ): Promise<any[]> {
    const filteredOrgs = externalOrganizations.filter(org => 
      this.mapExternalType(org.type) === type
    );

    this.logger.log(`Synchronizing ${filteredOrgs.length} ${type} organizations`, {
      syncId: context.syncId,
    });

    return await this.synchronizeBatch(filteredOrgs, context);
  }

  /**
   * Get organization statistics
   */
  async getOrganizationSyncStatistics(context: SyncContext): Promise<{
    totalOrganizations: number;
    activeOrganizations: number;
    organizationsByType: Record<string, number>;
    hierarchyDepth: number;
    lastSyncAt: Date;
  }> {
    const organizations = await this.prisma.organization.findMany({
      where: {
        external_system_id: context.externalSystemId,
      },
      select: {
        is_active: true,
        type: true,
        parent_id: true,
        last_sync_at: true,
      },
    });

    const organizationsByType: Record<string, number> = {};
    let lastSyncAt = new Date(0);

    for (const org of organizations) {
      organizationsByType[org.type] = (organizationsByType[org.type] || 0) + 1;
      
      if (org.last_sync_at && org.last_sync_at > lastSyncAt) {
        lastSyncAt = org.last_sync_at;
      }
    }

    const hierarchyDepth = this.calculateHierarchyDepth(organizations);

    return {
      totalOrganizations: organizations.length,
      activeOrganizations: organizations.filter(o => o.is_active).length,
      organizationsByType,
      hierarchyDepth,
      lastSyncAt,
    };
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private isValidOrganizationType(type: string): boolean {
    const validTypes = ['DISTRICT', 'SCHOOL', 'DEPARTMENT', 'district', 'school', 'department'];
    return validTypes.includes(type);
  }

  private mapExternalType(externalType?: string): OrganizationType {
    if (!externalType) return OrganizationType.SCHOOL;
    
    const type = externalType.toUpperCase();
    
    switch (type) {
      case 'DISTRICT':
      case 'LEA': // Local Education Agency
        return OrganizationType.DISTRICT;
      case 'SCHOOL':
      case 'CAMPUS':
        return OrganizationType.SCHOOL;
      case 'DEPARTMENT':
      case 'DIVISION':
        return OrganizationType.DEPARTMENT;
      default:
        this.logger.warn(`Unknown organization type: ${externalType}, defaulting to SCHOOL`);
        return OrganizationType.SCHOOL;
    }
  }

  private mapInternalType(internalType: OrganizationType): string {
    switch (internalType) {
      case OrganizationType.DISTRICT:
        return 'district';
      case OrganizationType.SCHOOL:
        return 'school';
      case OrganizationType.DEPARTMENT:
        return 'department';
      default:
        return 'school';
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)\.]{10,}$/;
    return phoneRegex.test(phone);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private sortOrganizationsByHierarchy(organizations: ExternalOrganizationData[]): ExternalOrganizationData[] {
    const orgMap = new Map(organizations.map(org => [org.id, org]));
    const result: ExternalOrganizationData[] = [];
    const processed = new Set<string>();

    const processOrg = (org: ExternalOrganizationData) => {
      if (processed.has(org.id)) return;
      
      // Process parent first
      if (org.parentId && orgMap.has(org.parentId) && !processed.has(org.parentId)) {
        processOrg(orgMap.get(org.parentId)!);
      }
      
      result.push(org);
      processed.add(org.id);
    };

    // Start with organizations that have no parent
    organizations.filter(org => !org.parentId).forEach(processOrg);
    
    // Then process remaining organizations
    organizations.filter(org => org.parentId).forEach(processOrg);

    return result;
  }

  private buildOrganizationTree(organizations: any[]): any {
    const orgMap = new Map(organizations.map(org => [org.id, { ...org, children: [] }]));
    const roots = [];

    for (const org of organizations) {
      const orgNode = orgMap.get(org.id);
      
      if (org.parent_id && orgMap.has(org.parent_id)) {
        orgMap.get(org.parent_id).children.push(orgNode);
      } else {
        roots.push(orgNode);
      }
    }

    return roots;
  }

  private calculateHierarchyDepth(organizations: any[]): number {
    const orgMap = new Map(organizations.map(org => [org.id, org]));
    let maxDepth = 0;

    const getDepth = (org: any, visited = new Set()): number => {
      if (visited.has(org.id)) return 0; // Avoid cycles
      visited.add(org.id);
      
      if (!org.parent_id) return 1;
      
      const parent = orgMap.get(org.parent_id);
      return parent ? getDepth(parent, visited) + 1 : 1;
    };

    for (const org of organizations) {
      const depth = getDepth(org);
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    }

    return maxDepth;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===================================================================
  // CONFLICT RESOLUTION
  // ===================================================================

  protected async resolveExternalWins(conflict: SyncConflict): Promise<ExternalOrganizationData> {
    // External data takes precedence
    const externalOrg = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    
    return externalOrg ? await this.transformInternalToExternal(
      externalOrg,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    ) : null;
  }

  protected async resolveInternalWins(conflict: SyncConflict): Promise<InternalOrganizationData> {
    // Internal data takes precedence
    return await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
  }

  protected async resolveMerge(conflict: SyncConflict): Promise<InternalOrganizationData> {
    const external = await this.findEntityByExternalId(
      conflict.externalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );
    const internal = await this.findEntityByInternalId(
      conflict.internalId,
      { externalSystemId: conflict.entityId.split('-')[0] } as SyncContext,
    );

    if (!external || !internal) return null;

    // Merge strategy: External wins for descriptive data, internal wins for hierarchy
    return {
      ...internal,
      name: external.name, // External name takes precedence
      description: external.description || internal.description,
      code: external.code || internal.code,
      address_street: external.address_street || internal.address_street,
      address_city: external.address_city || internal.address_city,
      address_state: external.address_state || internal.address_state,
      address_zip: external.address_zip || internal.address_zip,
      contact_phone: external.contact_phone || internal.contact_phone,
      contact_email: external.contact_email || internal.contact_email,
      website: external.website || internal.website,
      settings: { ...internal.settings, ...external.settings },
      is_active: external.is_active ?? internal.is_active,
      // Keep internal hierarchy
      parent_id: internal.parent_id,
    };
  }
}

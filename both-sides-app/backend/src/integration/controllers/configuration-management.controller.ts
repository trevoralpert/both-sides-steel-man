/**
 * Configuration Management Controller
 * 
 * REST API endpoints for comprehensive configuration management including
 * validation, environment-specific configuration, backup & versioning,
 * promotion workflows, and secure secret management.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ConfigurationValidationService } from '../services/configuration/configuration-validation.service';
import { EnvironmentConfigurationService } from '../services/configuration/environment-configuration.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../auth/roles.guard';
import { Roles } from '../../../auth/roles.decorator';

// ===================================================================
// REQUEST/RESPONSE DTOs
// ===================================================================

export class ConfigurationValidationDto {
  configuration: any;
  schemaId: string;
  includeConnectionTest?: boolean;
  validateDependencies?: boolean;
}

export class ConfigurationBackupDto {
  type?: 'manual' | 'automatic' | 'pre_update' | 'scheduled';
  reason?: string;
  changeDescription?: string;
  tags?: string[];
}

export class EnvironmentConfigurationDto {
  configuration: any;
  secrets?: Record<string, string>;
  inherit?: boolean;
  parentEnvironment?: string;
  description?: string;
  tags?: string[];
  validate?: boolean;
}

export class SecretUpdateDto {
  secrets: Record<string, string>;
}

export class SecretRotationDto {
  field: string;
  newValue: string;
}

export class PromotionRequestDto {
  sourceEnvironment: string;
  targetEnvironment: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  scheduledAt?: string; // ISO date string
  rollbackPlan?: string;
  includeSecrets?: boolean;
}

export class PromotionApprovalDto {
  approved: boolean;
  comment?: string;
}

export class BatchValidationDto {
  configurations: Array<{
    id: string;
    configuration: any;
    schemaId: string;
  }>;
  includeConnectionTest?: boolean;
  parallel?: boolean;
}

// ===================================================================
// CONFIGURATION MANAGEMENT CONTROLLER
// ===================================================================

@ApiTags('Configuration Management')
@Controller('api/integration/config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfigurationManagementController {
  private readonly logger = new Logger(ConfigurationManagementController.name);

  constructor(
    private readonly validationService: ConfigurationValidationService,
    private readonly environmentService: EnvironmentConfigurationService,
  ) {}

  // ===================================================================
  // CONFIGURATION VALIDATION ENDPOINTS
  // ===================================================================

  @Post('validate')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Validate configuration',
    description: 'Validate configuration against schema with optional connection testing',
  })
  @ApiBody({ type: ConfigurationValidationDto })
  @ApiResponse({ status: 200, description: 'Configuration validation result' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async validateConfiguration(
    @Body() validationDto: ConfigurationValidationDto
  ) {
    try {
      this.logger.log('Validating configuration', {
        schemaId: validationDto.schemaId,
        includeConnectionTest: validationDto.includeConnectionTest,
      });

      const result = await this.validationService.validateConfiguration(
        validationDto.configuration,
        validationDto.schemaId,
        {
          includeConnectionTest: validationDto.includeConnectionTest,
          validateDependencies: validationDto.validateDependencies,
        }
      );

      return {
        success: true,
        data: result,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Configuration validation failed: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Configuration validation failed',
        details: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('validate/batch')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Batch validate configurations',
    description: 'Validate multiple configurations in a single request',
  })
  @ApiBody({ type: BatchValidationDto })
  @ApiResponse({ status: 200, description: 'Batch validation results' })
  async batchValidateConfigurations(
    @Body() batchDto: BatchValidationDto
  ) {
    try {
      this.logger.log('Batch validating configurations', {
        count: batchDto.configurations.length,
        parallel: batchDto.parallel,
      });

      const results = await this.validationService.validateConfigurations(
        batchDto.configurations,
        {
          includeConnectionTest: batchDto.includeConnectionTest,
          parallel: batchDto.parallel,
        }
      );

      const summary = {
        total: results.length,
        valid: results.filter(r => r.result.valid).length,
        invalid: results.filter(r => !r.result.valid).length,
      };

      return {
        success: true,
        data: results,
        summary,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Batch validation failed: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Batch validation failed',
        details: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('test-connection/:providerId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Test configuration connection',
    description: 'Test connectivity using provider configuration',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiBody({ 
    schema: { 
      properties: { 
        configuration: { type: 'object' }, 
        schemaId: { type: 'string' },
        timeout: { type: 'number' }
      } 
    } 
  })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(
    @Param('providerId') providerId: string,
    @Body() body: { configuration: any; schemaId: string; timeout?: number }
  ) {
    try {
      this.logger.log(`Testing connection for provider ${providerId}`, {
        schemaId: body.schemaId,
        timeout: body.timeout,
      });

      const result = await this.validationService.testConnection(
        body.configuration,
        body.schemaId,
        body.timeout
      );

      return {
        success: result.successful,
        data: result,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Connection test failed',
        details: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('schemas')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get configuration schemas',
    description: 'Retrieve all available configuration schemas',
  })
  @ApiQuery({ name: 'providerType', required: false, description: 'Filter by provider type' })
  @ApiResponse({ status: 200, description: 'Configuration schemas retrieved' })
  async getSchemas(
    @Query('providerType') providerType?: string
  ) {
    try {
      const schemas = providerType
        ? this.validationService.getSchemasByProviderType(providerType)
        : this.validationService.getAllSchemas();

      return {
        success: true,
        data: schemas,
        count: schemas.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get schemas: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve schemas',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('schemas/:schemaId')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get configuration schema',
    description: 'Retrieve specific configuration schema by ID',
  })
  @ApiParam({ name: 'schemaId', description: 'Schema identifier' })
  @ApiResponse({ status: 200, description: 'Configuration schema retrieved' })
  @ApiResponse({ status: 404, description: 'Schema not found' })
  async getSchema(
    @Param('schemaId') schemaId: string
  ) {
    try {
      const schema = this.validationService.getSchema(schemaId);

      if (!schema) {
        throw new HttpException({
          success: false,
          error: 'Schema not found',
          schemaId,
        }, HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: schema,
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to get schema ${schemaId}: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve schema',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // ENVIRONMENT CONFIGURATION ENDPOINTS
  // ===================================================================

  @Get('environments/:providerId')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get provider configurations',
    description: 'Get all environment configurations for a provider',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiQuery({ name: 'environments', required: false, description: 'Comma-separated list of environments' })
  @ApiQuery({ name: 'includeSecrets', required: false, description: 'Include encrypted secrets' })
  @ApiResponse({ status: 200, description: 'Provider configurations retrieved' })
  async getProviderConfigurations(
    @Param('providerId') providerId: string,
    @Query('environments') environments?: string,
    @Query('includeSecrets') includeSecrets?: boolean,
    @Request() req?: any
  ) {
    try {
      const userId = req.user.id;
      const environmentList = environments ? environments.split(',') : undefined;

      const configurations = await this.environmentService.getProviderConfigurations(
        providerId,
        {
          environments: environmentList,
          userId,
          includeSecrets,
        }
      );

      return {
        success: true,
        data: configurations,
        count: configurations.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get provider configurations: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve provider configurations',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('environments/:providerId/:environment')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get environment configuration',
    description: 'Get configuration for a specific provider and environment',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiParam({ name: 'environment', description: 'Environment name' })
  @ApiQuery({ name: 'includeSecrets', required: false, description: 'Include encrypted secrets' })
  @ApiQuery({ name: 'resolveInheritance', required: false, description: 'Resolve inheritance chain' })
  @ApiResponse({ status: 200, description: 'Environment configuration retrieved' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async getEnvironmentConfiguration(
    @Param('providerId') providerId: string,
    @Param('environment') environment: string,
    @Query('includeSecrets') includeSecrets?: boolean,
    @Query('resolveInheritance') resolveInheritance?: boolean,
    @Request() req?: any
  ) {
    try {
      const userId = req.user.id;

      const configuration = await this.environmentService.getEnvironmentConfiguration(
        providerId,
        environment,
        {
          includeSecrets,
          resolveInheritance,
          userId,
        }
      );

      if (!configuration) {
        throw new HttpException({
          success: false,
          error: 'Configuration not found',
          providerId,
          environment,
        }, HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: configuration,
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to get environment configuration: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve environment configuration',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('environments/:providerId/:environment')
  @Roles('admin')
  @ApiOperation({
    summary: 'Set environment configuration',
    description: 'Create or update configuration for a specific provider and environment',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiParam({ name: 'environment', description: 'Environment name' })
  @ApiBody({ type: EnvironmentConfigurationDto })
  @ApiResponse({ status: 200, description: 'Environment configuration set successfully' })
  async setEnvironmentConfiguration(
    @Param('providerId') providerId: string,
    @Param('environment') environment: string,
    @Body() configDto: EnvironmentConfigurationDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      this.logger.log(`Setting configuration for ${providerId} in ${environment}`, {
        userId,
        inherit: configDto.inherit,
        parentEnvironment: configDto.parentEnvironment,
      });

      const configuration = await this.environmentService.setEnvironmentConfiguration(
        providerId,
        environment,
        configDto.configuration,
        configDto.secrets || {},
        {
          inherit: configDto.inherit,
          parentEnvironment: configDto.parentEnvironment,
          createdBy: userId,
          description: configDto.description,
          tags: configDto.tags,
          validate: configDto.validate,
        }
      );

      return {
        success: true,
        data: configuration,
        message: 'Environment configuration set successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to set environment configuration: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to set environment configuration',
        details: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('environments/:providerId/:environment')
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete environment configuration',
    description: 'Delete configuration for a specific provider and environment',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiParam({ name: 'environment', description: 'Environment name' })
  @ApiResponse({ status: 200, description: 'Environment configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Configuration not found' })
  async deleteEnvironmentConfiguration(
    @Param('providerId') providerId: string,
    @Param('environment') environment: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      await this.environmentService.deleteEnvironmentConfiguration(
        providerId,
        environment,
        userId
      );

      return {
        success: true,
        message: 'Environment configuration deleted successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to delete environment configuration: ${error.message}`, error.stack);

      if (error.message.includes('not found')) {
        throw new HttpException({
          success: false,
          error: 'Configuration not found',
          providerId,
          environment,
        }, HttpStatus.NOT_FOUND);
      }

      throw new HttpException({
        success: false,
        error: 'Failed to delete environment configuration',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // SECRET MANAGEMENT ENDPOINTS
  // ===================================================================

  @Put('environments/:providerId/:environment/secrets')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update configuration secrets',
    description: 'Update encrypted secrets for a configuration',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiParam({ name: 'environment', description: 'Environment name' })
  @ApiBody({ type: SecretUpdateDto })
  @ApiResponse({ status: 200, description: 'Secrets updated successfully' })
  async updateSecrets(
    @Param('providerId') providerId: string,
    @Param('environment') environment: string,
    @Body() secretDto: SecretUpdateDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      // Get configuration to get the configuration ID
      const config = await this.environmentService.getEnvironmentConfiguration(
        providerId,
        environment,
        { userId }
      );

      if (!config) {
        throw new HttpException({
          success: false,
          error: 'Configuration not found',
          providerId,
          environment,
        }, HttpStatus.NOT_FOUND);
      }

      await this.environmentService.setSecrets(
        config.id,
        secretDto.secrets,
        userId
      );

      return {
        success: true,
        message: 'Secrets updated successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to update secrets: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to update secrets',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('environments/:providerId/:environment/secrets/rotate')
  @Roles('admin')
  @ApiOperation({
    summary: 'Rotate configuration secret',
    description: 'Rotate a specific secret field',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiParam({ name: 'environment', description: 'Environment name' })
  @ApiBody({ type: SecretRotationDto })
  @ApiResponse({ status: 200, description: 'Secret rotated successfully' })
  async rotateSecret(
    @Param('providerId') providerId: string,
    @Param('environment') environment: string,
    @Body() rotationDto: SecretRotationDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      // Get configuration to get the configuration ID
      const config = await this.environmentService.getEnvironmentConfiguration(
        providerId,
        environment,
        { userId }
      );

      if (!config) {
        throw new HttpException({
          success: false,
          error: 'Configuration not found',
          providerId,
          environment,
        }, HttpStatus.NOT_FOUND);
      }

      await this.environmentService.rotateSecret(
        config.id,
        rotationDto.field,
        rotationDto.newValue,
        userId
      );

      return {
        success: true,
        message: `Secret ${rotationDto.field} rotated successfully`,
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to rotate secret: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to rotate secret',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // BACKUP & VERSIONING ENDPOINTS
  // ===================================================================

  @Post('backups/:providerId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Create configuration backup',
    description: 'Create a backup of the current configuration',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiBody({ type: ConfigurationBackupDto })
  @ApiResponse({ status: 201, description: 'Configuration backup created successfully' })
  async createBackup(
    @Param('providerId') providerId: string,
    @Body() backupDto: ConfigurationBackupDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      // For simplicity, backup the production configuration
      const config = await this.environmentService.getEnvironmentConfiguration(
        providerId,
        'production',
        { includeSecrets: true, userId }
      );

      if (!config) {
        throw new HttpException({
          success: false,
          error: 'No production configuration found to backup',
          providerId,
        }, HttpStatus.NOT_FOUND);
      }

      const backup = await this.validationService.createBackup(
        config.id,
        providerId,
        config.configuration,
        {
          type: backupDto.type || 'manual',
          reason: backupDto.reason,
          changeDescription: backupDto.changeDescription,
          createdBy: userId,
          tags: backupDto.tags,
        }
      );

      return {
        success: true,
        data: backup,
        message: 'Configuration backup created successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to create backup: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to create configuration backup',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('backups/:providerId')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get configuration backups',
    description: 'Retrieve configuration backups for a provider',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by backup type' })
  @ApiResponse({ status: 200, description: 'Configuration backups retrieved' })
  async getBackups(
    @Param('providerId') providerId: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string
  ) {
    try {
      // Get configuration ID (simplified - would need proper lookup)
      const configurationId = `config_${providerId}_production_latest`;

      const backups = this.validationService.getBackups(configurationId, {
        limit: limit ? parseInt(limit, 10) : undefined,
        type: type as any,
      });

      return {
        success: true,
        data: backups,
        count: backups.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get backups: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve configuration backups',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('backups/:backupId/restore')
  @Roles('admin')
  @ApiOperation({
    summary: 'Restore from backup',
    description: 'Restore configuration from a specific backup',
  })
  @ApiParam({ name: 'backupId', description: 'Backup identifier' })
  @ApiBody({
    schema: {
      properties: {
        validateBeforeRestore: { type: 'boolean' },
        createBackupBeforeRestore: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Configuration restored successfully' })
  async restoreFromBackup(
    @Param('backupId') backupId: string,
    @Body() body: { validateBeforeRestore?: boolean; createBackupBeforeRestore?: boolean },
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      const result = await this.validationService.restoreFromBackup(backupId, {
        validateBeforeRestore: body.validateBeforeRestore,
        createBackupBeforeRestore: body.createBackupBeforeRestore,
        restoredBy: userId,
      });

      if (!result.success) {
        throw new HttpException({
          success: false,
          error: 'Configuration restore failed',
          details: result.error,
        }, HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        data: result.configuration,
        message: 'Configuration restored successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to restore from backup: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to restore configuration from backup',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // PROMOTION WORKFLOW ENDPOINTS
  // ===================================================================

  @Post('promotions/:providerId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Create promotion request',
    description: 'Create a request to promote configuration between environments',
  })
  @ApiParam({ name: 'providerId', description: 'Provider identifier' })
  @ApiBody({ type: PromotionRequestDto })
  @ApiResponse({ status: 201, description: 'Promotion request created successfully' })
  async createPromotionRequest(
    @Param('providerId') providerId: string,
    @Body() promotionDto: PromotionRequestDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      const promotion = await this.environmentService.createPromotionRequest(
        providerId,
        promotionDto.sourceEnvironment,
        promotionDto.targetEnvironment,
        {
          requestedBy: userId,
          reason: promotionDto.reason,
          urgency: promotionDto.urgency,
          scheduledAt: promotionDto.scheduledAt ? new Date(promotionDto.scheduledAt) : undefined,
          rollbackPlan: promotionDto.rollbackPlan,
          includeSecrets: promotionDto.includeSecrets,
        }
      );

      return {
        success: true,
        data: promotion,
        message: 'Promotion request created successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to create promotion request: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to create promotion request',
        details: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('promotions')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get promotion requests',
    description: 'Retrieve promotion requests with optional filtering',
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by promotion status' })
  @ApiQuery({ name: 'providerId', required: false, description: 'Filter by provider ID' })
  @ApiQuery({ name: 'environment', required: false, description: 'Filter by environment' })
  @ApiResponse({ status: 200, description: 'Promotion requests retrieved' })
  async getPromotions(
    @Query('status') status?: string,
    @Query('providerId') providerId?: string,
    @Query('environment') environment?: string
  ) {
    try {
      const promotions = this.environmentService.getPromotions({
        status: status ? status.split(',') : undefined,
        providerId,
        environment,
      });

      return {
        success: true,
        data: promotions,
        count: promotions.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get promotions: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve promotion requests',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('promotions/:promotionId/approve')
  @Roles('admin')
  @ApiOperation({
    summary: 'Approve promotion request',
    description: 'Approve or reject a promotion request',
  })
  @ApiParam({ name: 'promotionId', description: 'Promotion identifier' })
  @ApiBody({ type: PromotionApprovalDto })
  @ApiResponse({ status: 200, description: 'Promotion approval processed' })
  async approvePromotion(
    @Param('promotionId') promotionId: string,
    @Body() approvalDto: PromotionApprovalDto,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      const promotion = await this.environmentService.approvePromotion(
        promotionId,
        userId,
        approvalDto.approved,
        approvalDto.comment
      );

      return {
        success: true,
        data: promotion,
        message: `Promotion ${approvalDto.approved ? 'approved' : 'rejected'} successfully`,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to approve promotion: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to process promotion approval',
        details: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('promotions/:promotionId/deploy')
  @Roles('admin')
  @ApiOperation({
    summary: 'Deploy approved promotion',
    description: 'Deploy an approved promotion to target environment',
  })
  @ApiParam({ name: 'promotionId', description: 'Promotion identifier' })
  @ApiResponse({ status: 200, description: 'Promotion deployed successfully' })
  async deployPromotion(
    @Param('promotionId') promotionId: string,
    @Request() req: any
  ) {
    try {
      const userId = req.user.id;

      const result = await this.environmentService.deployPromotion(promotionId, userId);

      if (!result.success) {
        throw new HttpException({
          success: false,
          error: 'Promotion deployment failed',
          details: result.error,
        }, HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        message: 'Promotion deployed successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to deploy promotion: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to deploy promotion',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ===================================================================
  // UTILITY ENDPOINTS
  // ===================================================================

  @Get('templates')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get environment templates',
    description: 'Retrieve all available environment templates',
  })
  @ApiResponse({ status: 200, description: 'Environment templates retrieved' })
  async getTemplates() {
    try {
      const templates = this.environmentService.getTemplates();

      return {
        success: true,
        data: templates,
        count: templates.length,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get templates: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve environment templates',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('statistics')
  @Roles('admin', 'teacher')
  @ApiOperation({
    summary: 'Get configuration statistics',
    description: 'Retrieve configuration management statistics',
  })
  @ApiResponse({ status: 200, description: 'Configuration statistics retrieved' })
  async getStatistics() {
    try {
      const validationStats = this.validationService.getValidationStatistics();
      const environmentStats = this.environmentService.getStatistics();

      const combinedStats = {
        validation: validationStats,
        environment: environmentStats,
        overall: {
          totalConfigurations: environmentStats.configurations,
          totalSchemas: validationStats.schemasRegistered,
          totalSecrets: environmentStats.secrets,
          totalPromotions: environmentStats.promotions,
        },
      };

      return {
        success: true,
        data: combinedStats,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to retrieve configuration statistics',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete('cache/validation')
  @Roles('admin')
  @ApiOperation({
    summary: 'Clear validation cache',
    description: 'Clear the configuration validation cache',
  })
  @ApiResponse({ status: 200, description: 'Validation cache cleared successfully' })
  async clearValidationCache() {
    try {
      this.validationService.clearValidationCache();

      return {
        success: true,
        message: 'Validation cache cleared successfully',
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`Failed to clear validation cache: ${error.message}`, error.stack);
      throw new HttpException({
        success: false,
        error: 'Failed to clear validation cache',
        details: error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}

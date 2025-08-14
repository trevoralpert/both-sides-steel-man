import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { RbacModule } from '../auth/rbac/rbac.module';
import { CommonModule } from '../common/common.module';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { SurveyValidationService } from './validators/survey-validation.service';
import { SurveyQualityService } from './validators/survey-quality.service';
import { SurveyErrorHandlerService } from './error-handling/survey-error-handler.service';
import { SurveyMonitoringService } from './monitoring/survey-monitoring.service';
import { CompletionTrackingService } from './services/completion-tracking.service';
import { CompletionTrackingController } from './controllers/completion-tracking.controller';
import { CompletionSchedulerService } from './services/completion-scheduler.service';

@Module({
  imports: [PrismaModule, RbacModule, CommonModule, ScheduleModule.forRoot()],
  controllers: [
    SurveysController,
    CompletionTrackingController,
  ],
  providers: [
    SurveysService,
    SurveyValidationService,
    SurveyQualityService,
    SurveyErrorHandlerService,
    SurveyMonitoringService,
    CompletionTrackingService,
    CompletionSchedulerService,
  ],
  exports: [
    SurveysService,
    SurveyValidationService,
    SurveyQualityService,
    SurveyErrorHandlerService,
    SurveyMonitoringService,
    CompletionTrackingService,
    CompletionSchedulerService,
  ],
})
export class SurveysModule {}



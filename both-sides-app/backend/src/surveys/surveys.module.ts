import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { RbacModule } from '../auth/rbac/rbac.module';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { SurveyValidationService } from './validators/survey-validation.service';
import { SurveyQualityService } from './validators/survey-quality.service';
import { SurveyErrorHandlerService } from './error-handling/survey-error-handler.service';
import { SurveyMonitoringService } from './monitoring/survey-monitoring.service';

@Module({
  imports: [PrismaModule, RbacModule, ScheduleModule.forRoot()],
  controllers: [SurveysController],
  providers: [
    SurveysService,
    SurveyValidationService,
    SurveyQualityService,
    SurveyErrorHandlerService,
    SurveyMonitoringService,
  ],
  exports: [
    SurveysService,
    SurveyValidationService,
    SurveyQualityService,
    SurveyErrorHandlerService,
    SurveyMonitoringService,
  ],
})
export class SurveysModule {}



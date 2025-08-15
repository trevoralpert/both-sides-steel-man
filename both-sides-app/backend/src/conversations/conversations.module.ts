import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CommonModule } from '../common/common.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './services/messages.service';
import { MessageValidationService } from './services/message-validation.service';
import { ThreadManagementService } from './services/thread-management.service';
import { MessageHistoryService } from './services/message-history.service';
import { ContentFormattingService } from './services/content-formatting.service';
import { LinkPreviewService } from './services/link-preview.service';
import { AttachmentService } from './services/attachment.service';
import { MessageBroadcastService } from './services/message-broadcast.service';
import { DebatePhaseService } from './services/debate-phase.service';
import { MessageAnalysisService } from './services/message-analysis.service';
import { AutoModerationService } from './services/auto-moderation.service';
import { AICoachingService } from './services/ai-coaching.service';
import { MessageAnalysisController } from './message-analysis.controller';
import { ModerationController } from './moderation.controller';
import { AICoachingController } from './ai-coaching.controller';
import { RichContentController } from './rich-content.controller';
import { ContentSafetyService } from './services/content-safety.service';
import { ContentSafetyController } from './content-safety.controller';
import { DebateAnalyticsService } from './services/debate-analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [PrismaModule, RealtimeModule, CommonModule],
  controllers: [ConversationsController, MessageAnalysisController, ModerationController, AICoachingController, RichContentController, ContentSafetyController, AnalyticsController],
  providers: [
    ConversationsService,
    MessagesService,
    MessageBroadcastService,
    DebatePhaseService,
    MessageValidationService,
    ThreadManagementService,
    MessageHistoryService,
    ContentFormattingService,
    LinkPreviewService,
    AttachmentService,
    MessageAnalysisService,
    AutoModerationService,
    AICoachingService,
    ContentSafetyService,
    DebateAnalyticsService,
  ],
  exports: [
    ConversationsService,
    MessagesService,
    MessageBroadcastService,
    DebatePhaseService,
    MessageValidationService,
    ThreadManagementService,
    MessageHistoryService,
    ContentFormattingService,
    LinkPreviewService,
    AttachmentService,
    MessageAnalysisService,
    AutoModerationService,
    AICoachingService,
    ContentSafetyService,
    DebateAnalyticsService,
  ],
})
export class ConversationsModule {}

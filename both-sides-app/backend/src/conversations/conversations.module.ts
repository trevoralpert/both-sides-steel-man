import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
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
import { RichContentController } from './rich-content.controller';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [ConversationsController, RichContentController],
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
  ],
})
export class ConversationsModule {}

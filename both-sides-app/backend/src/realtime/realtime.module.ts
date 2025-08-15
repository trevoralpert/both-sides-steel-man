import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AblyConfigService } from './ably-config.service';
import { ConnectionManagerService } from './connection-manager.service';
import { MessageRoutingService } from './services/message-routing.service';
import { MessageDeliveryConfirmationService } from './services/message-delivery-confirmation.service';
import { MessageOrderingService } from './services/message-ordering.service';
import { PresenceService } from './services/presence.service';
import { TypingIndicatorService } from './services/typing-indicator.service';
import { ConnectionQualityService } from './services/connection-quality.service';
import { PresenceIntegrationService } from './services/presence-integration.service';
import { RealtimeController } from './realtime.controller';

@Module({
  imports: [ConfigModule],
  controllers: [RealtimeController],
  providers: [
    AblyConfigService, 
    ConnectionManagerService, 
    MessageOrderingService,
    MessageDeliveryConfirmationService,
    MessageRoutingService,
    PresenceService,
    TypingIndicatorService,
    ConnectionQualityService,
    PresenceIntegrationService,
  ],
  exports: [
    AblyConfigService, 
    ConnectionManagerService, 
    MessageRoutingService,
    MessageDeliveryConfirmationService,
    MessageOrderingService,
    PresenceService,
    TypingIndicatorService,
    ConnectionQualityService,
    PresenceIntegrationService,
  ],
})
export class RealtimeModule {}

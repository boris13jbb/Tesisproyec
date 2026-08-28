import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExpiryNotificationScheduler } from './expiry-notification.scheduler';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [PrismaModule, MailModule, AuditoriaModule],
  controllers: [NotificationsController],
  providers: [NotificationService, ExpiryNotificationScheduler],
  exports: [NotificationService],
})
export class NotificationsModule {}

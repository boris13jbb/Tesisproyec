import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtRequestUser } from '../auth/request-user';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationService) {}

  @Get()
  list(
    @Req() req: Request & { user: JwtRequestUser },
    @Query('limit') limit?: string,
  ) {
    const n = limit ? Number(limit) : 30;
    return this.service.listForUser(req.user.id, n);
  }

  @Patch('read-all')
  @HttpCode(204)
  async markAllRead(@Req() req: Request & { user: JwtRequestUser }) {
    await this.service.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  @HttpCode(204)
  async markRead(
    @Req() req: Request & { user: JwtRequestUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.markRead(req.user.id, id);
  }
}

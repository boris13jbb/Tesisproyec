import {
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtRequestUser } from '../auth/request-user';
import { jwtUserIsAdmin } from '../auth/request-user';
import { MysqlDumpBackupService } from './mysql-dump-backup.service';

@Controller('backup')
@UseGuards(JwtAuthGuard)
export class BackupController {
  constructor(private readonly dump: MysqlDumpBackupService) {}

  /**
   * Ejecuta el mismo flujo que el cron (mysqldump + ZIP opcional). Puede tardar minutos.
   */
  @Post('admin/run-now')
  @HttpCode(200)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async runNow(
    @Req() req: Request & { user: JwtRequestUser },
  ): Promise<{ ok: boolean; skipped?: boolean }> {
    if (!jwtUserIsAdmin(req.user)) {
      throw new ForbiddenException();
    }
    return this.dump.runAutomatedBackup('manual');
  }
}

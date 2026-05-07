import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BackupController } from './backup.controller';
import { BackupSchedulerService } from './backup-scheduler.service';
import { MysqlDumpBackupService } from './mysql-dump-backup.service';

@Module({
  imports: [AuthModule],
  controllers: [BackupController],
  providers: [MysqlDumpBackupService, BackupSchedulerService],
  exports: [MysqlDumpBackupService],
})
export class BackupModule {}

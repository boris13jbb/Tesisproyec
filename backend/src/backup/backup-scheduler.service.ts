import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MysqlDumpBackupService } from './mysql-dump-backup.service';

@Injectable()
export class BackupSchedulerService implements OnModuleInit {
  private readonly log = new Logger(BackupSchedulerService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
    private readonly dump: MysqlDumpBackupService,
  ) {}

  onModuleInit(): void {
    const enabled =
      this.config.get<string>('BACKUP_AUTOMATED_ENABLED')?.toLowerCase() ===
      'true';
    const cronExpr =
      this.config.get<string>('BACKUP_AUTOMATED_CRON')?.trim() || '0 3 * * *';
    const dumpPath = this.config.get<string>('BACKUP_MYSQLDUMP_PATH')?.trim();

    if (!enabled) {
      this.log.log(
        'Respaldo automático desactivado (defina BACKUP_AUTOMATED_ENABLED=true para activar).',
      );
      return;
    }

    if (!dumpPath) {
      this.log.error(
        'BACKUP_AUTOMATED_ENABLED=true pero falta BACKUP_MYSQLDUMP_PATH; no se registrará cron.',
      );
      return;
    }

    const jobName = 'sgd_automated_mysql_backup';
    const job = new CronJob(cronExpr, () => {
      void this.dump.runAutomatedBackup('cron').catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'error';
        this.log.error(`Respaldo automático no controlado: ${msg}`);
      });
    });
    this.registry.addCronJob(jobName, job);
    job.start();
    this.log.warn(
      `Respaldo MySQL automático ACTIVO — cron "${cronExpr}". Artefactos según BACKUP_OUTPUT_DIR; evidencia en auditoría BACKUP_VERIFIED.`,
    );
  }
}

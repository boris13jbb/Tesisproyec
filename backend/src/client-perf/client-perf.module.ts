import { Module } from '@nestjs/common';
import { ClientPerfController } from './client-perf.controller';

@Module({
  controllers: [ClientPerfController],
})
export class ClientPerfModule {}

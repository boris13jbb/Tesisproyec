import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SubseriesController } from './subseries.controller';
import { SubseriesService } from './subseries.service';

@Module({
  imports: [AuthModule],
  controllers: [SubseriesController],
  providers: [SubseriesService],
})
export class SubseriesModule {}

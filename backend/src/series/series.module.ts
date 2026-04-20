import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';

@Module({
  imports: [AuthModule],
  controllers: [SeriesController],
  providers: [SeriesService],
})
export class SeriesModule {}

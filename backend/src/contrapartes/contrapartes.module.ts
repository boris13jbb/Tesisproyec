import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContrapartesController } from './contrapartes.controller';
import { ContrapartesService } from './contrapartes.service';

@Module({
  imports: [AuthModule],
  controllers: [ContrapartesController],
  providers: [ContrapartesService],
  exports: [ContrapartesService],
})
export class ContrapartesModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BeneficiariosController } from './beneficiarios.controller';
import { BeneficiariosService } from './beneficiarios.service';

@Module({
  imports: [AuthModule],
  controllers: [BeneficiariosController],
  providers: [BeneficiariosService],
  exports: [BeneficiariosService],
})
export class BeneficiariosModule {}

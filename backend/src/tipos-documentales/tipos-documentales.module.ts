import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TiposDocumentalesController } from './tipos-documentales.controller';
import { TiposDocumentalesService } from './tipos-documentales.service';

@Module({
  imports: [AuthModule],
  controllers: [TiposDocumentalesController],
  providers: [TiposDocumentalesService],
})
export class TiposDocumentalesModule {}

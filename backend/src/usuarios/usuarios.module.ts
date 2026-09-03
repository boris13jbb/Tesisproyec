import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CargosModule } from '../cargos/cargos.module';
import { MailModule } from '../mail/mail.module';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [AuthModule, MailModule, CargosModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}

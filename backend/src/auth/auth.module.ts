import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaTotpService } from './mfa-totp.service';
import { PasswordPolicyService } from './password-policy.service';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailModule } from '../mail/mail.module';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordPolicyService,
    MfaTotpService,
    JwtStrategy,
    RolesGuard,
    PermissionsService,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    PasswordPolicyService,
    RolesGuard,
    PermissionsService,
    PermissionsGuard,
  ],
})
export class AuthModule {}

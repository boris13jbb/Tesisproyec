import { IsString, Length, Matches } from 'class-validator';

export class MfaVerifyLoginDto {
  @IsString()
  @Length(32, 128)
  challengeToken!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}

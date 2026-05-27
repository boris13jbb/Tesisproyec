import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class MfaSetupConfirmDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code!: string;

  /** Enrolamiento durante login (sin JWT). */
  @IsOptional()
  @IsString()
  @Length(32, 128)
  setupChallengeToken?: string;
}

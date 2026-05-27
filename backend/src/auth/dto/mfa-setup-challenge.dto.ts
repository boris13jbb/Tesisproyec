import { IsString, Length } from 'class-validator';

export class MfaSetupChallengeDto {
  @IsString()
  @Length(32, 128)
  setupChallengeToken!: string;
}

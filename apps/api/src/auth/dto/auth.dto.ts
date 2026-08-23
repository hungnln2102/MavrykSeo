import { IsEmail, IsString, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class RequestMagicLinkDto {
  @IsEmail()
  email: string;
}

export class LoginWithMagicTokenDto {
  @IsString()
  token: string;
}

export class RotateSessionDto {
  @IsString()
  refreshToken: string;
}

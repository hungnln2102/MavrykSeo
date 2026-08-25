import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

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

export class RegisterWithPasswordDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'Username chỉ được chứa chữ thường, số, dấu gạch dưới và gạch ngang',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/(?=.*[A-Z])/, { message: 'Mật khẩu phải có ít nhất 1 chữ hoa' })
  @Matches(/(?=.*\d)/, { message: 'Mật khẩu phải có ít nhất 1 số' })
  password: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class LoginWithPasswordDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

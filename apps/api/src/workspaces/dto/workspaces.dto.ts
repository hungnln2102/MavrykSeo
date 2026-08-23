import { IsString, IsNotEmpty, IsEmail, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;
}

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  role: string;
}

export class UpdateWorkspaceStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class UpdateWorkspacePlanDto {
  @IsString()
  @IsNotEmpty()
  plan: string;
}

export class WorkspaceColorsDto {
  @IsString()
  @IsNotEmpty()
  primary: string;

  @IsString()
  @IsNotEmpty()
  secondary: string;
}

export class UpdateWhiteLabelDto {
  @IsString()
  @IsNotEmpty()
  logo: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WorkspaceColorsDto)
  colors: WorkspaceColorsDto;
}

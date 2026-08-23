import { IsString, IsNotEmpty, IsUUID, IsOptional, IsBoolean, IsArray, IsDateString } from 'class-validator';

export class CreateActionDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string | null;

  @IsDateString()
  @IsOptional()
  dueAt?: string | null;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  findingIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  dependencies?: string[];
}

export class UpdateActionStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class CreateActionCommentDto {
  @IsString()
  @IsNotEmpty()
  comment: string;

  @IsBoolean()
  @IsOptional()
  isClientVisible?: boolean;
}

export class CreateActionApprovalDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateActionVerificationDto {
  @IsString()
  @IsNotEmpty()
  result: string;

  @IsString()
  @IsNotEmpty()
  criteriaSnapshot: string;

  @IsString()
  @IsNotEmpty()
  evidence: string;
}

import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsOptional()
  parentId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];
}

export class CreateContentPlanDto {
  @IsUUID()
  @IsOptional()
  topicId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  primaryKeyword: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryKeywords?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}

export class UpdateContentPlanDto {
  @IsUUID()
  @IsOptional()
  topicId?: string | null;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  primaryKeyword?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryKeywords?: string[];

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  dueDate?: string | null;

  @IsString()
  @IsOptional()
  body?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string | null;

  @IsString()
  @IsOptional()
  publishUrl?: string | null;
}

export class ImportUrlDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  primaryKeyword: string;

  @IsUUID()
  @IsOptional()
  topicId?: string;
}

export class OptimizeContentDto {
  @IsString()
  @IsNotEmpty()
  bodyText: string;
}

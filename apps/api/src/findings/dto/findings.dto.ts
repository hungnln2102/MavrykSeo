import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray } from 'class-validator';

export class CreateFindingDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  controlCode: string;

  @IsString()
  @IsNotEmpty()
  rootCauseKey: string;

  @IsString()
  @IsNotEmpty()
  normalizedScopeHash: string;

  @IsString()
  @IsNotEmpty()
  severity: string;

  @IsString()
  @IsOptional()
  confidence?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  affectedUrls?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  observations?: string[];
}

export class UpdateFindingStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class CreateObservationDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  sourceType: string;

  @IsString()
  @IsNotEmpty()
  sourceRef: string;

  @IsString()
  @IsNotEmpty()
  classification: string;

  @IsOptional()
  data?: any;
}

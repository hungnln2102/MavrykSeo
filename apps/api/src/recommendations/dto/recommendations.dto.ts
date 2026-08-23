import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class UpdateRecommendationStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}

export class UpdateRecommendationAssigneeDto {
  @IsOptional()
  @IsUUID()
  assigneeId: string | null;
}

export class UpdateRecommendationNotesDto {
  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @IsOptional()
  @IsString()
  clientNotes?: string | null;
}

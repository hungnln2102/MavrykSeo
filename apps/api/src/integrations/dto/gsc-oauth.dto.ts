import { IsString, IsOptional } from 'class-validator';

export class SelectPropertyDto {
  @IsString()
  @IsOptional()
  siteUrl?: string;
}

export class RequestSyncDto {
  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}

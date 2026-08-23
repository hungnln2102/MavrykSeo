import { IsUUID, IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';

export class CreateSiteDto {
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  domain: string;
}

export class UpdateCrawlScheduleDto {
  @IsOptional()
  @IsInt()
  @Min(60)
  crawlScheduleMinutes?: number | null;
}

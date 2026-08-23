import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class AddKeywordDto {
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @IsString()
  @IsOptional()
  targetUrl?: string;
}

export class ResearchKeywordDto {
  @IsString()
  @IsNotEmpty()
  keyword: string;
}

export class ClusterKeywordsDto {
  @IsArray()
  @IsString({ each: true })
  keywords: string[];
}

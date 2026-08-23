import { IsString, IsNotEmpty, IsOptional, IsObject, IsUUID } from 'class-validator';

export class CreateAuditRunDto {
  @IsUUID()
  @IsNotEmpty()
  standardVersionId: string;

  @IsOptional()
  @IsObject()
  scopeSnapshot?: any;
}

export class VerifyControlResultDto {
  @IsString()
  @IsNotEmpty()
  result: string;

  @IsOptional()
  @IsString()
  exceptionReason?: string;
}

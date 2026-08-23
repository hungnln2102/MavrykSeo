import { IsObject, IsNotEmpty } from 'class-validator';

export class SaveIntegrationDto {
  @IsObject()
  @IsNotEmpty()
  credentials: any;
}

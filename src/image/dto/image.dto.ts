import { IsOptional, IsString, Length } from "class-validator";

export class ImageDto {
  @IsOptional()
  @IsString()
  @Length(3, 50)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  description?: string;
}

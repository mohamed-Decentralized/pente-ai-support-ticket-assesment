import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TrendsQueryDto {
  @ApiProperty({ default: 7, minimum: 1, maximum: 90 })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(90)
  days = 7;
}

export class ExternalCustomerDto {
  @ApiProperty({ example: 'Alice Customer' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;
}

export class WebhookPreviewDto {
  @ApiProperty({ example: 'external-123' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  externalId!: string;

  @ApiProperty({ type: ExternalCustomerDto })
  @ValidateNested()
  @Type(() => ExternalCustomerDto)
  customer!: ExternalCustomerDto;

  @ApiProperty({ example: 'Unable to access account' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @ApiProperty({ example: 'The customer receives an access denied response.' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ required: false, enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  urgency?: string;
}

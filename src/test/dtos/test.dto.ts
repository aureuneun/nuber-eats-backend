import { ArgsType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

@ArgsType()
export class CreateDto {
  @Field(() => String)
  @IsString()
  @Length(5, 10)
  name: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  isGood?: boolean;

  @Field(() => String)
  @IsString()
  address: string;
}

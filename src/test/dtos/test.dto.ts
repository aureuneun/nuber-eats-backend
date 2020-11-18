import {
  ArgsType,
  Field,
  InputType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import { Test } from '../entities/test.entity';

@InputType()
export class CreateDto extends OmitType(Test, ['id']) {}

@InputType()
class UpdateType extends PartialType(CreateDto) {}

@ArgsType()
export class UpdateDto {
  @Field((type) => Number)
  id: number;

  @Field((type) => UpdateType)
  data: UpdateType;
}

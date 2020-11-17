import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Test {
  @Field(() => String)
  name: string;

  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;

  @Field(() => String)
  address: string;
}
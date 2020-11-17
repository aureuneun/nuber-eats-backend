import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateDto } from './dtos/test.dto';
import { Test } from './entities/test.entity';

@Resolver(() => Test)
export class TestResolver {
  @Query(() => [Test])
  myTest(@Args('arg') arg: boolean): Test[] {
    return [];
  }

  @Mutation(() => Boolean)
  create(@Args() createInput: CreateDto): boolean {
    return true;
  }
}

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateDto, UpdateDto } from './dtos/test.dto';
import { Test } from './entities/test.entity';
import { TestService } from './test.service';

@Resolver((of) => Test)
export class TestResolver {
  constructor(private readonly testService: TestService) {}

  @Query((returns) => [Test])
  getAll(): Promise<Test[]> {
    return this.testService.getAll();
  }

  @Mutation((returns) => Boolean)
  async create(@Args('input') createDto: CreateDto): Promise<boolean> {
    try {
      await this.testService.create(createDto);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  @Mutation((returns) => Boolean)
  async update(@Args() updateDto: UpdateDto): Promise<boolean> {
    try {
      await this.testService.update(updateDto);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}

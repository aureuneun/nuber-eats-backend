import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDto, UpdateDto } from './dtos/test.dto';
import { Test } from './entities/test.entity';

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(Test) private readonly tests: Repository<Test>,
  ) {}

  getAll(): Promise<Test[]> {
    return this.tests.find();
  }

  create(createDto: CreateDto): Promise<Test> {
    const newTest = this.tests.create(createDto);
    return this.tests.save(newTest);
  }

  update({ id, data }: UpdateDto) {
    return this.tests.update(id, { ...data });
  }
}

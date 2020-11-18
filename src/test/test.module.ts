import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Test } from './entities/test.entity';
import { TestResolver } from './test.resolver';
import { TestService } from './test.service';

@Module({
  imports: [TypeOrmModule.forFeature([Test])],
  providers: [TestResolver, TestService],
})
export class TestModule {}

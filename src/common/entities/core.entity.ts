import { Field } from '@nestjs/graphql';
import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export class Core {
  @Field((type) => Number)
  @PrimaryGeneratedColumn()
  id: number;

  @Field((type) => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field((type) => Date)
  @UpdateDateColumn()
  updatedAt: Date;
}

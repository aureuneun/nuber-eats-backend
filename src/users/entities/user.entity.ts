import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { Core } from 'src/common/entities/core.entity';
import * as bcrypt from 'bcrypt';
import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { IsEmail, IsEnum, IsString } from 'class-validator';

enum UserRole {
  client,
  owner,
  delivery,
}

registerEnumType(UserRole, { name: 'UserRole' });

@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class User extends Core {
  @Field((type) => String)
  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Field((type) => String)
  @Column({ select: false })
  @IsString()
  password: string;

  @Field((type) => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @Field((type) => Boolean, { defaultValue: false })
  @Column({ default: false })
  verified: boolean;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      try {
        this.password = await bcrypt.hash(this.password, 10);
      } catch (error) {
        console.log(error);
        throw new InternalServerErrorException();
      }
    }
  }

  async checkPassword(aPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(aPassword, this.password);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }
}

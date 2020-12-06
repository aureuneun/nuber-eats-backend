import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getConnection, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Verification } from 'src/users/entities/verification.entity';

const GRAPHQL_ENDPOINT = '/graphql';

const testUser = {
  email: 'hello@gmail.com',
  password: '1234',
};

jest.mock('got', () => {
  return {
    post: jest.fn(),
  };
});

describe('UsersModule (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let users: Repository<User>;
  let verifications: Repository<Verification>;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    users = module.get<Repository<User>>(getRepositoryToken(User));
    verifications = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    app.close();
  });

  describe('createAccount', () => {
    it('should create account', () => {
      return publicTest(`
        mutation {
          createAccount(input:{
            email: "${testUser.email}"
            password: "${testUser.password}"
            role: client
          }) {
            ok
            error
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createAccount: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return publicTest(`
        mutation {
          createAccount(input:{
            email: "${testUser.email}"
            password: "${testUser.password}"
            role: client
          }) {
            ok
            error
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                createAccount: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('There is a user with that email already');
        });
    });
  });

  describe('login', () => {
    it('should return token if the password correct', () => {
      return publicTest(`
        mutation {
          login(input:{
            email: "${testUser.email}"
            password: "${testUser.password}"
          }) {
            ok
            error
            token
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                login: { ok, error, token },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(token).toEqual(expect.any(String));
          jwtToken = token;
        });
    });

    it('should fail if the password is wrong', () => {
      return publicTest(`
        mutation {
          login(input:{
            email: "${testUser.email}"
            password: "wrong"
          }) {
            ok
            error
            token
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                login: { ok, error, token },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Wrong password');
          expect(token).toBe(null);
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;

    beforeAll(async () => {
      const [user] = await users.find();
      userId = user.id;
    });

    it('should find a user', () => {
      return privateTest(`
        query {
          userProfile(userId:${userId}) {
            ok
            error
            user {
              id
            }
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { id },
                },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
          expect(id).toBe(userId);
        });
    });

    it('should not find user', () => {
      return privateTest(`
        query {
          userProfile(userId:${userId + 1}) {
            ok
            error
            user {
              id
            }
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('User not found');
          expect(user).toBe(null);
        });
    });
  });

  describe('me', () => {
    it('should find my profile', () => {
      return privateTest(`
        query {
          me {
            email
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(testUser.email);
        });
    });

    it('should not allow logged out user', () => {
      return publicTest(`
        query {
          me {
            email
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: { errors },
          } = res;
          const [error] = errors;
          expect(error.message).toBe('Forbidden resource');
        });
    });
  });

  describe('editProfile', () => {
    const NEW_EMAIL = 'hello@new.com';

    it('should change email', () => {
      return privateTest(`
        mutation {
          editProfile(input:{
            email: "${NEW_EMAIL}"
          }) {
            ok
            error
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should have new email', () => {
      return privateTest(`
        query {
          me {
            email
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res;
          expect(email).toBe(NEW_EMAIL);
        });
    });
  });

  describe('verifyEmail', () => {
    let code: string;

    beforeAll(async () => {
      const [verification] = await verifications.find();
      code = verification.code;
    });

    it('should verify email', () => {
      return publicTest(`
        mutation {
          verifyEmail(input:{
            code: "${code}"
          }) {
            ok
            error
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if verification code is wrong', () => {
      return publicTest(`
        mutation {
          verifyEmail(input:{
            code: "${code}"
          }) {
            ok
            error
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res;
          expect(ok).toBe(false);
          expect(error).toBe('Verification not found');
        });
    });
  });
});

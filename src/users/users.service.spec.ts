import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UsersService } from './users.service';
import { JwtService } from 'src/jwt/jwt.service';
import { MailService } from 'src/mail/mail.service';
import { Repository } from 'typeorm';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
  delete: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(() => 'token'),
  verify: jest.fn(),
});

const mockMailService = () => ({
  sendVerificationEmail: jest.fn(),
});

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let usersService: UsersService;
  let mailService: MailService;
  let jwtService: JwtService;
  let users: MockRepository<User>;
  let verifications: MockRepository<Verification>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    mailService = module.get<MailService>(MailService);
    jwtService = module.get<JwtService>(JwtService);
    users = module.get(getRepositoryToken(User));
    verifications = module.get(getRepositoryToken(Verification));
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  it.todo('todo');

  describe('createAccount', () => {
    const createAccountArgs = {
      email: 'hello@gmail.com',
      password: '1234',
      role: 0,
    };

    it('should fail if user exists', async () => {
      users.findOne.mockResolvedValue({ id: 1, email: 'hello@gmail.com' });

      const result = await usersService.createAccount(createAccountArgs);

      expect(result).toMatchObject({
        ok: false,
        error: 'There is a user with that email already',
      });
    });

    it('should create new user', async () => {
      users.findOne.mockResolvedValue(undefined);
      users.create.mockReturnValue(createAccountArgs);
      users.save.mockResolvedValue(createAccountArgs);
      verifications.create.mockReturnValue({ code: 'code' });
      verifications.save.mockResolvedValue({ code: 'code' });

      const result = await usersService.createAccount(createAccountArgs);

      expect(users.create).toHaveBeenCalledTimes(1);
      expect(users.create).toHaveBeenCalledWith(createAccountArgs);

      expect(users.save).toHaveBeenCalledTimes(1);
      expect(users.save).toHaveBeenCalledWith(createAccountArgs);

      expect(verifications.create).toHaveBeenCalledTimes(1);
      expect(verifications.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });

      expect(verifications.save).toHaveBeenCalledTimes(1);
      expect(verifications.save).toHaveBeenCalledWith({ code: 'code' });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );

      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      users.findOne.mockRejectedValue(new Error());

      const result = await usersService.createAccount(createAccountArgs);

      expect(result).toEqual({ ok: false, error: 'Could not create account' });
    });
  });

  describe('login', () => {
    const loginArgs = {
      email: 'hello@gmail.com',
      password: '1234',
    };

    it('should fail if user does not exist', async () => {
      users.findOne.mockResolvedValue(null);

      const result = await usersService.login(loginArgs);

      expect(users.findOne).toHaveBeenCalledTimes(1);
      expect(users.findOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
      );

      expect(result).toEqual({ ok: false, error: 'User not found' });
    });

    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      users.findOne.mockResolvedValue(mockedUser);

      const result = await usersService.login(loginArgs);

      expect(result).toEqual({ ok: false, error: 'Wrong password' });
    });

    it('should return token if the password correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      users.findOne.mockResolvedValue(mockedUser);

      const result = await usersService.login(loginArgs);

      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object));

      expect(result).toEqual({ ok: true, token: 'token' });
    });

    it('should fail on exception', async () => {
      users.findOne.mockRejectedValue(new Error());

      const result = await usersService.login(loginArgs);

      expect(result).toEqual({ ok: false, error: 'Could not log in' });
    });
  });

  describe('findById', () => {
    const findByIdArgs = {
      id: 1,
    };

    it('should find an existing user', async () => {
      users.findOneOrFail.mockResolvedValue(findByIdArgs);

      const result = await usersService.findById(1);

      expect(result).toEqual({ ok: true, user: findByIdArgs });
    });

    it('should fail on exception', async () => {
      users.findOneOrFail.mockRejectedValue(new Error());

      const result = await usersService.findById(1);

      expect(result).toEqual({ ok: false, error: 'User not found' });
    });
  });

  describe('editProfile', () => {
    it('should change email', async () => {
      const editProfileArgs = {
        userId: 1,
        input: {
          email: 'hello@new.com',
        },
      };
      const mockedUser = {
        email: 'hello@old.com',
        verified: true,
      };
      const user = {
        email: editProfileArgs.input.email,
        verified: false,
      };
      const verification = {
        code: 'code',
      };

      users.findOne.mockResolvedValue(mockedUser);
      verifications.create.mockReturnValue(verification);
      verifications.save.mockResolvedValue(verification);

      const result = await usersService.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(users.findOne).toHaveBeenCalledTimes(1);
      expect(users.findOne).toHaveBeenCalledWith(editProfileArgs.userId);

      expect(verifications.create).toHaveBeenCalledTimes(1);
      expect(verifications.create).toHaveBeenCalledWith({ user });

      expect(verifications.save).toHaveBeenCalledTimes(1);
      expect(verifications.save).toHaveBeenCalledWith(verification);

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        user.email,
        verification.code,
      );

      expect(users.save).toHaveBeenCalledTimes(1);
      expect(users.save).toHaveBeenCalledWith(user);

      expect(result).toEqual({ ok: true });
    });

    it('should change password', async () => {
      const editProfileArgs = {
        userId: 1,
        input: {
          password: '12345',
        },
      };
      const mockedUser = {
        password: '1234',
      };
      const user = {
        password: editProfileArgs.input.password,
      };

      users.findOne.mockResolvedValue(mockedUser);

      const result = await usersService.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(users.save).toHaveBeenCalledTimes(1);
      expect(users.save).toHaveBeenCalledWith(user);

      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      users.findOne.mockRejectedValue(new Error());

      const result = await usersService.editProfile(
        expect.any(Number),
        expect.any(Object),
      );

      expect(result).toEqual({ ok: false, error: 'Could not update profile' });
    });
  });

  describe('verifyEmail', () => {
    const verification = {
      code: 'code',
    };

    it('should fail if verification does exist', async () => {
      verifications.findOne.mockResolvedValue(undefined);

      const result = await usersService.verifyEmail(verification);

      expect(result).toEqual({ ok: false, error: 'Verification not found' });
    });

    it('should verify email', async () => {
      const mockedVerification = {
        user: {
          verified: false,
        },
        id: 1,
      };

      verifications.findOne.mockResolvedValue(mockedVerification);

      const result = await usersService.verifyEmail(verification);

      expect(verifications.findOne).toHaveBeenCalledTimes(1);
      expect(verifications.findOne).toHaveBeenCalledWith(
        verification,
        expect.any(Object),
      );

      expect(users.save).toHaveBeenCalledTimes(1);
      expect(users.save).toHaveBeenCalledWith({ verified: true });

      expect(verifications.delete).toHaveBeenCalledTimes(1);
      expect(verifications.delete).toHaveBeenCalledWith(mockedVerification.id);

      expect(result).toEqual({ ok: true });
    });

    it('should fail on exception', async () => {
      verifications.findOne.mockRejectedValue(new Error());

      const result = await usersService.verifyEmail(verification);

      expect(result).toEqual({ ok: false, error: 'Could not verify email' });
    });
  });
});

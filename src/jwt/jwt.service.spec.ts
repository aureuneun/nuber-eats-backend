import { Test } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { JwtService } from './jwt.service';

const PRIVATE_KEY = 'privateKey';
const TOKEN = 'token';
const payload = {
  id: 1,
};

jest.mock('jsonwebtoken', () => {
  return {
    sign: jest.fn(() => TOKEN),
    verify: jest.fn(() => payload),
  };
});

describe('JwtService', () => {
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: CONFIG_OPTIONS,
          useValue: { privateKey: PRIVATE_KEY },
        },
      ],
    }).compile();

    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(jwtService).toBeDefined();
  });

  describe('sign', () => {
    it('should return a signed token', () => {
      const token = jwtService.sign(payload);

      expect(jwt.sign).toHaveBeenCalledTimes(1);
      expect(jwt.sign).toHaveBeenCalledWith(payload, PRIVATE_KEY);

      expect(token).toEqual(TOKEN);
    });
  });

  describe('verify', () => {
    it('should return the decoded', () => {
      const decoded = jwtService.verify(TOKEN);

      expect(jwt.verify).toHaveBeenCalledTimes(1);
      expect(jwt.verify).toHaveBeenCalledWith(TOKEN, PRIVATE_KEY);

      expect(decoded).toEqual(payload);
    });
  });
});

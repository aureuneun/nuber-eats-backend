import { Test } from '@nestjs/testing';
import got from 'got';
import * as FormData from 'form-data';
import { CONFIG_OPTIONS } from 'src/common/common.constants';
import { MailService } from './mail.service';

const DOMAIN = 'mailgun@mail.com';

jest.mock('got');
jest.mock('form-data');

describe('MailService', () => {
  let mailService: MailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: 'apiKey',
            domain: DOMAIN,
            fromEmail: 'yesky85@nate.com',
          },
        },
      ],
    }).compile();

    mailService = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(mailService).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should send email', async () => {
      const form = jest.spyOn(FormData.prototype, 'append');

      const ok = await mailService.sendEmail('', '', '', '');

      expect(form).toHaveBeenCalledTimes(5);

      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${DOMAIN}/messages`,
        expect.any(Object),
      );

      expect(ok).toEqual(true);
    });

    it('should fail on exception', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw new Error();
      });

      const ok = await mailService.sendEmail('', '', '', '');

      expect(ok).toEqual(false);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should call sendEmail', () => {
      const sendVerificationEmailArgs = {
        username: 'hello@gmail.com',
        code: 'code',
      };

      jest.spyOn(mailService, 'sendEmail').mockImplementation(async () => true);

      mailService.sendVerificationEmail(
        sendVerificationEmailArgs.username,
        sendVerificationEmailArgs.code,
      );

      expect(mailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendEmail).toHaveBeenCalledWith(
        'Verify Your Email',
        'verify-email',
        sendVerificationEmailArgs.username,
        sendVerificationEmailArgs.code,
      );
    });
  });
});

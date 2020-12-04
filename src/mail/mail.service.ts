import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from '../common/common.constants';
import { MailModuleOptions } from './mail.interfaces';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  async sendEmail(
    subject: string,
    template: string,
    username: string,
    code: string,
  ): Promise<boolean> {
    const form = new FormData();
    form.append('from', `KEC <mailgun@${this.options.domain}>`);
    form.append('to', 'yesky85@nate.com');
    form.append('subject', subject);
    form.append('template', template);
    form.append('h:X-Mailgun-Variables', JSON.stringify({ username, code }));

    try {
      await got.post(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`,
            ).toString('base64')}`,
          },
          body: form,
        },
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  sendVerificationEmail(username: string, code: string) {
    this.sendEmail('Verify Your Email', 'verify-email', username, code);
  }
}

import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from '../common/common.constants';
import { EmailVars, MailModuleOptions } from './mail.interfaces';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  private async sendEmail(
    to: string,
    subject: string,
    template: string,
    emailVars: EmailVars[],
  ) {
    const form = new FormData();
    form.append('from', `KEC <mailgun@${this.options.domain}>`);
    form.append('to', to);
    form.append('subject', subject);
    form.append('template', template);
    // form.append('v:username', 'you');
    // form.append('v:code', 'code')
    emailVars.forEach((eVar) => form.append(`v:${eVar.key}`, eVar.value));

    try {
      await got(`https://api.mailgun.net/v3/${this.options.domain}/messages`, {
        method: 'post',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `api:${this.options.apiKey}`,
          ).toString('base64')}`,
        },
        body: form,
      });
    } catch (error) {
      console.log(error);
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail(
      this.options.fromEmail,
      'Verify Your Email',
      'verify-email',
      [
        { key: 'username', value: email },
        { key: 'code', value: code },
      ],
    );
  }
}

import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  EasebuzzInitiatePayload,
  EasebuzzInitiateResponse,
  EasebuzzWebhookPayload,
} from './easebuzz.types';

@Injectable()
export class EasebuzzService {
  private readonly logger = new Logger(EasebuzzService.name);

  constructor(private readonly httpService: HttpService) {}

  private getBaseUrl(env: 'TEST' | 'PRODUCTION'): string {
    return env === 'PRODUCTION'
      ? 'https://pay.easebuzz.in'
      : 'https://testpay.easebuzz.in';
  }

  generateInitiationHash(params: {
    key: string;
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
    udf6?: string;
    udf7?: string;
    udf8?: string;
    udf9?: string;
    udf10?: string;
    salt: string;
  }): string {
    const { key, txnid, amount, productinfo, firstname, email, salt } = params;

    const udf1  = params.udf1  ?? '';
    const udf2  = params.udf2  ?? '';
    const udf3  = params.udf3  ?? '';
    const udf4  = params.udf4  ?? '';
    const udf5  = params.udf5  ?? '';
    const udf6  = params.udf6  ?? '';
    const udf7  = params.udf7  ?? '';
    const udf8  = params.udf8  ?? '';
    const udf9  = params.udf9  ?? '';
    const udf10 = params.udf10 ?? '';

    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
    const hashString = [
      key, txnid, amount, productinfo, firstname, email,
      udf1, udf2, udf3, udf4, udf5,
      udf6, udf7, udf8, udf9, udf10,
      salt,
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  verifyResponseHash(params: {
    key: string;
    salt: string;
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
    status: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
    udf6?: string;
    udf7?: string;
    udf8?: string;
    udf9?: string;
    udf10?: string;
    receivedHash: string;
  }): boolean {
    const { salt, status, email, firstname, productinfo, amount, txnid, key, receivedHash } = params;

    const udf1  = params.udf1  ?? '';
    const udf2  = params.udf2  ?? '';
    const udf3  = params.udf3  ?? '';
    const udf4  = params.udf4  ?? '';
    const udf5  = params.udf5  ?? '';
    const udf6  = params.udf6  ?? '';
    const udf7  = params.udf7  ?? '';
    const udf8  = params.udf8  ?? '';
    const udf9  = params.udf9  ?? '';
    const udf10 = params.udf10 ?? '';

    // salt|status|udf10|udf9|udf8|udf7|udf6|udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
    const hashString = [
      salt, status,
      udf10, udf9, udf8, udf7, udf6,
      udf5, udf4, udf3, udf2, udf1,
      email, firstname, productinfo, amount, txnid, key,
    ].join('|');

    const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');

    const isValid = expectedHash === receivedHash;
    if (!isValid) {
      this.logger.debug(
        `Hash mismatch.\nExpected: ${expectedHash}\nReceived: ${receivedHash}\nString:   ${hashString}`,
      );
    }
    return isValid;
  }

  async initiatePayment(payload: EasebuzzInitiatePayload): Promise<EasebuzzInitiateResponse> {
    const {
      key, salt, txnid, amount, productinfo,
      firstname, email, phone, surl, furl, environment,
    } = payload;

    const hash = this.generateInitiationHash({
      key, txnid, amount, productinfo, firstname, email,
      udf1:  payload.udf1,
      udf2:  payload.udf2,
      udf3:  payload.udf3,
      udf4:  payload.udf4,
      udf5:  payload.udf5,
      udf6:  payload.udf6,
      udf7:  payload.udf7,
      udf8:  payload.udf8,
      udf9:  payload.udf9,
      udf10: payload.udf10,
      salt,
    });

    const baseUrl = this.getBaseUrl(environment);

    const formData = new URLSearchParams();
    formData.append('key',         key);
    formData.append('txnid',       txnid);
    formData.append('amount',      amount);
    formData.append('productinfo', productinfo);
    formData.append('firstname',   firstname);
    formData.append('email',       email);
    formData.append('phone',       phone);
    formData.append('surl',        surl);
    formData.append('furl',        furl);
    formData.append('hash',        hash);

    // Always append all UDFs even if empty — must match what went into the hash
    formData.append('udf1',  payload.udf1  ?? '');
    formData.append('udf2',  payload.udf2  ?? '');
    formData.append('udf3',  payload.udf3  ?? '');
    formData.append('udf4',  payload.udf4  ?? '');
    formData.append('udf5',  payload.udf5  ?? '');
    formData.append('udf6',  payload.udf6  ?? '');
    formData.append('udf7',  payload.udf7  ?? '');
    formData.append('udf8',  payload.udf8  ?? '');
    formData.append('udf9',  payload.udf9  ?? '');
    formData.append('udf10', payload.udf10 ?? '');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/payment/initiateLink`,
          formData.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      );

      if (response.data.status !== 1) {
        this.logger.error(`EaseBuzz initiation failed: ${JSON.stringify(response.data)}`);
        throw new InternalServerErrorException(
          response.data.error_desc ?? 'Payment gateway initiation failed',
        );
      }

      const accessKey: string = response.data.data;
      return {
        accessKey,
        paymentUrl: `${baseUrl}/pay/${accessKey}`,
      };
    } catch (err: any) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error(`EaseBuzz HTTP error: ${err.message}`);
      throw new InternalServerErrorException('Unable to reach payment gateway');
    }
  }

  buildWebhookHashParams(webhook: EasebuzzWebhookPayload) {
    return {
      txnid:        webhook.txnid,
      amount:       webhook.amount,
      productinfo:  webhook.productinfo,
      firstname:    webhook.firstname,
      email:        webhook.email,
      status:       webhook.status,
      udf1:         webhook.udf1,
      udf2:         webhook.udf2,
      udf3:         webhook.udf3,
      udf4:         webhook.udf4,
      udf5:         webhook.udf5,
      udf6:         webhook.udf6,
      udf7:         webhook.udf7,
      udf8:         webhook.udf8,
      udf9:         webhook.udf9,
      udf10:        webhook.udf10,
      receivedHash: webhook.hash,
    };
  }
}
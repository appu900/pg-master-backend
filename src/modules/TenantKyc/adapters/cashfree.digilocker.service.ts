import {
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import * as forge from 'node-forge';
import * as fs from 'fs';
import * as crypto from 'crypto';

type DigilockerVerificationStatus = {
  status: string;
};

@Injectable()
export class CashfreeVerificationService {
  private readonly logger =
    new Logger(CashfreeVerificationService.name);

  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(
    private readonly httpService: HttpService,
  ) {
    this.baseUrl =
      `${process.env.CASHFREE_BASE_URL}/verification`;

    this.clientId =
      process.env.CASHFREE_CLIENT_ID ?? '';

    this.clientSecret =
      process.env.CASHFREE_CLIENT_SECRET ?? '';
  }


 private generateSignature(): string {
  const publicKey = fs.readFileSync(
    path.join(process.cwd(), 'keys', 'key.pem'),
    'utf8',
  );

  const timestamp = Math.floor(Date.now() / 1000);

  const payload = `${this.clientId}.${timestamp}`;

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha1', // OpenSSL default OAEP hash
    },
    Buffer.from(payload, 'utf8'),
  );

  return encrypted.toString('base64');
}
  private get headers() {
    console.log("client id",this.clientId)
    const signature = this.generateSignature();
    console.log("signature",signature)
    return {
      'x-client-id': this.clientId,
      'x-client-secret': this.clientSecret,
      'x-cf-signature': signature,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    promise: Promise<any>,
  ): Promise<T> {
    try {
      const { data } =
        await promise;

      return data;
    } catch (error: any) {
      this.logger.error(
        error?.response?.data ??
          error.message,
      );

      throw new HttpException(
        error?.response?.data ??
          'Cashfree API Error',
        error?.response?.status ??
          500,
      );
    }
  }

  /**
   * Optional
   * Check if user already has Digilocker
   */
  async verifyAccount(
    verificationId: string,
    mobileNumber?: string,
    aadhaarNumber?: string,
  ) {
    return this.request(
      firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/digilocker/verify-account`,
          {
            verification_id:
              verificationId,
            mobile_number:
              mobileNumber,
            aadhaar_number:
              aadhaarNumber,
          },
          {
            headers: this.headers,
          },
        ),
      ),
    );
  }

  /**
   * Create consent URL
   */
  async createDigilockerUrl(
    verificationId: string,
    redirectUrl: string,
  ) {
    return this.request(
      firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/digilocker`,
          {
            verification_id:
              verificationId,

            document_requested: [
              'AADHAAR',
              'PAN',
            ],

            redirect_url:
              redirectUrl,

            user_flow:
              'signup',
          },
          {
            headers: this.headers,
          },
        ),
      ),
    );
  }

  /**
   * Check status
   */
  async getVerificationStatus(
    verificationId: string,
  ): Promise<DigilockerVerificationStatus> {
    return this.request<DigilockerVerificationStatus>(
      firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/digilocker`,
          {
            params: {
              verification_id:
                verificationId,
            },
            headers: this.headers,
          },
        ),
      ),
    );
  }

  /**
   * Aadhaar
   */
  async getAadhaar(
    verificationId: string,
  ) {
    return this.request(
      firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/digilocker/document/AADHAAR`,
          {
            params: {
              verification_id:
                verificationId,
            },
            headers: this.headers,
          },
        ),
      ),
    );
  }

  /**
   * PAN
   */
  async getPan(
    verificationId: string,
  ) {
    return this.request(
      firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/digilocker/document/PAN`,
          {
            params: {
              verification_id:
                verificationId,
            },
            headers: this.headers,
          },
        ),
      ),
    );
  }

  /**
   * Driving License
   */
  async getDrivingLicense(
    verificationId: string,
  ) {
    return this.request(
      firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/digilocker/document/DRIVING_LICENSE`,
          {
            params: {
              verification_id:
                verificationId,
            },
            headers: this.headers,
          },
        ),
      ),
    );
  }

  /**
   * Complete KYC flow
   */
  async fetchKycDocuments(
    verificationId: string,
  ) {
    const status =
      await this.getVerificationStatus(
        verificationId,
      );

    if (
      status.status !==
      'AUTHENTICATED'
    ) {
      throw new Error(
        `Verification status: ${status.status}`,
      );
    }

    const [
      aadhaar,
      pan,
    ] = await Promise.all([
      this.getAadhaar(
        verificationId,
      ),
      this.getPan(
        verificationId,
      ),
    ]);

    return {
      aadhaar,
      pan,
    };
  }
}
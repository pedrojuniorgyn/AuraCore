/**
 * SefazResponse - Resposta padronizada da SEFAZ
 * E7.9 Integrações - Semana 1
 */

import { ValueObject } from '@/shared/domain/entities/ValueObject';
import { Result } from '@/shared/domain';

interface SefazResponseProps {
  code: string;
  message: string;
  protocol?: string;
  authorizationDate?: Date;
  isSuccess: boolean;
}

export class SefazResponse extends ValueObject<SefazResponseProps> {
  get code(): string {
    return this.props.code;
  }

  get message(): string {
    return this.props.message;
  }

  get protocol(): string | undefined {
    return this.props.protocol;
  }

  get authorizationDate(): Date | undefined {
    return this.props.authorizationDate;
  }

  get isSuccess(): boolean {
    return this.props.isSuccess;
  }

  private constructor(props: SefazResponseProps) {
    super(props);
    const validationResult = this.validate();
    if (Result.isFail(validationResult)) {
      throw new Error(validationResult.error);
    }
  }

  static success(
    code: string,
    message: string,
    protocol: string,
    authorizationDate: Date
  ): Result<SefazResponse, string> {
    try {
      const response = new SefazResponse({
        code,
        message,
        protocol,
        authorizationDate,
        isSuccess: true,
      });
      return Result.ok(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(errorMessage);
    }
  }

  static failure(code: string, message: string): Result<SefazResponse, string> {
    try {
      const response = new SefazResponse({
        code,
        message,
        isSuccess: false,
      });
      return Result.ok(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(errorMessage);
    }
  }

  private validate(): Result<void, string> {
    if (!this.props.code || this.props.code.trim().length === 0) {
      return Result.fail('Response code is required');
    }

    if (!this.props.message || this.props.message.trim().length === 0) {
      return Result.fail('Response message is required');
    }

    if (this.props.isSuccess && !this.props.protocol) {
      return Result.fail('Protocol is required for successful responses');
    }

    return Result.ok(undefined);
  }
}


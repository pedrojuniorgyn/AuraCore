/**
 * SefazResponse - Resposta padronizada da SEFAZ
 * E7.9 Integrações - Semana 1
 */

import { ValueObject } from '@/shared/domain/entities/ValueObject';
import { Result } from '@/shared/domain';

interface SefazResponseProps extends Record<string, unknown> {
  code: string;
  message: string;
  protocol?: string;
  authorizationDate?: Date;
  isSuccess: boolean;
}

export class SefazResponse extends ValueObject<SefazResponseProps & Record<string, unknown>> {
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

  /**
   * ⚠️ S1.3: Constructor privado SEM throw (validação movida para factory methods)
   */
  private constructor(props: SefazResponseProps) {
    super(props);
  }

  /**
   * ⚠️ S1.3: Validação no factory method ao invés de throw no constructor
   */
  static success(
    code: string,
    message: string,
    protocol: string,
    authorizationDate: Date
  ): Result<SefazResponse, string> {
    const response = new SefazResponse({
      code,
      message,
      protocol,
      authorizationDate,
      isSuccess: true,
    });
    const validationResult = response.validate();
    if (Result.isFail(validationResult)) {
      return Result.fail(validationResult.error);
    }
    return Result.ok(response);
  }

  /**
   * ⚠️ S1.3: Validação no factory method ao invés de throw no constructor
   */
  static failure(code: string, message: string): Result<SefazResponse, string> {
    const response = new SefazResponse({
      code,
      message,
      isSuccess: false,
    });
    const validationResult = response.validate();
    if (Result.isFail(validationResult)) {
      return Result.fail(validationResult.error);
    }
    return Result.ok(response);
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


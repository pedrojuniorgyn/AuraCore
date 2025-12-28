import { ValueObject } from '../entities/ValueObject';
import { Result } from '../types/Result';

interface EmailProps extends Record<string, unknown> {
  value: string;
}

/**
 * Value Object para Email
 * 
 * Invariantes:
 * - Deve ter formato válido
 * - Armazenado em lowercase
 */
export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Retorna domínio do email
   */
  get domain(): string {
    return this.props.value.split('@')[1];
  }

  /**
   * Retorna parte local do email
   */
  get localPart(): string {
    return this.props.value.split('@')[0];
  }

  static create(value: string): Result<Email, string> {
    if (!value || value.trim() === '') {
      return Result.fail('Email cannot be empty');
    }

    const trimmed = value.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return Result.fail('Invalid email format');
    }

    return Result.ok(new Email({ value: trimmed }));
  }

  toString(): string {
    return this.props.value;
  }
}


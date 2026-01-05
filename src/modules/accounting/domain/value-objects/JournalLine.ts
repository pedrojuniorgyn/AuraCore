/**
 * Journal Line Value Object
 * 
 * Representa uma linha de lançamento contábil (partida)
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 4/8 - accounting-engine.ts → JournalEntryGenerator
 */

import { Result } from "@/shared/domain";
import { Money } from "@/shared/domain";

export type LineType = 'DEBIT' | 'CREDIT';

export interface JournalLineProps {
  lineNumber: number;
  accountId: bigint;
  accountCode: string;
  accountName: string;
  type: LineType;
  amount: Money;
  description: string;
}

export class JournalLine {
  private constructor(private readonly props: JournalLineProps) {}

  static create(props: JournalLineProps): Result<JournalLine, Error> {
    // Validações
    if (props.lineNumber < 1) {
      return Result.fail(new Error("Número da linha deve ser maior que zero"));
    }

    if (!props.accountId || props.accountId <= 0n) {
      return Result.fail(new Error("ID da conta contábil inválido"));
    }

    if (!props.accountCode || props.accountCode.trim() === '') {
      return Result.fail(new Error("Código da conta contábil obrigatório"));
    }

    if (props.amount.amount <= 0) {
      return Result.fail(new Error("Valor do lançamento deve ser maior que zero"));
    }

    return Result.ok(new JournalLine(props));
  }

  get lineNumber(): number {
    return this.props.lineNumber;
  }

  get accountId(): bigint {
    return this.props.accountId;
  }

  get accountCode(): string {
    return this.props.accountCode;
  }

  get accountName(): string {
    return this.props.accountName;
  }

  get type(): LineType {
    return this.props.type;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get description(): string {
    return this.props.description;
  }

  get debitAmount(): number {
    return this.type === 'DEBIT' ? this.amount.amount : 0;
  }

  get creditAmount(): number {
    return this.type === 'CREDIT' ? this.amount.amount : 0;
  }

  equals(other: JournalLine): boolean {
    return (
      this.lineNumber === other.lineNumber &&
      this.accountId === other.accountId &&
      this.type === other.type &&
      this.amount.equals(other.amount)
    );
  }
}


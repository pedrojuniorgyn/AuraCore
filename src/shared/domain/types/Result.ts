/**
 * Result Pattern - Operações que podem falhar
 * 
 * @example
 * const result = Result.ok(value);
 * if (Result.isOk(result)) { use result.value }
 */
export class Result<T, E = Error> {
  private constructor(
    private readonly _isOk: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result(true, value);
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined, error);
  }

  static isOk<T, E>(result: Result<T, E>): result is Result<T, never> {
    return result._isOk;
  }

  static isFail<T, E>(result: Result<T, E>): result is Result<never, E> {
    return !result._isOk;
  }

  get isSuccess(): boolean {
    return this._isOk;
  }

  get isFailure(): boolean {
    return !this._isOk;
  }

  get value(): T {
    if (!this._isOk) throw new Error('Cannot get value of failed result');
    return this._value as T;
  }

  get error(): E {
    if (this._isOk) throw new Error('Cannot get error of successful result');
    return this._error as E;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isOk) return Result.ok(fn(this._value as T));
    return Result.fail(this._error as E);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isOk) return fn(this._value as T);
    return Result.fail(this._error as E);
  }
}


export { container } from './container';
export { TOKENS } from './tokens';

// Lazy DI Initialization for Next.js Production Workers (E14.8)
export { ensureDIInitialized, isDIInitialized } from './ensure-initialized';
export { withDI, withDICommand, withDIQuery } from './with-di';

/**
 * CRÍTICO: Este import DEVE ser o PRIMEIRO
 */
import 'reflect-metadata';

import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

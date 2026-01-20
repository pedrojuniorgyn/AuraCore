import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';
import React from 'react';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { 
          name: 'dark', 
          value: '#0f0d1a' 
        },
        { 
          name: 'dark-purple', 
          value: 'linear-gradient(135deg, #0f0d1a 0%, #1a1625 50%, #0f0d1a 100%)' 
        },
        { 
          name: 'light', 
          value: '#ffffff' 
        },
      ],
    },
    layout: 'centered',
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    (Story) => (
      <div className="p-8 min-h-[400px] bg-gradient-to-br from-slate-900 via-purple-900/10 to-slate-900">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default preview;

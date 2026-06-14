const path = require('path');

const root = __dirname;

module.exports = {
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: [
      path.resolve(root, 'packages/shared-types/tsconfig.json'),
      path.resolve(root, 'packages/shared-auth/tsconfig.json'),
      path.resolve(root, 'packages/shared-events/tsconfig.json'),
      path.resolve(root, 'packages/shared-logger/tsconfig.json'),
      path.resolve(root, 'packages/shared-rabbitmq/tsconfig.json'),
      path.resolve(root, 'packages/shared-testing/tsconfig.json'),
    ],
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'error',
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'no-param-reassign': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-use-before-define': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage'],
};

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.node.json',
    }],
  },
  collectCoverageFrom: [
    'electron/**/*.ts',
    '!electron/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};

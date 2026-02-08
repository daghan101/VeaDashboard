module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    moduleNameMapper: {
        '^@repo/database(|/.*)$': '<rootDir>/../../../packages/database$1',
        '^@repo/types(|/.*)$': '<rootDir>/../../../packages/types/src$1',
    },
    testEnvironment: 'node',
};

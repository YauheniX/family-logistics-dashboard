'use strict';

module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 80,
  tabWidth: 2,
  parser: 'babel', // or 'typescript' when using TypeScript
  plugins: [
    require('prettier-plugin-vue') // for Vue files
  ],
};

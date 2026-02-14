module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['vue', '@typescript-eslint', 'prettier'],
  rules: {
    // Disable the rule that requires multi-word component names
    'vue/multi-word-component-names': 'off',
    // Disallow console statements in production
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // Disallow debugger statements in production
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // Allow any types for now (can be tightened later)
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
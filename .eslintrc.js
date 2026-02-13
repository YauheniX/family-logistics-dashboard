module.exports = {
  extends: [
    'plugin:vue/vue3-recommended',
    '@vue/typescript/recommended',
  ],
  rules: {
    // Disable the rule that requires multi-word component names
    'vue/multi-word-component-names': 'off',
    // Disallow console statements in production
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    // Disallow debugger statements in production
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
};
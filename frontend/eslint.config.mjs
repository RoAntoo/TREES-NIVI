import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  { ignores: ['www/**', 'android/**', 'ios/**', '.angular/**', 'node_modules/**', 'coverage/**'] },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'nivi', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'nivi', style: 'camelCase' }],
      '@angular-eslint/prefer-on-push-component-change-detection': 'off'
    }
  },
  { files: ['**/*.html'], extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility] }
);

import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';

// Direct plugins retain React, Hooks and accessibility checks without the
// unpatched fast-glob/braces chain pulled in by eslint-config-next.
export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { react, 'react-hooks': hooks, 'jsx-a11y': a11y },
  settings: { react: { version: 'detect' } },
  rules: {
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
    'react/prop-types': 'off',
    // styled-jsx is a supported Next.js feature.
    'react/no-unknown-property': ['error', { ignore: ['jsx', 'global'] }],
    'react/no-unescaped-entities': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
    'jsx-a11y/aria-props': 'warn',
    'jsx-a11y/aria-proptypes': 'warn',
    'jsx-a11y/aria-unsupported-elements': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'warn',
    'jsx-a11y/role-supports-aria-props': 'warn',
    'jsx-a11y/anchor-has-content': 'warn',
    'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
    'no-unreachable': 'error',
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
  },
}];

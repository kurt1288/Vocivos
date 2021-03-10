module.exports = {
   parser: '@typescript-eslint/parser',
   extends: [
      'airbnb',
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
   ],
   plugins: ['@typescript-eslint'],
   rules: {
      'react/jsx-filename-extension': [2, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
      // note you must disable the base rule as it can report incorrect errors
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error'],
      'react/jsx-indent': ['error', 3],
      'react/jsx-indent-props': ['error', 3],
      indent: ['error', 3, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'windows'],
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': ['error'],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'import/extensions': ['error', 'never'],
      'react/jsx-fragments': ['error', 'element'],
      'react/jsx-one-expression-per-line': 0,
      'max-len': 0,
      'no-nested-ternary': 0,
      'no-unused-expressions': 0,
      'react/jsx-props-no-spreading': 0,
      'no-param-reassign': ['error', { props: true, ignorePropertyModificationsForRegex: ['^state'] }],
   },
   settings: {
      'import/resolver': {
         node: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
         },
      },
   },
};

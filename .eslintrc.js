module.exports = {
  root: true,
  "extends": "eslint-config-egg",
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module"
  },
  "rules": {
    "linebreak-style":"off"
  },
  "env": {
    "browser": true,
    "node": true,
    "commonjs": true,
    "jquery": true,
    "es6": true
  },
  "globals": {
    "PROD": true,
    "isBrowser": true
  },
  "parser": "babel-eslint"
}


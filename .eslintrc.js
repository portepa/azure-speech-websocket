module.exports = {
  "extends": "airbnb-base",
  "env": {
    "node": true
  },
  "rules": {
    "no-multi-spaces": "off",
    "indent": ["error", 2, { MemberExpression: 0 }],
    "arrow-parens": "off",
    "class-methods-use-this": "off"
  },
};

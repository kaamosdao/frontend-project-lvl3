export default {
  mixed: {
    default: () => ({ key: 'feedbackMessages.errors.invalidField' }),
    required: () => ({ key: 'feedbackMessages.errors.emptyField' }),
    notOneOf: () => ({ key: 'feedbackMessages.errors.rssExist' }),
  },
  string: {
    url: () => ({ key: 'feedbackMessages.errors.url' }),
  },
};

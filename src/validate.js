import * as yup from 'yup';
import { setLocale } from 'yup';

setLocale({
  mixed: {
    default: 'field_invalid',
  },
  string: {
    url: () => ({ key: 'feedbackMessages.errors.url' }),
  },
});

export default class Validator {
  static validateSync(url, state) {
    const schema = yup.object().shape({
      url: yup.string()
        .test(
          'inputFieldIsEmpty',
          { key: 'feedbackMessages.errors.emptyField' },
          (inputValue) => inputValue.length !== 0,
        )
        .url()
        .test(
          'UrlIsAlreadyExist',
          { key: 'feedbackMessages.errors.rssExist' },
          (rssUrl) => {
            const sameUrls = state.content.feeds.filter((feed) => feed.url === rssUrl);
            return sameUrls.length === 0;
          },
        ),
    });
    schema.validateSync({ url });
  }
}

import * as yup from 'yup';

const validate = (url, state) => {
  const urls = state.content.feeds.map((feed) => feed.url);
  const schema = yup.object().shape({
    url: yup.string()
      .required()
      .url()
      .notOneOf(urls),
  });

  schema.validateSync({ url });
};

export default validate;

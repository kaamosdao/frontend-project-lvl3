import * as yup from 'yup';

const validateUrl = (url, feeds) => {
  const urls = feeds.map((feed) => feed.url);
  const schema = yup.object().shape({
    url: yup.string()
      .required()
      .url()
      .notOneOf(urls),
  });

  schema.validateSync({ url });
};

export default validateUrl;

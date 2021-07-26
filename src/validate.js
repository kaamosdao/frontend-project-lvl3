import * as yup from 'yup';

const schema = yup.object().shape({
  url: yup.string().url(),
});

const validateName = (url, state) => {
  const watchedState = state;
  if (url.length === 0) {
    watchedState.valid = false;
    watchedState.feedback = 'feedbackMessages.errors.emptyField';
    return false;
  }
  if (schema.isValidSync({ url })) {
    watchedState.valid = true;
    return true;
  }
  watchedState.valid = false;
  watchedState.feedback = 'feedbackMessages.errors.url';
  return false;
};

const validateExistense = (url, state) => {
  const watchedState = state;
  const sameUrls = watchedState.content.feeds.filter((feed) => feed.url === url);
  if (sameUrls.length !== 0) {
    watchedState.valid = false;
    watchedState.feedback = 'feedbackMessages.errors.rssExist';
    return false;
  }
  return true;
};

const validate = (url, watchedState) => {
  const isValidName = validateName(url, watchedState);
  if (isValidName) {
    return validateExistense(url, watchedState);
  }
  return false;
};

export default validate;

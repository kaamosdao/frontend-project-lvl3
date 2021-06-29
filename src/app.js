import * as yup from 'yup';
import axios from 'axios';
import watchedState from './view';

const feedbackMessages = {
  default: '',
  loaded: 'RSS feed has successfully loaded!',
  errors: {
    network: 'Network Problems. Try again.',
    rssNotValid: 'URL does not contain a valid RSS feed',
    rssExist: 'RSS has already existed',
    url: 'url must be a valid URL',
  },
};

const parser = new DOMParser();
const rssParser = (rss) => parser.parseFromString(rss, 'application/xml');
const generateStateContent = (rssDocument) => {
  if (rssDocument.querySelector('rss') === null) {
    watchedState.processState = 'failed';
    watchedState.valid = false;
    watchedState.feedback = feedbackMessages.errors.rssNotValid;
  } else {
    watchedState.valid = true;
    watchedState.content.feedsCounter += 1;

    watchedState.content.feeds.push({
      id: watchedState.content.feedsCounter,
      url: watchedState.url,
      title: rssDocument.querySelector('channel > title').textContent,
      description: rssDocument.querySelector('channel > description').textContent,
    });
    const posts = [];

    rssDocument.querySelectorAll('item').forEach((item) => {
      posts.push({
        id: watchedState.content.posts.length + 1,
        feedId: watchedState.content.feedsCounter,
        title: item.querySelector('title').textContent,
        link: item.querySelector('link').textContent,
        description: item.querySelector('description').textContent,
      });
    });
    watchedState.content.posts.push(...posts);
    watchedState.processState = 'finished';
    watchedState.feedback = feedbackMessages.loaded;
  }
};

const schema = yup.object().shape({
  url: yup.string().url(),
});

class RssUrl {
  constructor(url, validState = null) {
    this.valid = validState;
    this.url = url;
  }

  validateName() {
    if (schema.isValidSync({ url: this.url })) {
      watchedState.valid = true;
      return new RssUrl(this.url, true);
    }
    watchedState.valid = false;
    watchedState.feedback = feedbackMessages.errors.url;
    return new RssUrl(this.url, false);
  }

  validateExistense() {
    if (this.valid === false) {
      return new RssUrl(this.url, false);
    }
    const sameUrls = watchedState.content.feeds.filter((feed) => feed.url === this.url);
    if (sameUrls.length !== 0) {
      watchedState.valid = false;
      watchedState.feedback = feedbackMessages.errors.rssExist;
      return new RssUrl(this.url, false);
    }
    return new RssUrl(this.url, true);
  }

  getRequest() {
    if (this.valid) {
      axios.get(`https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(this.url)}`)
        .then((response) => {
          watchedState.processState = 'sending';
          watchedState.feedback = feedbackMessages.default;
          return response.data.contents;
        })
        .then((rss) => rssParser(rss))
        .then((rssDocument) => generateStateContent(rssDocument))
        .catch(() => {
          watchedState.processState = 'failed';
          watchedState.valid = false;
          watchedState.feedback = feedbackMessages.errors.network;
        });
    }
  }
}

export default () => {
  const form = document.querySelector('form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    watchedState.url = formData.get('url');
    const url = new RssUrl(formData.get('url'));
    url.validateName().validateExistense().getRequest();
  });

  form.addEventListener('input', (e) => {
    e.preventDefault();
    watchedState.processState = 'filling';
  });
};

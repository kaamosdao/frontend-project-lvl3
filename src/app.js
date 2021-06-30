import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import watchedState from './view';
import resources from './locales';

const parser = new DOMParser();
const rssParser = (rss) => {
  const rssDocument = parser.parseFromString(rss, 'application/xml');
  if (rssDocument.querySelector('rss') === null) {
    return [null, null];
  }
  const feed = {
    url: watchedState.url,
    title: rssDocument.querySelector('channel > title').textContent,
    description: rssDocument.querySelector('channel > description').textContent,
  };
  const posts = [];
  [...rssDocument.querySelectorAll('item')].reverse().forEach((item) => {
    posts.push({
      title: item.querySelector('title').textContent,
      link: item.querySelector('link').textContent,
      description: item.querySelector('description').textContent,
    });
  });
  return [feed, posts];
};

const generateStateContent = (rssData) => {
  const [feed, posts] = rssData;
  if (feed === null && posts === null) {
    watchedState.processState = 'failed';
    watchedState.valid = false;
    watchedState.feedback = 'feedbackMessages.errors.rssNotValid';
  } else {
    watchedState.valid = true;
    watchedState.content.feedsCounter += 1;

    watchedState.content.feeds.push({
      id: watchedState.content.feedsCounter,
      url: feed.url,
      title: feed.title,
      description: feed.description,
    });

    posts.forEach((item) => {
      watchedState.content.posts.push({
        id: watchedState.content.posts.length + 1,
        feedId: watchedState.content.feedsCounter,
        title: item.title,
        link: item.link,
        description: item.description,
      });
    });
    watchedState.processState = 'finished';
    watchedState.feedback = 'feedbackMessages.loaded';
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
    watchedState.feedback = 'feedbackMessages.errors.url';
    return new RssUrl(this.url, false);
  }

  validateExistense() {
    if (this.valid === false) {
      return new RssUrl(this.url, false);
    }
    const sameUrls = watchedState.content.feeds.filter((feed) => feed.url === this.url);
    if (sameUrls.length !== 0) {
      watchedState.valid = false;
      watchedState.feedback = 'feedbackMessages.errors.rssExist';
      return new RssUrl(this.url, false);
    }
    return new RssUrl(this.url, true);
  }

  getRequest() {
    if (this.valid) {
      watchedState.processState = 'sending';
      watchedState.feedback = 'feedbackMessages.default';
      axios.get(`https://hexlet-allorigins.herokuapp.com/get?url=${encodeURIComponent(this.url)}`)
        .then((response) => response.data.contents)
        .then((rss) => rssParser(rss))
        .then((rssDocument) => generateStateContent(rssDocument))
        .catch(() => {
          watchedState.processState = 'failed';
          watchedState.valid = false;
          watchedState.feedback = 'feedbackMessages.errors.network';
        });
    }
  }
}

export default () => {
  i18next.init({
    lng: 'en', // if you're using a language detector, do not define the lng option
    debug: true,
    resources,
  });
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

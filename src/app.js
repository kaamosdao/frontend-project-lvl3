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

const updateStateContent = (rssData) => {
  const [feed, posts] = rssData;
  const feedID = watchedState.content.feeds
    .filter((item) => item.title === feed.title)
    .reduce((_acc, item) => item.id, 0);
  const isNewPost = (item) => {
    const equalPosts = watchedState.content.posts.filter((post) => post.title === item.title);
    return equalPosts.length === 0;
  };
  posts.forEach((item) => {
    if (isNewPost(item)) {
      watchedState.content.posts.push({
        id: watchedState.content.posts.length + 1,
        feedId: feedID,
        title: item.title,
        link: item.link,
        description: item.description,
      });
    }
  });
};

const schema = yup.object().shape({
  url: yup.string().url(),
});

class RssUrl {
  constructor(url, validState = null, state) {
    this.valid = validState;
    this.url = url;
    this.watchedState = state;
  }

  validateName() {
    if (schema.isValidSync({ url: this.url })) {
      this.watchedState.valid = true;
      return new RssUrl(this.url, true, this.watchedState);
    }
    this.watchedState.valid = false;
    this.watchedState.feedback = 'feedbackMessages.errors.url';
    return new RssUrl(this.url, false, this.watchedState);
  }

  validateExistense() {
    if (this.valid === false) {
      return new RssUrl(this.url, false, this.watchedState);
    }
    const sameUrls = this.watchedState.content.feeds.filter((feed) => feed.url === this.url);
    if (sameUrls.length !== 0) {
      this.watchedState.valid = false;
      this.watchedState.feedback = 'feedbackMessages.errors.rssExist';
      return new RssUrl(this.url, false, this.watchedState);
    }
    return new RssUrl(this.url, true, this.watchedState);
  }

  getRequest() {
    if (this.valid) {
      this.watchedState.processState = 'sending';
      this.watchedState.feedback = 'feedbackMessages.default';
      axios.get(`https://hexlet-allorigins.herokuapp.com/get?disableCache=true&url=${encodeURIComponent(this.url)}`)
        .then((response) => response.data.contents)
        .then((rss) => rssParser(rss))
        .then((rssDocument) => generateStateContent(rssDocument))
        .catch(() => {
          this.watchedState.processState = 'failed';
          this.watchedState.valid = false;
          this.watchedState.feedback = 'feedbackMessages.errors.network';
        })
        .then(() => {
          const setTimeout = () => {
            const delayedUpdate = () => {
              const urls = this.watchedState.content.feeds.reduce((acc, feed) => {
                acc.push(feed.url);
                return acc;
              }, []);
              const promises = urls.map((url) => axios.get(`https://hexlet-allorigins.herokuapp.com/get?disableCache=true&url=${encodeURIComponent(url)}`)
                .then((response) => response.data.contents)
                .then((rss) => rssParser(rss))
                .then((rssDocument) => updateStateContent(rssDocument)));

              const promise = Promise.all(promises);
              return promise.then(() => setTimeout());
            };
            if (this.watchedState.content.feedsCounter !== 0) {
              this.watchedState.timeoutID = window.setTimeout(delayedUpdate, 5000);
            }
          };
          setTimeout();
        });
    }
  }
}

export default () => {
  i18next.init({
    lng: 'en',
    debug: true,
    resources,
  });
  const form = document.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    watchedState.url = formData.get('url');
    const url = new RssUrl(formData.get('url'), null, watchedState);
    url.validateName().validateExistense().getRequest();
  });

  form.addEventListener('input', (e) => {
    e.preventDefault();
    watchedState.processState = 'filling';
  });
};

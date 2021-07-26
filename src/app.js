import axios from 'axios';
import i18next from 'i18next';
import validate from './validate.js';
import view from './view.js';
import resources from './locales';
import 'bootstrap';

const parser = new DOMParser();
const rssParser = (rss, state) => {
  const watchedState = state;
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

const generateStateContent = (rssData, state) => {
  const watchedState = state;
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

const updateStateContent = (rssData, state) => {
  const watchedState = state;
  const [feed, posts] = rssData;
  const [feedID] = watchedState.content.feeds
    .filter((item) => item.title === feed.title)
    .map((item) => item.id);
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

const setTimeout = (state) => {
  const watchedState = state;
  const delayedUpdate = () => {
    const urls = watchedState.content.feeds.reduce((acc, feed) => {
      acc.push(feed.url);
      return acc;
    }, []);
    const promises = urls.map((adress) => axios.get(`https://hexlet-allorigins.herokuapp.com/get?disableCache=true&url=${encodeURIComponent(adress)}`)
      .then((response) => response.data.contents)
      .then((rss) => rssParser(rss, watchedState))
      .then((rssDocument) => updateStateContent(rssDocument, watchedState)));

    const promise = Promise.all(promises);
    return promise.then(() => setTimeout(watchedState));
  };
  if (watchedState.content.feedsCounter !== 0) {
    watchedState.timeoutID = window.setTimeout(delayedUpdate, 5000);
  }
};

const getRequest = (url, state) => {
  const watchedState = state;
  watchedState.processState = 'sending';
  watchedState.feedback = 'feedbackMessages.default';
  return axios.get(`https://hexlet-allorigins.herokuapp.com/get?disableCache=true&url=${encodeURIComponent(url)}`)
    .then((response) => response.data.contents)
    .then((rss) => rssParser(rss, watchedState))
    .then((rssDocument) => generateStateContent(rssDocument, watchedState))
    .catch(() => {
      watchedState.processState = 'failed';
      watchedState.valid = false;
      watchedState.feedback = 'feedbackMessages.errors.network';
    })
    .then(() => setTimeout(watchedState));
};

export default () => {
  const state = {
    processState: 'filling', // filling / sending / failed / finished
    url: '',
    valid: null,
    timeoutID: null,
    feedback: '',
    content: {
      feedsCounter: 0,
      feeds: [], // [{ id, url, title, description }]
      posts: [], // [{ id, feedId, title, link, description }]
      postsState: {
        readPostsId: new Set(),
      },
      modalPost: {}, // { id, feedId, title, link, description }
    },
  };
  const watchedState = view(state, i18next);

  return i18next.init({
    lng: 'ru',
    debug: true,
    resources,
  })
    .then(() => {
      const form = document.querySelector('form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const url = formData.get('url');
        watchedState.url = url;
        const isValidUrl = validate(url, watchedState);
        if (isValidUrl) {
          getRequest(url, watchedState);
        }
      });
    });
};

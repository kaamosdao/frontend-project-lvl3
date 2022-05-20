import axios from 'axios';
import i18next from 'i18next';
import Validator from './validate.js';
import rssParser from './parser.js';
import view from './view.js';
import resources from './locales';
import 'bootstrap';

const generateStateContent = (rssData, url, state) => {
  const { title, description, posts } = rssData;
  const watchedState = state;
  watchedState.valid = true;
  watchedState.content.feedsCounter += 1;

  watchedState.content.feeds.push({
    id: watchedState.content.feedsCounter,
    url,
    title,
    description,
  });

  posts.reverse().forEach((item) => {
    watchedState.content.posts.push({
      id: watchedState.content.posts.length + 1,
      feedId: watchedState.content.feedsCounter,
      title: item.title,
      link: item.link,
      description: item.description,
    });
  });
  watchedState.processState = 'finished';
};

const updateStateContent = (rssData, state) => {
  const { title, posts } = rssData;
  const watchedState = state;
  const { id: feedID } = watchedState.content.feeds
    .find((item) => item.title === title);
  const isNewPost = (item) => {
    const equalPosts = watchedState.content.posts.filter((post) => post.title === item.title);
    return equalPosts.length === 0;
  };
  posts.reverse().forEach((item) => {
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

const addPostEvent = (state) => {
  const watchedState = state;
  document.querySelectorAll('.post__button')
    .forEach((button) => {
      button.addEventListener('click', (event) => {
        const { id } = event.target.dataset;
        const [post] = state.content.posts
          .filter((item) => item.id === parseInt(id, 10));
        watchedState.content.postsState.readPostsId.add(parseInt(id, 10));
        watchedState.content.modalPost = post;
      });
    });
  document.querySelectorAll('.post__link').forEach((aEl) => {
    aEl.addEventListener('click', (event) => {
      const { id } = event.target.dataset;
      watchedState.content.postsState.readPostsId.add(parseInt(id, 10));
    });
  });
};

const getData = (url, watchedState, operation) => axios.get(`https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`)
  .then((response) => response.data.contents)
  .then((rss) => rssParser(rss, watchedState))
  .then((rssData) => {
    if (operation === 'generate') {
      return generateStateContent(rssData, url, watchedState);
    }
    return updateStateContent(rssData, watchedState);
  });

const setUpdateTimeout = (state) => {
  const watchedState = state;
  const delayedUpdate = () => {
    const promises = watchedState.content.feeds
      .map(({ url }) => getData(url, watchedState, 'update'));

    const promise = Promise.all(promises);
    return promise
      .then(() => addPostEvent(watchedState))
      .then(() => setUpdateTimeout(watchedState));
  };
  window.setTimeout(delayedUpdate, 5000);
};

const setErrorState = (state, error) => {
  const watchedState = state;
  watchedState.processState = 'failed';
  watchedState.valid = false;
  const errorKey = error.message === 'Network Error' ? 'feedbackMessages.errors.network' : error.message.key;
  watchedState.error = { key: errorKey };
};

const generateRequests = (url, state) => {
  const watchedState = state;
  watchedState.processState = 'sending';
  return getData(url, watchedState, 'generate')
    .then(() => addPostEvent(watchedState))
    .catch((error) => {
      setErrorState(watchedState, error);
    })
    .then(() => setUpdateTimeout(watchedState));
};

export default () => {
  const state = {
    processState: 'filling', // filling / sending / failed / finished
    valid: null,
    error: {},
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
  const elements = {
    feedbackContainer: document.querySelector('.feedback'),
    submitButton: document.querySelector('.btn-submit'),
    inputField: document.querySelector('.form__input'),
    form: document.querySelector('form'),
  };

  return i18next.init({
    lng: 'ru',
    debug: true,
    resources,
  })
    .then(() => {
      const watchedState = view(state, i18next, elements);
      elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const url = formData.get('url');
        try {
          Validator.validateSync(url, watchedState);
          generateRequests(url, watchedState);
        } catch (error) {
          setErrorState(watchedState, error);
        }
      });
    });
};

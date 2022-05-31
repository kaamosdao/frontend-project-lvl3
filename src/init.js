import axios from 'axios';
import i18next from 'i18next';
import { setLocale } from 'yup';
import _ from 'lodash';
import validateUrl from './validators.js';
import yupLocale from './locales/yup.js';
import rssParser from './parser.js';
import view from './view.js';
import resources from './locales';
import 'bootstrap';

const getNextId = () => parseInt(_.uniqueId(), 10);

const generateStateContent = (rssData, url, state) => {
  const { title, description, posts } = rssData;
  state.valid = true;
  state.content.feedsCounter += 1;

  state.content.feeds.push({
    id: state.content.feedsCounter,
    url,
    title,
    description,
  });

  posts.reverse().forEach((item) => {
    state.content.posts.push({
      id: getNextId(),
      feedId: state.content.feedsCounter,
      title: item.title,
      link: item.link,
      description: item.description,
    });
  });
  state.processState = 'finished';
};

const updateStateContent = (rssData, state) => {
  const { title, posts } = rssData;
  const { id: feedID } = state.content.feeds
    .find((item) => item.title === title);
  const isNewPost = (item) => {
    const equalPosts = state.content.posts.filter((post) => post.title === item.title);
    return equalPosts.length === 0;
  };
  posts.reverse().forEach((item) => {
    if (isNewPost(item)) {
      state.content.posts.push({
        id: getNextId(),
        feedId: feedID,
        title: item.title,
        link: item.link,
        description: item.description,
      });
    }
  });
};

const addPostEvent = (state) => {
  document.querySelectorAll('.post__button')
    .forEach((button) => {
      button.addEventListener('click', (event) => {
        const { id } = event.target.dataset;
        const [post] = state.content.posts
          .filter((item) => item.id === parseInt(id, 10));
        state.content.postsState.readPostsId.add(parseInt(id, 10));
        state.content.modalPost = post;
      });
    });
  document.querySelectorAll('.post a').forEach((aEl) => {
    aEl.addEventListener('click', (event) => {
      const { id } = event.target.dataset;
      state.content.postsState.readPostsId.add(parseInt(id, 10));
    });
  });
};

const addProxy = (url) => `https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(url)}`;

const getData = (url, watchedState, operation) => axios.get(addProxy(url))
  .then((response) => response.data.contents)
  .then((rss) => rssParser(rss, watchedState))
  .then((rssData) => {
    if (operation === 'generate') {
      return generateStateContent(rssData, url, watchedState);
    }
    return updateStateContent(rssData, watchedState);
  });

const setUpdateTimeout = (state) => {
  const delayedUpdate = () => {
    const promises = state.content.feeds
      .map(({ url }) => getData(url, state, 'update'));

    const promise = Promise.all(promises);
    return promise
      .then(() => addPostEvent(state))
      .finally(() => setUpdateTimeout(state));
  };
  const delay = 5000;
  window.setTimeout(delayedUpdate, delay);
};

const getErrorKey = (error) => {
  if (error.isParsingError) {
    return 'feedbackMessages.errors.rssNotValid';
  }
  if (error.isAxiosError) {
    return 'feedbackMessages.errors.network';
  }
  return error.message.key;
};

const setErrorState = (state, error) => {
  state.processState = 'failed';
  state.valid = false;
  const errorKey = getErrorKey(error);
  state.error = { key: errorKey };
};

const generateRequests = (url, state) => {
  state.processState = 'sending';
  return getData(url, state, 'generate')
    .then(() => addPostEvent(state))
    .catch((error) => {
      setErrorState(state, error);
    })
    .finally(() => setUpdateTimeout(state));
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

  setLocale(yupLocale);

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
        const { feeds } = watchedState.content;
        try {
          validateUrl(url, feeds);
          generateRequests(url, watchedState);
        } catch (error) {
          setErrorState(watchedState, error);
        }
      });
    });
};

import onChange from 'on-change';
import i18next from 'i18next';

const feedbackContainer = document.querySelector('.feedback');
const submitButton = document.querySelector('button');
const inputField = document.querySelector('input');
const form = document.querySelector('form');

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

const modalPostHandler = (value) => {
  const titleEl = document.querySelector('.modal-title');
  titleEl.textContent = value.title;
  const descriptionEl = document.querySelector('.modal-body > p');
  descriptionEl.textContent = value.description;
  const buttonEl = document.querySelector('.modal-footer > a');
  buttonEl.setAttribute('href', value.link);
  buttonEl.setAttribute('target', '_blank');
};

const readPostsIdHandler = (value) => {
  value.forEach((id) => {
    const aEl = document.querySelector(`a[data-id="${id}"]`);
    aEl.classList.remove('fw-bold', 'link-primary');
    aEl.classList.add('fw-normal', 'link-secondary');
  });
};

const createPostContentElements = (post) => {
  const buttonEl = document.createElement('button');
  buttonEl.classList.add('btn', 'btn-outline-primary');
  buttonEl.setAttribute('type', 'button');
  buttonEl.dataset.id = post.id;
  buttonEl.dataset.bsToggle = 'modal';
  buttonEl.dataset.bsTarget = '#modal';
  buttonEl.textContent = i18next.t('preview');
  // createModalButtonEvent(buttonEl);
  const aEl = document.createElement('a');
  if (state.content.postsState.readPostsId.has(post.id)) {
    aEl.classList.add('link-secondary', 'fw-normal');
  } else {
    aEl.classList.add('link-primary', 'fw-bold');
  }
  aEl.setAttribute('href', post.link);
  aEl.setAttribute('target', '_blank');
  aEl.dataset.id = post.id;
  aEl.textContent = post.title;
  // createLinkEvent(aEl);
  return [buttonEl, aEl];
};

const createCardEl = (contentName) => {
  const cardEl = document.createElement('div');
  cardEl.classList.add('card', 'border-0');
  const cardBodyEl = document.createElement('div');
  cardBodyEl.classList.add('card-body');
  const titleEl = document.createElement('h2');
  titleEl.classList.add('card-title', 'h4');
  titleEl.textContent = i18next.t(contentName);
  cardBodyEl.append(titleEl);
  const ulEl = document.createElement('ul');
  ulEl.classList.add('list-group', 'border-0', 'rounded-0');
  cardEl.append(cardBodyEl, ulEl);
  return cardEl;
};

const feedsHandler = (value) => {
  const feedsEl = document.querySelector('.feeds');
  if (feedsEl.querySelector('.card') === null) {
    const cardEl = createCardEl('feeds');
    feedsEl.append(cardEl);
  }
  const ulEl = feedsEl.querySelector('ul');
  ulEl.innerHTML = '';
  value.forEach((feed) => {
    const liEl = document.createElement('li');
    liEl.classList.add('list-group-item', 'border-0', 'border-end-0');
    const h3El = document.createElement('h3');
    h3El.classList.add('h6', 'm-0');
    h3El.textContent = feed.title;
    const pEl = document.createElement('p');
    pEl.classList.add('m-0', 'small', 'text-black-50');
    pEl.textContent = feed.description;
    liEl.append(h3El);
    liEl.append(pEl);
    ulEl.prepend(liEl);
  });
};

const postsHandler = (value) => {
  const postsEl = document.querySelector('.posts');
  if (postsEl.querySelector('.card') === null) {
    const cardEl = createCardEl('posts');
    postsEl.append(cardEl);
  }
  const ulEl = postsEl.querySelector('ul');
  ulEl.innerHTML = '';
  value.forEach((post) => {
    const liEl = document.createElement('li');
    liEl.classList.add('list-group-item', 'border-0', 'border-end-0', 'd-flex', 'justify-content-between', 'align-items-center');
    const [buttonEl, aEl] = createPostContentElements(post);
    liEl.append(aEl);
    liEl.append(buttonEl);
    ulEl.prepend(liEl);
  });
};

const processStateHandler = (processState) => {
  switch (processState) {
    case 'failed':
      submitButton.disabled = false;
      inputField.readOnly = false;
      break;
    case 'filling':
      submitButton.disabled = false;
      inputField.readOnly = false;
      break;
    case 'sending':
      submitButton.disabled = true;
      inputField.readOnly = true;
      break;
    case 'finished':
      submitButton.disabled = false;
      inputField.readOnly = false;
      form.reset();
      inputField.focus();
      break;
    default:
      throw new Error(`Unknown state: ${processState}`);
  }
};

const validStateHandler = (value) => {
  if (value === true) {
    inputField.classList.remove('is-invalid');
    feedbackContainer.classList.remove('text-danger');
    feedbackContainer.classList.add('text-success');
  } else {
    inputField.classList.add('is-invalid');
    feedbackContainer.classList.remove('text-success');
    feedbackContainer.classList.add('text-danger');
  }
};

const watchedState = onChange(state, (path, value) => {
  switch (path) {
    case 'processState':
      processStateHandler(value);
      break;
    case 'valid':
      validStateHandler(value);
      break;
    case 'feedback':
      feedbackContainer.textContent = i18next.t(value);
      break;
    case 'content.feeds':
      feedsHandler(value);
      break;
    case 'content.posts':
      postsHandler(value);
      document.querySelectorAll('[data-bs-toggle="modal"]').forEach((button) => {
        button.addEventListener('click', (e) => {
          const { id } = e.target.dataset;
          const [post] = watchedState.content.posts
            .filter((item) => item.id === parseInt(id, 10));
          watchedState.content.postsState.readPostsId.add(parseInt(id, 10));
          watchedState.content.modalPost = post;
        });
      });
      document.querySelectorAll('li > a').forEach((aEl) => {
        aEl.addEventListener('click', (e) => {
          const { id } = e.target.dataset;
          watchedState.content.postsState.readPostsId.add(parseInt(id, 10));
        });
      });
      break;
    case 'content.postsState.readPostsId':
      readPostsIdHandler(value);
      break;
    case 'content.modalPost':
      modalPostHandler(value);
      break;
    default:
      break;
  }
});

export default watchedState;

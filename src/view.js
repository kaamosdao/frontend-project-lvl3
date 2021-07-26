import onChange from 'on-change';

const addEvent = (watcher, state) => {
  const watchedState = watcher(state);
  document
    .querySelectorAll('[data-bs-toggle="modal"]')
    .forEach((button) => {
      button.addEventListener('click', (event) => {
        const { id } = event.target.dataset;
        const [post] = state.content.posts
          .filter((item) => item.id === parseInt(id, 10));
        watchedState.content.postsState.readPostsId.add(parseInt(id, 10));
        watchedState.content.modalPost = post;
      });
    });
  document.querySelectorAll('li > a').forEach((aEl) => {
    aEl.addEventListener('click', (event) => {
      const { id } = event.target.dataset;
      watchedState.content.postsState.readPostsId.add(parseInt(id, 10));
    });
  });
};
const modalPostHandler = (value) => {
  const titleElement = document.querySelector('.modal-title');
  titleElement.textContent = value.title;
  const descriptionElement = document.querySelector('.modal-body > p');
  descriptionElement.textContent = value.description;
  const buttonElement = document.querySelector('.modal-footer > a');
  buttonElement.setAttribute('href', value.link);
  buttonElement.setAttribute('target', '_blank');
};

const readPostsIdHandler = (value) => {
  value.forEach((id) => {
    const aElement = document.querySelector(`a[data-id="${id}"]`);
    aElement.classList.remove('fw-bold', 'link-primary');
    aElement.classList.add('fw-normal', 'link-secondary');
  });
};

const createPostContentElements = (post, i18next, state) => {
  const buttonElement = document.createElement('button');
  buttonElement.classList.add('btn', 'btn-outline-primary');
  buttonElement.setAttribute('type', 'button');
  buttonElement.dataset.id = post.id;
  buttonElement.dataset.bsToggle = 'modal';
  buttonElement.dataset.bsTarget = '#modal';
  buttonElement.textContent = i18next.t('preview');
  const aElement = document.createElement('a');
  if (state.content.postsState.readPostsId.has(post.id)) {
    aElement.classList.add('link-secondary', 'fw-normal');
  } else {
    aElement.classList.add('link-primary', 'fw-bold');
  }
  aElement.setAttribute('href', post.link);
  aElement.setAttribute('target', '_blank');
  aElement.dataset.id = post.id;
  aElement.textContent = post.title;
  return [buttonElement, aElement];
};

const createCardElement = (contentName, i18next) => {
  const cardElement = document.createElement('div');
  cardElement.classList.add('card', 'border-0');
  const cardBodyElement = document.createElement('div');
  cardBodyElement.classList.add('card-body');
  const titleElement = document.createElement('h2');
  titleElement.classList.add('card-title', 'h4');
  titleElement.textContent = i18next.t(contentName);
  cardBodyElement.append(titleElement);
  const ulElement = document.createElement('ul');
  ulElement.classList.add('list-group', 'border-0', 'rounded-0');
  cardElement.append(cardBodyElement, ulElement);
  return cardElement;
};

const feedsHandler = (value, i18next) => {
  const feedsElement = document.querySelector('.feeds');
  if (feedsElement.querySelector('.card') === null) {
    const cardEl = createCardElement('feeds', i18next);
    feedsElement.append(cardEl);
  }
  const ulElement = feedsElement.querySelector('ul');
  ulElement.innerHTML = '';
  value.forEach((feed) => {
    const liElement = document.createElement('li');
    liElement.classList.add('list-group-item', 'border-0', 'border-end-0');
    const h3Element = document.createElement('h3');
    h3Element.classList.add('h6', 'm-0');
    h3Element.textContent = feed.title;
    const pElement = document.createElement('p');
    pElement.classList.add('m-0', 'small', 'text-black-50');
    pElement.textContent = feed.description;
    liElement.append(h3Element);
    liElement.append(pElement);
    ulElement.prepend(liElement);
  });
};

const postsHandler = (value, i18next, state) => {
  const postsElement = document.querySelector('.posts');
  if (postsElement.querySelector('.card') === null) {
    const cardEl = createCardElement('posts', i18next);
    postsElement.append(cardEl);
  }
  const ulElement = postsElement.querySelector('ul');
  ulElement.innerHTML = '';
  value.forEach((post) => {
    const liElement = document.createElement('li');
    liElement.classList.add(
      'list-group-item',
      'border-0',
      'border-end-0',
      'd-flex',
      'justify-content-between',
      'align-items-center',
    );
    const [buttonElement, aElement] = createPostContentElements(post, i18next, state);
    liElement.append(aElement);
    liElement.append(buttonElement);
    ulElement.prepend(liElement);
  });
};

const processStateHandler = (processState, nodes) => {
  const elements = nodes;
  switch (processState) {
    case 'failed':
      elements.submitButton.disabled = false;
      elements.inputField.readOnly = false;
      break;
    case 'filling':
      elements.submitButton.disabled = false;
      elements.inputField.readOnly = false;
      break;
    case 'sending':
      elements.submitButton.disabled = true;
      elements.inputField.readOnly = true;
      break;
    case 'finished':
      elements.submitButton.disabled = false;
      elements.inputField.readOnly = false;
      elements.form.reset();
      elements.inputField.focus();
      break;
    default:
      throw new Error(`Unknown state: ${processState}`);
  }
};

const validStateHandler = (value, elements) => {
  if (value === true) {
    elements.inputField.classList.remove('is-invalid');
    elements.feedbackContainer.classList.remove('text-danger');
    elements.feedbackContainer.classList.add('text-success');
  } else {
    elements.inputField.classList.add('is-invalid');
    elements.feedbackContainer.classList.remove('text-success');
    elements.feedbackContainer.classList.add('text-danger');
  }
};

const watchedState = (state, i18next, nodes) => onChange(state, (path, value) => {
  const elements = nodes;
  switch (path) {
    case 'processState':
      processStateHandler(value, elements);
      break;
    case 'valid':
      validStateHandler(value, elements);
      break;
    case 'feedback':
      elements.feedbackContainer.textContent = i18next.t(value);
      break;
    case 'content.feeds':
      feedsHandler(value, i18next);
      break;
    case 'content.posts':
      postsHandler(value, i18next, state);
      addEvent(watchedState, state);
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

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
  const posts = [...rssDocument.querySelectorAll('item')].reverse().map((item) => ({
    title: item.querySelector('title').textContent,
    link: item.querySelector('link').textContent,
    description: item.querySelector('description').textContent,
  }));
  return [feed, posts];
};

export default rssParser;

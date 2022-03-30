class MyRssError extends Error {
  constructor(message) {
    super();
    this.name = 'RSS parsing error';
    this.message = message;
  }

  toString() {
    return `${this.name}: ${JSON.stringify(this.message)}`;
  }
}

const rssParser = (rss) => {
  const parser = new DOMParser();
  const rssDocument = parser.parseFromString(rss, 'application/xml');
  if (rssDocument.querySelector('rss') === null) {
    throw new MyRssError({ key: 'feedbackMessages.errors.rssNotValid' });
  }
  return {
    title: rssDocument.querySelector('channel > title').textContent,
    description: rssDocument.querySelector('channel > description').textContent,
    posts: [...rssDocument.querySelectorAll('item')].map((item) => ({
      title: item.querySelector('title').textContent,
      link: item.querySelector('link').textContent,
      description: item.querySelector('description').textContent,
    })),
  };
};

export default rssParser;

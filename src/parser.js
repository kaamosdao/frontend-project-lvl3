const rssParser = (rss) => {
  const parser = new DOMParser();
  const rssDocument = parser.parseFromString(rss, 'application/xml');
  const parseError = rssDocument.querySelector('parsererror');
  if (parseError) {
    const error = new Error('RSS parsing error');
    error.isParsingError = true;
    throw error;
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

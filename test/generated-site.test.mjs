import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../public/', import.meta.url);
const siteOrigin = 'https://aicool.org';

const posts = [
  {
    route: '2017/12/19/Java8字符串拼接',
    title: 'Java8字符串拼接',
    marker: 'String.join',
  },
  {
    route: '2017/12/19/基于redis的延迟队列',
    title: '基于redis的延迟队列',
    marker: '延时消息队列',
  },
  {
    route: '2018/07/03/什么是锁',
    title: '什么是锁',
    marker: '多个线程',
  },
  {
    route: '2020/07/07/随笔1',
    title: '随笔',
    marker: '挣扎自救',
  },
  {
    route: '2020/08/22/提升效率之路',
    title: '提升效率之路',
    marker: '工具的作用',
  },
];

function getAttribute(attributes, name) {
  const pattern = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  const match = attributes.match(pattern);

  return match?.[2];
}

function findStartTag(html, predicate, startIndex = 0) {
  const tagPattern = /<([a-z][\w:-]*)\b([^>]*)>/gi;
  tagPattern.lastIndex = startIndex;

  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    if (predicate(match[1], match[2])) {
      return {
        index: match.index,
        contentIndex: tagPattern.lastIndex,
      };
    }
  }

  return null;
}

function hasClass(attributes, expectedClass) {
  return getAttribute(attributes, 'class')?.split(/\s+/).includes(expectedClass);
}

function extractPostBody(html, pageName) {
  const postBody = findStartTag(
    html,
    (_, attributes) => hasClass(attributes, 'post-body')
      && getAttribute(attributes, 'itemprop') === 'articleBody',
  );

  assert.ok(postBody, `${pageName} 缺少 .post-body[itemprop="articleBody"] 正文区域`);

  const postFooter = findStartTag(
    html,
    (_, attributes) => hasClass(attributes, 'post-footer'),
    postBody.contentIndex,
  );
  const articleEnd = html.search(/<\/article\s*>/i, postBody.contentIndex);
  const contentEnds = [postFooter?.index, articleEnd].filter((index) => index >= 0);

  assert.ok(contentEnds.length > 0, `${pageName} 缺少 post-footer 或 </article> 正文结束标记`);

  return html.slice(postBody.contentIndex, Math.min(...contentEnds));
}

function extractAnchors(html) {
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  const anchors = [];

  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const href = getAttribute(match[1], 'href');
    if (href) {
      anchors.push({ href, content: match[2] });
    }
  }

  return anchors;
}

function normalizePathname(href) {
  try {
    return decodeURIComponent(new URL(href, siteOrigin).pathname);
  } catch {
    return null;
  }
}

for (const { route, title, marker } of posts) {
  test(`${route} 生成页保留标题与正文标记`, async () => {
    const page = await readFile(new URL(`${route}/index.html`, root), 'utf8');
    const postBody = extractPostBody(page, route);

    assert.match(
      page,
      new RegExp(`<title[^>]*>[^<]*${title}[^<]*</title>`, 'i'),
      `${route} 的 title 应包含 ${title}`,
    );
    assert.ok(postBody.includes(marker), `${route} 正文应包含标记 ${marker}`);
  });
}

test('首页和归档页均链接到所有保留文章', async () => {
  const [index, archives] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('archives/index.html', root), 'utf8'),
  ]);
  const indexPaths = new Set(extractAnchors(index).map(({ href }) => normalizePathname(href)));
  const archivePaths = new Set(extractAnchors(archives).map(({ href }) => normalizePathname(href)));

  for (const { route } of posts) {
    const permalink = `/${route}/`;
    const encodedPermalink = encodeURI(permalink);

    assert.ok(indexPaths.has(permalink), `首页应以真实 href 链接到 ${encodedPermalink}`);
    assert.ok(archivePaths.has(permalink), `归档页应以真实 href 链接到 ${encodedPermalink}`);
  }
});

test('生成物保留自定义域名', async () => {
  const cname = await readFile(new URL('CNAME', root), 'utf8');

  assert.equal(cname.trim(), 'aicool.org');
});

test('关于页保留页面与正文内容', async () => {
  const about = await readFile(new URL('about/index.html', root), 'utf8');
  const postBody = extractPostBody(about, 'about');

  assert.match(about, /<html/i);
  assert.match(about, /about/i);
  assert.match(postBody, /纯粹蹭热度/);
});

test('404 页面提供返回首页的正文链接', async () => {
  const notFound = await readFile(new URL('404.html', root), 'utf8');

  assert.match(notFound, /<html/i);
  assert.match(notFound, /个人博客/);
  assert.match(notFound, /404/);
  assert.ok(
    extractAnchors(notFound).some(({ href, content }) => (
      normalizePathname(href) === '/' && content.replace(/<[^>]*>/g, '').includes('返回首页')
    )),
    '404 正文应提供 href 为 / 且可见文本含“返回首页”的锚点',
  );
});

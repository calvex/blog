import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../public/', import.meta.url);

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

test('生成的文章保留标题与正文标记', async () => {
  for (const { route, title, marker } of posts) {
    const page = await readFile(new URL(`${route}/index.html`, root), 'utf8');

    assert.match(page, new RegExp(`<title[^>]*>[^<]*${title}[^<]*</title>`, 'i'));
    assert.ok(page.includes(marker), `${route} 应包含正文标记 ${marker}`);
  }
});

test('首页和归档页均链接到所有保留文章', async () => {
  const [index, archives] = await Promise.all([
    readFile(new URL('index.html', root), 'utf8'),
    readFile(new URL('archives/index.html', root), 'utf8'),
  ]);

  for (const { route } of posts) {
    const permalink = encodeURI(`/${route}/`);

    assert.ok(index.includes(permalink), `首页应链接到 ${permalink}`);
    assert.ok(archives.includes(permalink), `归档页应链接到 ${permalink}`);
  }
});

test('生成物保留自定义域名', async () => {
  const cname = await readFile(new URL('CNAME', root), 'utf8');

  assert.equal(cname.trim(), 'aicool.org');
});

test('关于页保留页面与正文内容', async () => {
  const about = await readFile(new URL('about/index.html', root), 'utf8');

  assert.match(about, /<html/i);
  assert.match(about, /about/i);
  assert.match(about, /纯粹蹭热度/);
});

test('404 页面提供返回首页的正文链接', async () => {
  const notFound = await readFile(new URL('404.html', root), 'utf8');

  assert.match(notFound, /<html/i);
  assert.match(notFound, /个人博客/);
  assert.match(notFound, /404/);
  assert.match(notFound, /<a\b[^>]*\bhref="\/"[^>]*>\s*返回首页\s*<\/a>/i);
});

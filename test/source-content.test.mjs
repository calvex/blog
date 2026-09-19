import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

const posts = [
  ['Java8字符串拼接.md', 'Java8字符串拼接', '2017-12-19 10:58:27'],
  ['基于redis的延迟队列.md', '基于redis的延迟队列', '2017-12-19 14:02:37'],
  ['什么是锁.md', '什么是锁', '2018-07-03 18:54:08'],
  ['随笔1.md', '随笔', '2020-07-07 17:25:00'],
  ['提升效率之路.md', '提升效率之路', '2020-08-22 17:58:12'],
];

test('保留的文章源码具有历史标题与发布时间', async () => {
  for (const [filename, title, date] of posts) {
    const content = await readFile(new URL(`source/_posts/${filename}`, root), 'utf8');
    const frontMatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    assert.ok(frontMatter, `${filename} 应包含 front matter`);
    assert.match(frontMatter[1], new RegExp(`^title: ${title}$`, 'm'));
    assert.match(frontMatter[1], new RegExp(`^date: ${date}$`, 'm'));
  }
});

test('站点入口与回退页遵循发布契约', async () => {
  const [cname, config, notFound] = await Promise.all([
    readFile(new URL('source/CNAME', root), 'utf8'),
    readFile(new URL('_config.yml', root), 'utf8'),
    readFile(new URL('source/404.md', root), 'utf8'),
  ]);

  assert.equal(cname.trim(), 'aicool.org');
  assert.match(config, /^permalink: :year\/:month\/:day\/:title\/$/m);
  assert.match(notFound, /^layout: page$/m);
  assert.match(notFound, /\[返回首页\]\(\/\)/);
});

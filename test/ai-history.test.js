import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeHistory, searchChats } from '../src/ai-history.js'

test('history starts with a user after trimming and retains latest turns', () => {
  const messages = Array.from({ length: 19 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: String(i) }))
  const result = normalizeHistory(messages)
  assert.equal(result[0].role, 'user')
  assert.equal(result.at(-1).content, '18')
  assert.ok(result.length <= 18)
})
test('consecutive turns are merged within API limits without changing input', () => {
  const input = [{ role: 'user', content: 'a'.repeat(20000) }, { role: 'user', content: 'b'.repeat(10000) }]
  const result = normalizeHistory(input)
  assert.equal(result.length, 1)
  assert.equal(result[0].content.length, 24000)
  assert.ok(result[0].content.endsWith('b'.repeat(10000)))
  assert.equal(input[0].content.length, 20000)
})
test('searches chat titles and visible message content with multiple terms', () => {
  const chats = [{ title:'Belajar React', messages:[{content:'hidden file text', displayContent:'Membuat aplikasi'}] }, {title:'Coding', messages:[{content:'Belajar Python'}]}]
  assert.deepEqual(searchChats(chats, 'aplikasi REACT'), [chats[0]])
  assert.deepEqual(searchChats(chats, 'hidden'), [])
  assert.equal(searchChats(chats, ' ').length, 2)
})

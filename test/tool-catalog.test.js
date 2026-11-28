import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryFor, filterAndSortTools, pushRecentTool, readToolIds } from '../src/tool-catalog.js'

const tools = [
  { id: 'json', name: 'JSON Studio', desc: 'Format JSON', category: 'Developer', tag: 'Popular' },
  { id: 'qr', name: 'QR Code Generator', desc: 'Create code', category: 'Maker' },
  { id: 'socialdownloader', name: 'Social Media Downloader', desc: 'Download media', category: 'Downloader' },
  { id: 'uuid', name: 'UUID Generator', desc: 'Generate identifier', category: 'Developer' },
]

test('assigns each known catalog family to its intended category', () => {
  assert.equal(categoryFor(tools[0]), 'Tools')
  assert.equal(categoryFor(tools[1]), 'Maker')
  assert.equal(categoryFor(tools[2]), 'Downloader')
  assert.equal(categoryFor({ id: 'future-maker', category: 'Image & Design' }), 'Maker')
  assert.equal(categoryFor({ id: 'future-tool', category: 'Developer' }), 'Tools')
})

test('filters by category, favorite, recent, and case-insensitive search', () => {
  assert.deepEqual(filterAndSortTools(tools, { category: 'Maker' }).map(tool => tool.id), ['qr'])
  assert.deepEqual(filterAndSortTools(tools, { query: 'JSON', favorites: ['json'], onlyFavorites: true }).map(tool => tool.id), ['json'])
  assert.deepEqual(filterAndSortTools(tools, { query: 'JSON', onlyRecent: true, recent: ['uuid'] }), [])
  assert.deepEqual(filterAndSortTools(tools, { onlyRecent: true, recent: ['uuid', 'json'], sort: 'recent' }).map(tool => tool.id), ['uuid', 'json'])
})

test('sorts by name, popularity, and favorites without mutating source catalog', () => {
  const original = tools.map(tool => tool.id)
  assert.deepEqual(filterAndSortTools(tools, { sort: 'name' }).map(tool => tool.name), ['JSON Studio', 'QR Code Generator', 'Social Media Downloader', 'UUID Generator'])
  assert.equal(filterAndSortTools(tools, { sort: 'popular' })[0].id, 'json')
  assert.equal(filterAndSortTools(tools, { favorites: ['uuid'], sort: 'favorites' })[0].id, 'uuid')
  assert.deepEqual(tools.map(tool => tool.id), original)
})

test('moves a reopened tool to the front of recent tools and enforces the limit', () => {
  assert.deepEqual(pushRecentTool(['json', 'uuid', 'qr'], 'uuid'), ['uuid', 'json', 'qr'])
  assert.deepEqual(pushRecentTool(['json', 'uuid', 'qr'], 'socialdownloader', 3), ['socialdownloader', 'json', 'uuid'])
})

test('reads only known, unique IDs and safely handles corrupt storage', () => {
  const storage = { getItem: () => '["json","json","unknown",4,"uuid"]' }
  assert.deepEqual(readToolIds(storage, 'recent', new Set(['json', 'uuid']), 1), ['json'])
  assert.deepEqual(readToolIds({ getItem: () => '{broken' }, 'recent', new Set(['json'])), [])
  assert.deepEqual(readToolIds(null, 'recent', new Set(['json'])), [])
})


test('matches multiple search terms across fields in any order', () => {
  assert.deepEqual(filterAndSortTools(tools, { query: 'developer   format' }).map(tool => tool.id), ['json'])
  assert.deepEqual(filterAndSortTools(tools, { query: 'generator qr' }).map(tool => tool.id), ['qr'])
  assert.deepEqual(filterAndSortTools(tools, { query: 'json missing' }), [])
  assert.equal(filterAndSortTools(tools, { query: '   ' }).length, tools.length)
})

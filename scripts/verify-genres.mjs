import assert from 'node:assert/strict';
import { matchesGenres, normalizeGenres, formatGenres, genreOptions } from '../lib/genres.ts';
import { fitsDuration } from '../lib/duration.ts';

const horror = { id: 27, name: 'Horror' }, thriller = { id: 53, name: 'Thriller' }, drama = { id: 18, name: 'Drama' };
const titles = [
  { key: 'movie:1', genres: [horror], runtime: 107, selectedBy: 'person1', mediaType: 'movie' },
  { key: 'movie:2', genres: [thriller], runtime: 120, selectedBy: 'both', mediaType: 'movie' },
  { key: 'movie:3', genres: [horror, thriller], runtime: 150, selectedBy: 'person1', mediaType: 'movie' },
  { key: 'movie:4', genres: [drama], runtime: 110, selectedBy: 'person2', mediaType: 'movie' },
  { key: 'tv:5', genres: [thriller], runtime: 45, selectedBy: 'person1', mediaType: 'tv' },
  { key: 'movie:6', genres: undefined, runtime: 90, selectedBy: 'person1', mediaType: 'movie' },
];
assert.deepEqual(titles.filter(title => matchesGenres(title.genres, [27, 53])).map(title => title.key), ['movie:1', 'movie:2', 'movie:3', 'tv:5'], 'OR includes either genre for movies and series without duplicating a two-genre title');
assert.deepEqual(titles.filter(title => matchesGenres(title.genres, [27])).map(title => title.key), ['movie:1', 'movie:3'], 'Removing one selection narrows the union');
assert.equal(titles.filter(title => matchesGenres(title.genres, [])).length, 6, 'All genres restores every title, including unknown genres');
assert.deepEqual(titles.filter(title => matchesGenres(title.genres, [27, 53]) && fitsDuration(title, 120) && title.selectedBy === 'person1').map(title => title.key), ['movie:1'], 'Genres intersect the time budget and selector');
assert.deepEqual(titles.filter(title => matchesGenres(title.genres, [27, 53]) && fitsDuration(title, 120) && title.selectedBy === 'both').map(title => title.key), ['movie:2'], 'The shared selector and inclusive duration boundary work together');
assert.equal(matchesGenres([], [27]), false, 'Unknown genres never produce false matches');
assert.equal(matchesGenres([{ id: 10765, name: 'Sci-Fi & Fantasy' }], [878]), true, 'TV combined category matches sci-fi');
assert.equal(matchesGenres([{ id: 10765, name: 'Sci-Fi & Fantasy' }], [14]), true, 'TV combined category matches fantasy');
assert.equal(matchesGenres([{ id: 10759, name: 'Action & Adventure' }], [28]), true);
assert.equal(matchesGenres([{ id: 10759, name: 'Action & Adventure' }], [12]), true);
assert.deepEqual(normalizeGenres([horror, horror, drama, null, { id: -1, name: 'bad' }, { id: 5 }]), [{ id: 27, name: 'Kauhu' }, { id: 18, name: 'Draama' }], 'Valid genre IDs are deduplicated and labelled in Finnish');
assert.equal(formatGenres([horror, thriller]), 'Kauhu · Trilleri');
assert.equal(formatGenres([{ id: 10765, name: 'Sci-Fi & Fantasy' }]), 'Sci-fi ja fantasia', 'Combined TV taxonomy remains explicit on the card');
assert.equal(formatGenres(undefined), 'Genret eivät tiedossa');
assert.equal(genreOptions([{ genres: [{ id: 37, name: 'Western' }] }]).some(genre => genre.id === 37), true, 'Additional TMDB genres become selectable');
console.log('PASS: Multi-genre OR, removing selections, reset, combined duration/selector filtering, unknown data, Finnish labels and movie/TV taxonomy.');

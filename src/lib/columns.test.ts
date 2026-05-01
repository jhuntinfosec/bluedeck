import { describe, expect, it } from 'vitest';
import { createColumn, defaultColumns, validateColumn } from './columns';

describe('columns', () => {
  it('creates the default reading columns', () => {
    expect(defaultColumns().map((column) => column.kind)).toEqual(['home', 'notifications']);
  });

  it('validates configurable column settings', () => {
    expect(validateColumn(createColumn('search'))).toBe('Search columns need a query.');
    expect(validateColumn(createColumn('feed'))).toBe('Feed columns need an AT-URI.');
    expect(validateColumn(createColumn('list'))).toBe('List columns need an AT-URI.');
    expect(validateColumn(createColumn('profile'))).toBe('Profile columns need a handle or DID.');
    expect(validateColumn(createColumn('search', { settings: { pollSeconds: 90, query: 'atproto' } }))).toBeUndefined();
  });
});

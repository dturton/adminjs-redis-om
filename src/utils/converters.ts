/* eslint-disable no-param-reassign */
import { Filter } from 'adminjs';
import { Entity, Schema } from 'redis-om';

import { Property } from '../Property';
import { safeParseJSON, safeParseNumber } from './helpers';

export const convertParam = (
  property: Property,
  fields: Schema<Entity>,
  value: string | boolean | number | Record<string, any> | null | undefined,
): string | boolean | number | Record<string, any> | null | undefined => {
  const type = property.type();

  if (type === 'number') {
    return safeParseNumber(value);
  }

  return value;
};

export const convertFilter = (filterObject?: Filter): Record<string, any> => {
  if (!filterObject) return {};

  // eslint-disable-next-line operator-linebreak
  const uuidRegex =
    /^[0-9A-F]{8}-[0-9A-F]{4}-[5|4|3|2|1][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  const { filters = {} } = filterObject;
  return Object.entries(filters).reduce((where, [name, filter]) => {
    if (filter.property.type() === 'number') {
      where[name] = safeParseNumber(filter.value as string);
    } else if (filter.property.type() === 'string') {
      uuidRegex.test(filter.value as string);
      where[name] = filter.value;
    }
    return where;
  }, {});
};

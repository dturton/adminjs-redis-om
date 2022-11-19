/* eslint-disable indent */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
import { BaseRecord, BaseResource, Filter, flat } from 'adminjs';
import { Schema, Entity, Client, EntityValue } from 'redis-om';
import { Property } from './Property';
import { convertFilter } from './utils/converters';

enum direction {
  asc = 'ASC',
  desc = 'DESC',
}

export class Resource extends BaseResource {
  schema: Schema<Entity>;

  client: Client;

  private propertiesObject: Record<string, any>;

  constructor(args: { schema; client }) {
    super(args);
    this.schema = args.schema;
    this.client = args.client;
    this.propertiesObject = this.prepareProperties();
  }

  public databaseName(): string {
    return 'redis';
  }

  public properties(): Array<Property> {
    return [...Object.values(this.propertiesObject)];
  }

  async count(filter: Filter): Promise<number> {
    const parsedFilters = convertFilter(filter);
    const searchPath = await this.createSearch(parsedFilters);

    return searchPath.count();
  }

  public property(path: string): Property | null {
    return this.propertiesObject[path] ?? null;
  }

  public id(): string {
    return this.schema.indexName;
  }

  public build(params: Record<string, any>): BaseRecord {
    return new BaseRecord(flat.unflatten(params), this);
  }

  public async create(
    params: Record<string, any>,
  ): Promise<Record<string, any>> {
    const preparedParams = this.prepareParams(params);

    const result = await this.client
      .fetchRepository(this.schema)
      .createAndSave(preparedParams);

    return this.prepareReturnValues(result.toJSON());
  }

  public async findOne(id: string): Promise<BaseRecord | null> {
    const idProperty = this.properties().find((property) => property.isId());
    if (!idProperty) return null;

    const result = await this.client.fetchRepository(this.schema).fetch(id);

    return new BaseRecord(this.prepareReturnValues(result.toJSON()), this);
  }

  public async delete(id: string): Promise<void> {
    await this.client.fetchRepository(this.schema).remove(id);
  }

  async findMany(ids: string[]) {
    const idProperty = this.properties().find((property) => property.isId());
    if (!idProperty) return [];

    const records = await this.client.fetchRepository(this.schema).fetch(ids);
    return records.map(
      (result) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new BaseRecord(this.prepareReturnValues(result.toJSON()), this),
    );
  }

  private async createSearch(parsedFilters) {
    const repository = await this.client.fetchRepository(this.schema);
    await repository.createIndex();
    const searchPath = repository.search();
    Object.keys(parsedFilters).forEach((key) => {
      const value = parsedFilters[key];
      searchPath.where(key).eq(value);
    });
    return searchPath;
  }

  async find(
    filter: Filter,
    options: {
      limit?: number | undefined;
      offset?: number | undefined;
      sort?:
        | {
            sortBy?: string | undefined;
            direction?: 'asc' | 'desc' | undefined;
          }
        | undefined;
    },
  ): Promise<BaseRecord[]> {
    const parsedFilters = convertFilter(filter);
    const searchPath = await this.createSearch(parsedFilters);
    const searchPathSorted = options?.sort?.sortBy
      ? searchPath.sortBy(
          options.sort.sortBy,
          direction[options.sort.direction as 'asc' | 'desc'],
        )
      : searchPath;
    let records: Entity[];
    if (options.limit) {
      const offset = options.offset || 0;
      records = await searchPathSorted.return.page(offset, options.limit);
    } else {
      records = await searchPathSorted.return.all();
    }
    return records.map(
      (result) =>
        // eslint-disable-next-line implicit-arrow-linebreak
        new BaseRecord(this.prepareReturnValues(result.toJSON()), this),
    );
  }

  public static isAdapterFor(args: {
    model: Schema<Entity>;
    client: Client;
  }): boolean {
    const { model } = args;
    return model instanceof Schema;
  }

  private prepareReturnValues(
    params: Record<string, any>,
  ): Record<string, any> {
    const preparedValues: Record<string, any> = {};

    for (const property of this.properties()) {
      const param = flat.get(params, property.name());
      const key = property.name();

      preparedValues[key] = param;
    }

    return preparedValues;
  }

  private prepareProperties(): { [propertyPath: string]: Property } {
    const fields = Object.keys(this.schema.definition);

    return fields.reduce((memo, field, index) => {
      const property = new Property(
        field,
        this.schema.definition[field],
        index,
      );
      memo[property.name()] = property;

      return memo;
    }, {});
  }

  private prepareParams(
    params: Record<string, any>,
  ): Record<string, EntityValue> {
    const preparedParams: Record<string, EntityValue> = {};

    for (const property of this.properties()) {
      const key = property.name();

      preparedParams[key] = params[key];
    }

    return preparedParams;
  }
}

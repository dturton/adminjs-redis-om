/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
import { BaseRecord, BaseResource, Filter, flat } from 'adminjs';
import { Schema, Entity, Client, EntityValue, WhereField } from 'redis-om';
import { Property } from './Property';
import { convertFilter } from './utils/converters';

export class Resource extends BaseResource {
  schema: Schema<Entity>;

  client: Client;

  private propertiesObject: Record<string, any>;

  constructor(schema: Schema<Entity>, client: Client) {
    super();
    this.schema = schema;
    this.client = client;
    this.propertiesObject = this.prepareProperties();
  }

  public databaseName(): string {
    return 'redis';
  }

  public properties(): Array<Property> {
    return [...Object.values(this.propertiesObject)];
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

    return new BaseRecord(this.prepareReturnValues(result), this);
  }

  public async delete(id: string): Promise<void> {
    await this.client.fetchRepository(this.schema).remove(id);
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
    const repository = await this.client.fetchRepository(this.schema);
    await repository.createIndex();
    const searchPath = repository.search();
    Object.keys(parsedFilters).forEach((key) => {
      const value = parsedFilters[key];
      searchPath.where(key).eq(value);
    });

    let records: Entity[];
    if (options.limit) {
      const offset = options.offset || 0;
      records = await searchPath.returnPage(offset, options.limit);
    } else {
      records = await searchPath.returnAll();
    }
    return records.map(
      (result) => new BaseRecord(this.prepareReturnValues(result), this),
    );
  }

  public static isAdapterFor(args: {
    model: Schema<Entity>;
    client: Client;
  }): boolean {
    const { model, client } = args;
    return model instanceof Schema && client instanceof Client;
  }

  private prepareReturnValues(
    params: Record<string, any>,
  ): Record<string, any> {
    const preparedValues: Record<string, any> = {};

    for (const property of this.properties()) {
      const param = flat.get(params, property.path());
      const key = property.path();

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
      memo[property.path()] = property;

      return memo;
    }, {});
  }

  private prepareParams(
    params: Record<string, any>,
  ): Record<string, EntityValue> {
    const preparedParams: Record<string, EntityValue> = {};

    for (const property of this.properties()) {
      const key = property.path();

      preparedParams[key] = params[key];
    }

    return preparedParams;
  }
}

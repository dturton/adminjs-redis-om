/* eslint-disable class-methods-use-this */
import { Client, Entity, Schema } from 'redis-om';

import { BaseDatabase } from 'adminjs';

import { Resource } from './Resource';

export class Database extends BaseDatabase {
  private client: Client;

  public constructor(
    public readonly redisOmClient: Client,
    public readonly schema: Schema<Entity>,
  ) {
    super(redisOmClient);
    this.schema = schema;
    this.client = redisOmClient;
  }

  public resources(): Array<Resource> {
    const resource = new Resource({ schema: this.schema, client: this.client });
    return [resource];
  }
}

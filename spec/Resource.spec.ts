import { Client, Entity, Schema } from 'redis-om';
import { BaseProperty, BaseRecord, Filter } from 'adminjs';
import recordSchema from './om/schema';
import { Resource } from '../src/Resource';

describe('Resource', () => {
  let resource: Resource;
  let client: Client;
  let schema: Schema<Entity>;

  const data = {
    status: 'test',
    name: 'test',
  };

  beforeAll(async () => {
    client = new Client();
    schema = recordSchema;
    await client.open(process.env.REDIS_URL);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    resource = new Resource({ schema, client });
  });

  describe('#databaseType', () => {
    it('returns database dialect', () => {
      expect(resource.databaseType()).toEqual('other');
    });
  });

  describe('.isAdapterFor', () => {
    it('returns true when Prisma model is given', () => {
      expect(
        Resource.isAdapterFor({
          model: schema,
          client,
        }),
      ).toEqual(true);
    });

    it('returns false for any other kind of resources', () => {
      expect(Resource.isAdapterFor({} as any)).toEqual(false);
    });
  });

  describe('#id', () => {
    it('returns the name of the entity', () => {
      expect(resource.id()).toEqual('records');
    });
  });

  describe('#properties', () => {
    it('returns all the properties', () => {
      expect(resource.properties()).toHaveLength(4);
    });
  });

  describe('#property', () => {
    it('returns selected property', () => {
      const property = resource.property('status');

      expect(property).toBeInstanceOf(BaseProperty);
    });
  });

  describe('#create', () => {
    it('returns params', async () => {
      const params = await resource.create(data);

      expect(params.status).toEqual('test');
    });
  });

  describe('#delete', () => {
    let record;

    beforeEach(async () => {
      record = await resource.create(data);
    });

    it('deletes the resource', async () => {
      await resource.delete(record.id);
      const deletedRecord = await resource.findOne(record.id);
      expect(deletedRecord).toBeNull();
    });
  });

  describe('#find', () => {
    let record: BaseRecord[];

    it('finds by record status', async () => {
      await resource.create({
        name: 'Another one',
        status: 'status-filter',
      });

      const filter = new Filter(undefined, resource);
      filter.filters = {
        status: {
          path: 'status',
          value: 'status-filter',
          property: resource.property('status') as BaseProperty,
        },
      };
      record = await resource.find(filter, { limit: 10, offset: 0 });

      expect(record.length).toBeGreaterThan(0);
    });
  });

  describe('#findOne', () => {
    it('finds by record id', async () => {
      const recordToFind = await resource.create({
        name: 'Another one find one',
        status: 'test',
      });

      const record = await resource.findOne(recordToFind.id);

      expect(record).toBeDefined();
    });
  });
});

import { Schema, Entity, EntityData } from 'redis-om';

export class RecordInstance extends Entity {
  id: string;

  constructor(schema: Schema<any>, id: string, data?: EntityData) {
    super(schema, id, data);
    this.id = id;
  }
}

const recordSchema = new Schema(
  RecordInstance,
  {
    name: { type: 'string' },
    status: { type: 'string' },
    createdAt: { type: 'date' },
    startedAt: { type: 'date' },
  },
  {
    indexName: 'records',
  },
);

export default recordSchema;

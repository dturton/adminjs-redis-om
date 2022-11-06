import { Schema, Entity } from 'redis-om';

export class RecordInstance extends Entity {}

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

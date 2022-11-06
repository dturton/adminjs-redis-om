import { BaseProperty, PropertyType } from 'adminjs';
import { FieldDefinition } from 'redis-om';
import { DATA_TYPES } from './utils/data-types';

export class Property extends BaseProperty {
  property: { name: string } & FieldDefinition & { propertyPosition: number };

  constructor(
    name: string,
    definition: FieldDefinition,
    propertyPosition: number,
  ) {
    const path = name;
    super({ path });
    this.property = { name, ...definition, propertyPosition };
  }

  public name(): string {
    return this.property.name;
  }

  public isId(): boolean {
    return this.property.name === 'id' || this.property.name === 'entityId';
  }

  public isEditable(): boolean {
    return (
      !this.isId() && this.name() !== 'createdAt' && this.name() !== 'updatedAt'
    );
  }

  public position(): number {
    return this.property.propertyPosition;
  }

  public type(): PropertyType {
    return DATA_TYPES[this.property.type];
  }
}

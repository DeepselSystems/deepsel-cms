import APISchemaState from '../stores/APISchemaState.js';
import {useMemo, useCallback} from 'react';

export default function useAPISchema(modelName) {
  const {APISchema} = APISchemaState();

  const createOneResponseSchema = useMemo(() => {
    if (!APISchema || !modelName) return null;
    const schemaId = APISchema.paths[`/${modelName}`].post.responses[
      '200'
    ].content['application/json'].schema.$ref
      .split('/')
      .pop();
    return APISchema.components.schemas[schemaId];
  }, [APISchema, modelName]);

  const getOneResponseSchema = useMemo(() => {
    if (!APISchema || !modelName) return null;
    const schemaId = APISchema.paths[`/${modelName}/{item_id}`].get.responses[
      '200'
    ].content['application/json'].schema.$ref
      .split('/')
      .pop();
    return APISchema.components.schemas[schemaId];
  }, [APISchema, modelName]);

  const searchResponseSchema = useMemo(() => {
    if (!APISchema || !modelName) return null;
    const schemaId = APISchema.paths[`/${modelName}/search`].post.responses[
      '200'
    ].content['application/json'].schema.$ref
      .split('/')
      .pop();
    return APISchema.components.schemas[schemaId];
  }, [APISchema, modelName]);

  const searchItemResponseSchema = useMemo(() => {
    if (!searchResponseSchema) return null;
    const schemaId = searchResponseSchema.properties.data.items.$ref
      .split('/')
      .pop();
    return APISchema.components.schemas[schemaId];
  }, [searchResponseSchema]);

  const getFieldColTypes = useCallback(
    (fieldName) => {
      if (!getOneResponseSchema && !fieldName) return null;
      const field = getOneResponseSchema.properties[fieldName];
      if (!field) return [];

      // simple field
      if (field.type) {
        return [{type: field.type}];
      }

      // enum field
      if (field.$ref) {
        const refSchema = getSchemaFromRef(field.$ref);
        if (refSchema.type === 'string' && refSchema.enum) {
          return [
            {
              type: 'enum',
              enum: refSchema.enum,
            },
          ];
        }
        return [{type: refSchema.type}];
      }

      // multi-type field
      return field.anyOf.map((item) => {
        if (item.type === 'string' && item.format === 'date-time') {
          return {type: 'date-time'};
        }
        return {type: item.type};
      });
    },
    [getOneResponseSchema]
  );

  const getSchemaFromRef = useCallback(
    (ref) => {
      if (!APISchema || !ref) return null;
      const schemaId = ref.split('/').pop();
      return APISchema.components.schemas[schemaId];
    },
    [APISchema]
  );

  return {
    APISchema,
    createOneResponseSchema,
    getOneResponseSchema,
    searchResponseSchema,
    searchItemResponseSchema,
    getFieldColTypes,
  };
}

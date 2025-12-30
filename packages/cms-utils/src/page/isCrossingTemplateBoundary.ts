import { getPathType } from './getPathType';

export const isCrossingTemplateBoundary = (fromPath: string, toPath: string) => {
  const fromPathType = getPathType(fromPath).pathType;
  const toPathType = getPathType(toPath).pathType;
  console.log(
    'isCrossingTemplateBoundary',
    { fromPathType, toPathType, fromPath, toPath },
    fromPathType !== toPathType,
  );
  return fromPathType !== toPathType;
};

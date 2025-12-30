import { getPathType } from './getPathType';

export const isCrossingTemplateBoundary = (fromPath: string, toPath: string) => {
  const fromPathType = getPathType(fromPath);
  const toPathType = getPathType(toPath);
  return fromPathType !== toPathType;
};

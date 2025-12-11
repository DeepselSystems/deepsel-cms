export default function isObjectOrArray(value) {
  return (
    value !== null &&
    (Array.isArray(value) ||
      Object.prototype.toString.call(value) === '[object Object]')
  );
}

export function errorToJsonString(err: Error): string {
  return JSON.stringify(err, ['message', 'arguments', 'type', 'name', 'stack']);
}

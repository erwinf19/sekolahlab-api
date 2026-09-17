// Internal fixtures only. Never expose users.json as a public static file.
const collections = {
  users: require('./users.json'),
  students: require('./students.json'),
  teachers: require('./teachers.json'),
  subjects: require('./subjects.json'),
  news: require('./news.json'),
  classes: require('./classes.json'),
  majors: require('./majors.json')
};
// Return a copy so future simulated edits cannot mutate the shared fixtures.
exports.readCollection = (name) => {
  if (!Object.hasOwn(collections, name)) throw new Error('Unknown collection');
  return structuredClone(collections[name]);
};

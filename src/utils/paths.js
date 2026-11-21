// One place that knows the URL layout. `base` is '/app' (students) or '/admin'.
export const notePath = (base, id) => `${base}/notes/${encodeURIComponent(id)}`;
export const noteEditPath = (base, id) => `${base}/notes/${encodeURIComponent(id)}/edit`;
export const newNotePath = (base) => `${base}/notes/new`;
export const basePathFor = (user) => (user && user.role === 'admin' ? '/admin' : '/app');

export function resetAll() {
  localStorage.clear();
}

export function makeNote(id, overrides = {}) {
  return {
    id,
    title: id,
    content: '',
    subject: '',
    course: '',
    faculty: '',
    semester: '',
    tags: [],
    ownerId: 'me',
    ownerName: 'Me',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    archived: false,
    likedBy: [],
    downloads: [],
    file: null,
    ...overrides,
  };
}

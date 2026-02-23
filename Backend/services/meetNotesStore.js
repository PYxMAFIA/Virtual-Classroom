const captionsByClassroom = new Map();

function appendCaption(classroomId, caption) {
  if (!classroomId || !caption) return;
  const key = String(classroomId);
  const list = captionsByClassroom.get(key) || [];
  list.push({ text: String(caption).slice(0, 2000), at: new Date().toISOString() });
  // keep last ~500 captions to avoid unbounded growth
  if (list.length > 500) list.splice(0, list.length - 500);
  captionsByClassroom.set(key, list);
}

function getTranscript(classroomId) {
  const list = captionsByClassroom.get(String(classroomId)) || [];
  return list.map((c) => c.text).join('\n');
}

function clearTranscript(classroomId) {
  captionsByClassroom.delete(String(classroomId));
}

module.exports = { appendCaption, getTranscript, clearTranscript };

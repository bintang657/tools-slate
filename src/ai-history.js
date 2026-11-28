// Keep recent turns within the API's message and size limits without mutating chat history.
export function normalizeHistory(messages) {
  const normalized = []
  for (const message of messages) {
    if (!message.content?.trim()) continue
    const previous = normalized[normalized.length - 1]
    if (previous?.role === message.role) {
      previous.content = `${previous.content}\n\n${message.content}`.slice(-24000)
      previous.attachments = [...previous.attachments, ...(message.attachments || [])]
    } else normalized.push({ ...message, content: message.content.slice(-24000), attachments: [...(message.attachments || [])] })
  }
  const recent = normalized.slice(-18)
  while (recent.length && recent[0].role !== 'user') recent.shift()
  return recent
}

export function searchChats(chats, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  return chats.filter(chat => {
    const text = [chat.title || '', ...chat.messages.map(message => message.displayContent ?? message.content ?? '')].join(' ').toLocaleLowerCase()
    return terms.every(term => text.includes(term))
  })
}

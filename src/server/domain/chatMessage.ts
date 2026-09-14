/** Which assistant rail owns a chat. Stored on `Chats.surface`. */
const chatSurfaces = ['admin', 'customer', 'cook'] as const;

export type ChatSurface = (typeof chatSurfaces)[number];

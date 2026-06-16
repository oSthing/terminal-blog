// Friend links — single source of truth for both /links and the
// terminal `friends` command.

export interface Friend {
  name: string;
  url: string;
  description: string;
  tags?: string[];
}

export const friends: Friend[] = [
  {
    name: 'example',
    url: 'https://example.com',
    description: 'placeholder entry — replace with real friends.',
    tags: ['placeholder'],
  },
];

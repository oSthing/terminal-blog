/**
 * Virtual filesystem — a lightweight, in-memory tree shared with the terminal.
 *
 * Nodes are either directories (with `children`) or files (with `content`).
 * Paths are POSIX-style: leading `/`, segments separated by `/`.
 */

export interface FsFile {
  type: 'file';
  name: string;
  content: string;
}

export interface FsDirectory {
  type: 'dir';
  name: string;
  children: FsNode[];
}

export type FsNode = FsFile | FsDirectory;

export class VirtualFileSystem {
  private root: FsDirectory;

  constructor(root: FsDirectory) {
    this.root = root;
  }

  private normalize(path: string): string {
    if (!path.startsWith('/')) path = '/' + path;
    const segments: string[] = [];
    for (const segment of path.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') segments.pop();
      else segments.push(segment);
    }
    return '/' + segments.join('/');
  }

  private walk(path: string): FsNode | null {
    const normalized = this.normalize(path);
    if (normalized === '/') return this.root;
    const parts = normalized.slice(1).split('/');
    let current: FsNode = this.root;
    for (const part of parts) {
      if (current.type !== 'dir') return null;
      const next = current.children.find((c) => c.name === part);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  exists(path: string): boolean {
    return this.walk(path) !== null;
  }

  isDir(path: string): boolean {
    const node = this.walk(path);
    return node !== null && node.type === 'dir';
  }

  read(path: string): string | null {
    const node = this.walk(path);
    if (!node || node.type !== 'file') return null;
    return node.content;
  }

  list(path: string): FsNode[] | null {
    const node = this.walk(path);
    if (!node || node.type !== 'dir') return null;
    return node.children;
  }

  resolve(cwd: string, path: string): string {
    return this.normalize(path.startsWith('/') ? path : `${cwd === '/' ? '' : cwd}/${path}`);
  }
}

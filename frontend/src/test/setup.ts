import '@testing-library/jest-dom/vitest';

class MemoryStorage implements Storage {
	private store = new Map<string, string>();

	get length() {
		return this.store.size;
	}

	clear() {
		this.store.clear();
	}

	getItem(key: string) {
		return this.store.get(key) ?? null;
	}

	key(index: number) {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string) {
		this.store.delete(key);
	}

	setItem(key: string, value: string) {
		this.store.set(key, value);
	}
}

Object.defineProperty(window, 'localStorage', {
	value: new MemoryStorage(),
	writable: true,
});

// jsdom には ResizeObserver が無い。Radix の ScrollArea などが参照するため最小実装を入れる
if (!('ResizeObserver' in globalThis)) {
	class ResizeObserverStub {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	Object.defineProperty(globalThis, 'ResizeObserver', {
		value: ResizeObserverStub,
		writable: true,
	});
}

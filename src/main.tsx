import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * Monkey-patch para prevenir crashes causados por extensões de browser.
 *
 * Extensões como ad blockers, password managers, e outras podem modificar o DOM
 * enquanto o React está renderizando. Isso causa erros como:
 * - "Failed to execute 'insertBefore' on 'Node'"
 * - "Failed to execute 'removeChild' on 'Node'"
 *
 * Este patch intercepta esses métodos e ignora silenciosamente os erros,
 * permitindo que a aplicação continue funcionando.
 *
 * Usado por apps como Notion, Linear, etc.
 */
if (typeof Node !== "undefined") {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null
  ): T {
    try {
      return originalInsertBefore.call(this, newNode, referenceNode);
    } catch (e) {
      console.warn("[DOM Patch] insertBefore error intercepted:", e);
      return newNode;
    }
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child);
    } catch (e) {
      console.warn("[DOM Patch] removeChild error intercepted:", e);
      return child;
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <App />,
);

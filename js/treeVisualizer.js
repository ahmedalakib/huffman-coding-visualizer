/**
 * TreeVisualizer - Tactile, Interactive Huffman Tree Canvas
 * Handcrafted for ICE 245 Algorithm Course
 * - Tap / Click anywhere on canvas to advance step-by-step
 * - Authentic engineering graph/dot-grid background
 * - Circular nodes styled after handwritten notes
 * - Organic ripples and smooth transitions
 * - Pan and zoom with wheel and drag
 */

class TreeVisualizer {
  constructor(containerId, onCanvasTap = null) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.onCanvasTap = onCanvasTap;
    this.svg = null;
    this.contentGroup = null;
    this.transform = { x: 50, y: 50, scale: 1 };

    // Drag vs Click detection
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.mouseDownPos = { x: 0, y: 0 };

    this.nodeRadius = 24;
    this.levelHeight = 92;
    this.minNodeDist = 72;

    this.highlightedNodeIds = new Set();
    this.activeNodes = new Set();
    this.activePathNodes = new Set();
    this.activeTracerNodeId = null;
    this.currentRoots = [];

    this.initSVG();
    this.initEvents();
  }

  initSVG() {
    // Only create SVG once without wiping non-SVG sibling elements
    let existingSvg = this.container.querySelector('svg.huffman-canvas-svg');
    if (existingSvg) {
      this.svg = existingSvg;
      this.contentGroup = this.svg.querySelector('.viewport-group');
      return;
    }

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.classList.add('huffman-canvas-svg');

    // Defs: filters, glow, and dot-grid pattern
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <!-- Engineering Dot Grid Pattern -->
      <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
        <circle cx="12" cy="12" r="1" fill="var(--grid-dot, rgba(255,255,255,0.07))" />
      </pattern>

      <!-- Glow filters -->
      <filter id="glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-gold" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `;
    this.svg.appendChild(defs);

    // Background rect with dot-grid
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'url(#dot-grid)');
    bgRect.classList.add('canvas-bg-grid');
    this.svg.appendChild(bgRect);

    // Viewport group for pan/zoom
    this.contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.contentGroup.classList.add('viewport-group');
    this.svg.appendChild(this.contentGroup);

    this.container.appendChild(this.svg);
  }

  initEvents() {
    this.container.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('.no-tap')) return;
      this.isDragging = true;
      this.mouseDownPos = { x: e.clientX, y: e.clientY };
      this.dragStart = { x: e.clientX - this.transform.x, y: e.clientY - this.transform.y };
      this.container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.transform.x = e.clientX - this.dragStart.x;
      this.transform.y = e.clientY - this.dragStart.y;
      this.updateTransform();
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.container.style.cursor = 'grab';

      const dist = Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y);
      if (dist < 6 && this.container.contains(e.target)) {
        if (!e.target.closest('button') && !e.target.closest('.no-tap')) {
          this.triggerTap(e.clientX, e.clientY);
        }
      }
    });

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.mouseDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.dragStart = {
          x: e.touches[0].clientX - this.transform.x,
          y: e.touches[0].clientY - this.transform.y
        };
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        this.transform.x = e.touches[0].clientX - this.dragStart.x;
        this.transform.y = e.touches[0].clientY - this.dragStart.y;
        this.updateTransform();
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      if (e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dist = Math.hypot(touch.clientX - this.mouseDownPos.x, touch.clientY - this.mouseDownPos.y);
        if (dist < 10) {
          this.triggerTap(touch.clientX, touch.clientY);
        }
      }
    });

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
      const newScale = Math.min(Math.max(0.25, this.transform.scale * zoomFactor), 4.0);

      this.transform.x = mouseX - (mouseX - this.transform.x) * (newScale / this.transform.scale);
      this.transform.y = mouseY - (mouseY - this.transform.y) * (newScale / this.transform.scale);
      this.transform.scale = newScale;

      this.updateTransform();
    }, { passive: false });
  }

  triggerTap(clientX, clientY) {
    this.createRipple(clientX, clientY);
    if (typeof this.onCanvasTap === 'function') {
      this.onCanvasTap();
    }
  }

  createRipple(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.className = 'canvas-tap-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    this.container.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 600);
  }

  updateTransform() {
    if (!this.contentGroup) return;
    this.contentGroup.setAttribute(
      'transform',
      `translate(${this.transform.x}, ${this.transform.y}) scale(${this.transform.scale})`
    );
  }

  zoomIn() {
    this.transform.scale = Math.min(4.0, this.transform.scale * 1.25);
    this.updateTransform();
  }

  zoomOut() {
    this.transform.scale = Math.max(0.25, this.transform.scale * 0.8);
    this.updateTransform();
  }

  resetZoom() {
    this.transform = { x: 50, y: 50, scale: 1 };
    this.updateTransform();
  }

  renderForest(roots, options = {}) {
    this.currentRoots = roots || [];
    this.highlightedNodeIds = new Set(options.highlightedNodeIds || []);
    this.activeNodes = new Set(options.activeNodes || []);
    this.activePathNodes = new Set(options.activePathNodes || []);
    this.activeTracerNodeId = options.activeTracerNodeId || null;

    if (!this.contentGroup) return;
    this.contentGroup.innerHTML = '';

    if (!roots || roots.length === 0) return;

    let currentXOffset = 60;
    const allPlacedNodes = [];
    const allPlacedEdges = [];

    roots.forEach((root) => {
      const { placedNodes, placedEdges, boundingBox } = this.layoutTree(root, currentXOffset, 65);
      allPlacedNodes.push(...placedNodes);
      allPlacedEdges.push(...placedEdges);
      currentXOffset += boundingBox.width + 55;
    });

    const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    allPlacedEdges.forEach(edge => this.renderEdge(edgesGroup, edge));
    this.contentGroup.appendChild(edgesGroup);

    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    allPlacedNodes.forEach(node => this.renderNode(nodesGroup, node));
    this.contentGroup.appendChild(nodesGroup);

    if (options.autoFit) {
      this.fitToScreen();
    }
  }

  layoutTree(root, startX, startY) {
    const placedNodes = [];
    const placedEdges = [];

    const computePositions = (node, depth) => {
      if (!node) return { width: 0, leftSpan: 0, rightSpan: 0 };
      node._y = startY + depth * this.levelHeight;

      if (node.isLeaf) {
        node._width = this.minNodeDist;
        return { width: node._width, leftSpan: node._width / 2, rightSpan: node._width / 2 };
      }

      const leftRes = computePositions(node.left, depth + 1);
      const rightRes = computePositions(node.right, depth + 1);

      const childDist = Math.max(this.minNodeDist, (leftRes.rightSpan + rightRes.leftSpan) + 16);
      node._childDist = childDist;
      node._width = leftRes.width + rightRes.width + 16;

      return {
        width: node._width,
        leftSpan: childDist / 2 + leftRes.leftSpan,
        rightSpan: childDist / 2 + rightRes.rightSpan
      };
    };

    computePositions(root, 0);

    let minX = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const assignX = (node, x) => {
      if (!node) return;
      node._x = x;
      minX = Math.min(minX, x - this.nodeRadius);
      maxX = Math.max(maxX, x + this.nodeRadius);
      maxY = Math.max(maxY, node._y + this.nodeRadius);

      placedNodes.push(node);

      if (node.left) {
        const leftX = x - node._childDist / 2;
        assignX(node.left, leftX);
        placedEdges.push({ from: node, to: node.left, bit: '0', isLeft: true });
      }

      if (node.right) {
        const rightX = x + node._childDist / 2;
        assignX(node.right, rightX);
        placedEdges.push({ from: node, to: node.right, bit: '1', isLeft: false });
      }
    };

    assignX(root, startX + (root._width || this.minNodeDist) / 2);

    if (minX < startX) {
      const shift = startX - minX;
      placedNodes.forEach(n => { n._x += shift; });
      maxX += shift;
      minX += shift;
    }

    return {
      placedNodes,
      placedEdges,
      boundingBox: { width: Math.max(this.minNodeDist, maxX - minX), height: maxY - startY }
    };
  }

  renderEdge(group, edge) {
    const { from, to, bit, isLeft } = edge;
    const isPathActive = this.activePathNodes.has(from.id) && this.activePathNodes.has(to.id);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from._x);
    line.setAttribute('y1', from._y);
    line.setAttribute('x2', to._x);
    line.setAttribute('y2', to._y);
    line.setAttribute('stroke', isPathActive ? 'var(--branch-active, #38bdf8)' : 'var(--edge-line, #64748b)');
    line.setAttribute('stroke-width', isPathActive ? '3.5' : '2');
    line.setAttribute('stroke-linecap', 'round');
    if (isPathActive) line.setAttribute('filter', 'url(#glow-cyan)');
    g.appendChild(line);

    const labelX = from._x * 0.45 + to._x * 0.55;
    const labelY = from._y * 0.45 + to._y * 0.55;

    const badge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    badge.setAttribute('transform', `translate(${labelX}, ${labelY})`);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '9.5');
    circle.setAttribute('fill', isPathActive ? '#0284c7' : (bit === '0' ? 'var(--badge-0-bg, #1e3a8a)' : 'var(--badge-1-bg, #78350f)'));
    circle.setAttribute('stroke', isPathActive ? '#7dd3fc' : (bit === '0' ? '#60a5fa' : '#f59e0b'));
    circle.setAttribute('stroke-width', '1.2');
    badge.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '0');
    text.setAttribute('y', '3.5');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', '700');
    text.setAttribute('font-family', 'var(--font-mono)');
    text.textContent = bit;
    badge.appendChild(text);

    g.appendChild(badge);
    group.appendChild(g);
  }

  renderNode(group, node) {
    const isHighlighted = this.highlightedNodeIds.has(node.id);
    const isActiveSelection = this.activeNodes.has(node.id);
    const isPathActive = this.activePathNodes.has(node.id);
    const isTracerActive = this.activeTracerNodeId === node.id;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${node._x}, ${node._y})`);
    g.classList.add('tree-node-item');
    g.dataset.nodeId = node.id;

    if (isTracerActive || isHighlighted || isActiveSelection || isPathActive) {
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glow.setAttribute('r', (this.nodeRadius + 6).toString());
      glow.setAttribute('fill', 'none');
      if (isTracerActive) {
        glow.setAttribute('stroke', '#38bdf8');
        glow.setAttribute('stroke-width', '3.5');
        glow.setAttribute('filter', 'url(#glow-cyan)');
        glow.classList.add('pulse-ring');
      } else if (isHighlighted) {
        glow.setAttribute('stroke', '#fbbf24');
        glow.setAttribute('stroke-width', '3');
        glow.setAttribute('filter', 'url(#glow-gold)');
      } else if (isActiveSelection) {
        glow.setAttribute('stroke', '#34d399');
        glow.setAttribute('stroke-width', '3');
        glow.setAttribute('filter', 'url(#glow-green)');
      } else {
        glow.setAttribute('stroke', '#38bdf8');
        glow.setAttribute('stroke-width', '2.5');
      }
      g.appendChild(glow);
    }

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', this.nodeRadius.toString());

    if (node.isLeaf) {
      circle.setAttribute('fill', 'var(--leaf-node-fill, #064e3b)');
      circle.setAttribute('stroke', isPathActive || isTracerActive ? '#34d399' : 'var(--leaf-node-stroke, #059669)');
      circle.setAttribute('stroke-width', '2.5');
    } else {
      circle.setAttribute('fill', isHighlighted ? 'var(--parent-new-fill, #78350f)' : 'var(--internal-node-fill, #1e1b4b)');
      circle.setAttribute('stroke', isHighlighted ? '#f59e0b' : 'var(--internal-node-stroke, #6366f1)');
      circle.setAttribute('stroke-width', '2.5');
    }
    g.appendChild(circle);

    const weightText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    weightText.setAttribute('x', '0');
    weightText.setAttribute('y', '5');
    weightText.setAttribute('text-anchor', 'middle');
    weightText.setAttribute('fill', 'var(--node-text, #ffffff)');
    weightText.setAttribute('font-size', '14');
    weightText.setAttribute('font-weight', '700');
    weightText.setAttribute('font-family', 'var(--font-mono)');
    weightText.textContent = node.weight;
    g.appendChild(weightText);

    if (node.isLeaf && node.char !== null) {
      const symBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      symBadge.setAttribute('transform', 'translate(0, -32)');

      const symRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      symRect.setAttribute('x', '-12');
      symRect.setAttribute('y', '-9');
      symRect.setAttribute('width', '24');
      symRect.setAttribute('height', '18');
      symRect.setAttribute('rx', '5');
      symRect.setAttribute('fill', 'var(--badge-sym-fill, #10b981)');
      symRect.setAttribute('stroke', 'var(--badge-sym-stroke, #6ee7b7)');
      symRect.setAttribute('stroke-width', '1');
      symBadge.appendChild(symRect);

      const symText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      symText.setAttribute('x', '0');
      symText.setAttribute('y', '3.5');
      symText.setAttribute('text-anchor', 'middle');
      symText.setAttribute('fill', '#ffffff');
      symText.setAttribute('font-size', '11');
      symText.setAttribute('font-weight', '800');
      symText.textContent = node.char;
      symBadge.appendChild(symText);

      g.appendChild(symBadge);

      if (node.code) {
        const codeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        codeText.setAttribute('x', '0');
        codeText.setAttribute('y', '38');
        codeText.setAttribute('text-anchor', 'middle');
        codeText.setAttribute('fill', 'var(--code-label-color, #38bdf8)');
        codeText.setAttribute('font-size', '12');
        codeText.setAttribute('font-weight', '700');
        codeText.setAttribute('font-family', 'var(--font-mono)');
        codeText.textContent = node.code;
        g.appendChild(codeText);
      }
    }

    group.appendChild(g);
  }

  fitToScreen() {
    if (!this.contentGroup) return;
    const containerW = this.container.clientWidth || 800;
    const containerH = this.container.clientHeight || 500;
    const bbox = this.contentGroup.getBBox();
    if (bbox.width === 0 || bbox.height === 0) return;

    const pad = 50;
    const scaleX = (containerW - pad * 2) / bbox.width;
    const scaleY = (containerH - pad * 2) / bbox.height;
    let newScale = Math.min(scaleX, scaleY, 1.3);
    newScale = Math.max(0.35, newScale);

    const newX = (containerW - bbox.width * newScale) / 2 - bbox.x * newScale;
    const newY = 40 - bbox.y * newScale;

    this.transform = { x: newX, y: newY, scale: newScale };
    this.updateTransform();
  }

  highlightPathToChar(targetChar) {
    if (!this.currentRoots || this.currentRoots.length === 0) return;
    const root = this.currentRoots[0];
    const pathNodes = [];

    const findPath = (node) => {
      if (!node) return false;
      pathNodes.push(node.id);
      if (node.isLeaf && node.char === targetChar) return true;
      if (node.left && findPath(node.left)) return true;
      if (node.right && findPath(node.right)) return true;
      pathNodes.pop();
      return false;
    };

    if (findPath(root)) {
      this.activePathNodes = new Set(pathNodes);
    } else {
      this.activePathNodes.clear();
    }

    this.renderForest(this.currentRoots, {
      activePathNodes: Array.from(this.activePathNodes)
    });
  }

  clearPathHighlight() {
    this.activePathNodes.clear();
    this.activeTracerNodeId = null;
    this.renderForest(this.currentRoots);
  }
}

if (typeof window !== 'undefined') {
  window.TreeVisualizer = TreeVisualizer;
}

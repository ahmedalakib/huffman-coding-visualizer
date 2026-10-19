/**
 * Huffman Visualizer - App Controller (Course Relevant & Tactile Edition)
 * ICE 245 Project
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentResult = null;
  let currentStepIndex = 0;

  // Initialize visualizer with tap-to-advance callback
  const visualizer = new TreeVisualizer('tree-canvas-container', () => {
    advanceNextPart();
  });
  const engine = new HuffmanEngine();

  // DOM Elements - Input & Presets
  const inputEl = document.getElementById('main-input');
  const btnBuild = document.getElementById('btn-build');
  const presetChips = document.querySelectorAll('.preset-row .preset-chip');

  // Stepper Elements
  const stepNumberTag = document.getElementById('step-number-tag');
  const stepHeadline = document.getElementById('step-headline');
  const stepTrailContainer = document.getElementById('step-trail-container');

  // Floating Nav Buttons on Canvas
  const floatBtnPrev = document.getElementById('float-btn-prev');
  const floatBtnNext = document.getElementById('float-btn-next');
  const floatBtnReset = document.getElementById('float-btn-reset');

  // Canvas Tools
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnFit = document.getElementById('btn-fit');
  const btnExportSvg = document.getElementById('btn-export-svg');
  const queueItemsContainer = document.getElementById('queue-items-container');

  // Card 1: Code Table & Bit Analysis
  const codeTableBody = document.getElementById('code-table-body');
  const statHuffBits = document.getElementById('stat-huff-bits');
  const statFixedBits = document.getElementById('stat-fixed-bits');
  const statSavedPercent = document.getElementById('stat-saved-percent');
  const statAvgLength = document.getElementById('stat-avg-length');

  // Card 2: Interactive Message Encoder & Decoder
  const testMessageInput = document.getElementById('test-message-input');
  const testMsgChips = document.querySelectorAll('.test-msg-chip');
  const translationBreakdown = document.getElementById('translation-breakdown');
  const resultingBitstream = document.getElementById('resulting-bitstream');
  const btnTraceDecode = document.getElementById('btn-trace-decode');
  const decodedOutputText = document.getElementById('decoded-output-text');

  // Theme Switcher
  const themeBtn = document.getElementById('theme-btn');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  // =========================================================================
  // Theme Handling (Graphite Chalkboard vs Engineering Paper)
  // =========================================================================
  const savedTheme = localStorage.getItem('huffman_theme_mode') || 'dark';
  applyTheme(savedTheme);

  themeBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'paper' : 'dark';
    applyTheme(next);
    localStorage.setItem('huffman_theme_mode', next);
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'paper') {
      themeIcon.textContent = '📄';
      themeText.textContent = 'Paper & Ink';
    } else {
      themeIcon.textContent = '🌙';
      themeText.textContent = 'Graphite Chalk';
    }
    if (visualizer && visualizer.currentRoots) {
      visualizer.renderForest(visualizer.currentRoots);
    }
  }

  // =========================================================================
  // Input Handling & Presets
  // =========================================================================
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      inputEl.value = chip.dataset.val;
      buildTree();
    });
  });

  btnBuild.addEventListener('click', () => buildTree());
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buildTree();
  });

  function buildTree() {
    const raw = inputEl.value.trim();
    if (!raw) {
      alert('Please enter variable frequencies (e.g. a:45, b:13...) or text.');
      return;
    }

    try {
      currentResult = engine.build(raw);
      renderStepTrail();
      goToStep(0, true);
      updateCodeTable();
      updateBitAnalysis();
      updateMessageEncoder();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  // =========================================================================
  // Stepper Trail (Hand-Note Progression)
  // =========================================================================
  function renderStepTrail() {
    stepTrailContainer.innerHTML = '';
    if (!currentResult || !currentResult.steps) return;

    currentResult.steps.forEach((step, idx) => {
      const btn = document.createElement('button');
      btn.className = `step-node-btn ${idx === currentStepIndex ? 'active' : ''}`;
      btn.dataset.stepIndex = idx;

      let label = '';
      if (idx === 0) {
        label = '0: Leaves';
      } else if (step.isFinal) {
        label = `${idx}: ★ Full Tree`;
      } else {
        const shortFormula = step.title.replace(/^Step \d+:\s*Merge\s*/i, '');
        label = `${idx}: ${shortFormula}`;
      }

      btn.textContent = label;
      btn.addEventListener('click', () => {
        goToStep(idx);
      });

      stepTrailContainer.appendChild(btn);
    });
  }

  function goToStep(idx, autoFit = false) {
    if (!currentResult || !currentResult.steps[idx]) return;
    currentStepIndex = idx;
    const step = currentResult.steps[idx];

    stepNumberTag.textContent = `Part ${idx} of ${currentResult.steps.length - 1}`;
    stepHeadline.textContent = step.title;

    const allBtns = stepTrailContainer.querySelectorAll('.step-node-btn');
    allBtns.forEach((b, i) => {
      b.classList.toggle('active', i === idx);
      b.classList.toggle('done', i < idx);
    });

    if (allBtns[idx]) {
      allBtns[idx].scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }

    visualizer.renderForest(step.treeRoots, {
      activeNodes: step.activeNodes,
      highlightedNodeIds: step.newParentId ? [step.newParentId] : [],
      autoFit: autoFit
    });

    renderQueue(step.queue, step.activeNodes, step.newParentId);

    if (idx >= currentResult.steps.length - 1) {
      floatBtnNext.textContent = 'Restart ↺';
    } else {
      floatBtnNext.textContent = 'Next Part ›';
    }
    floatBtnPrev.disabled = idx <= 0;
  }

  function advanceNextPart() {
    if (!currentResult) return;
    if (currentStepIndex < currentResult.steps.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      goToStep(0);
    }
  }

  function prevPart() {
    if (!currentResult) return;
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }

  // Floating controls
  if (floatBtnNext) {
    floatBtnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      advanceNextPart();
    });
  }

  if (floatBtnPrev) {
    floatBtnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      prevPart();
    });
  }

  if (floatBtnReset) {
    floatBtnReset.addEventListener('click', (e) => {
      e.stopPropagation();
      goToStep(0);
    });
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' || e.code === 'ArrowRight') {
      e.preventDefault();
      advanceNextPart();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      prevPart();
    } else if (e.code === 'KeyR' || e.code === 'Home') {
      e.preventDefault();
      goToStep(0);
    } else if (e.code === 'KeyF' || e.code === 'End') {
      e.preventDefault();
      if (currentResult) goToStep(currentResult.steps.length - 1);
    }
  });

  function renderQueue(queueItems, activeIds, newParentId) {
    queueItemsContainer.innerHTML = '';
    if (!queueItems || queueItems.length === 0) {
      queueItemsContainer.innerHTML = '<span style="color:var(--text-dim); font-size:0.75rem;">Tree Complete (Root remaining)</span>';
      return;
    }

    queueItems.forEach(node => {
      const token = document.createElement('span');
      token.className = `queue-token ${node.isLeaf ? 'leaf' : 'internal'}`;
      const name = node.char ? `${node.char}: ${node.weight}` : `(${node.weight})`;
      token.textContent = name;

      if (activeIds && activeIds.includes(node.id)) {
        token.style.borderColor = 'var(--accent-green)';
        token.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.4)';
      }
      if (newParentId === node.id) {
        token.style.borderColor = 'var(--accent-amber)';
        token.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.4)';
      }

      queueItemsContainer.appendChild(token);
    });
  }

  // Canvas Viewport Tools
  btnZoomIn.addEventListener('click', (e) => { e.stopPropagation(); visualizer.zoomIn(); });
  btnZoomOut.addEventListener('click', (e) => { e.stopPropagation(); visualizer.zoomOut(); });
  btnFit.addEventListener('click', (e) => { e.stopPropagation(); visualizer.fitToScreen(); });

  btnExportSvg.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!visualizer.svg) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(visualizer.svg);
    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huffman-part-${currentStepIndex}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // =========================================================================
  // Card 1: Prefix Code Table & Bit Analysis
  // =========================================================================
  function updateCodeTable() {
    codeTableBody.innerHTML = '';
    if (!currentResult || !currentResult.charMeta) return;

    const entries = Object.values(currentResult.charMeta);
    entries.sort((a, b) => a.char.localeCompare(b.char));

    entries.forEach(meta => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color:var(--text-main); font-size:0.95rem;">${meta.char}</strong></td>
        <td>${meta.freq}</td>
        <td><span class="code-stamp">${meta.code}</span></td>
        <td>${meta.length}</td>
        <td style="font-family:var(--font-mono); color:var(--accent-cyan); font-weight:600;">${meta.totalBits}</td>
      `;

      tr.addEventListener('mouseenter', () => {
        visualizer.highlightPathToChar(meta.char);
      });
      tr.addEventListener('mouseleave', () => {
        visualizer.clearPathHighlight();
      });

      codeTableBody.appendChild(tr);
    });
  }

  function updateBitAnalysis() {
    if (!currentResult || !currentResult.metrics) return;
    const m = currentResult.metrics;
    const numSymbols = Object.keys(currentResult.frequencies).length;
    const totalChars = m.totalChars;

    // Fixed-length coding bits per symbol = ceil(log2(numSymbols))
    const fixedBitsPerSymbol = Math.ceil(Math.log2(numSymbols)) || 1;
    const fixedTotalBits = totalChars * fixedBitsPerSymbol;
    const savedPercent = (((fixedTotalBits - m.huffmanTotalBits) / fixedTotalBits) * 100).toFixed(1);

    statHuffBits.textContent = `${m.huffmanTotalBits} bits`;
    statFixedBits.textContent = `${fixedTotalBits} bits (${fixedBitsPerSymbol}b × ${totalChars})`;
    statSavedPercent.textContent = `${savedPercent}%`;
    statAvgLength.textContent = `${m.avgCodeLength} bits/sym`;
  }

  // =========================================================================
  // Card 2: Interactive Message to Binary Encoder & Decoder
  // =========================================================================
  testMsgChips.forEach(chip => {
    chip.addEventListener('click', () => {
      testMessageInput.value = chip.dataset.msg;
      updateMessageEncoder();
    });
  });

  testMessageInput.addEventListener('input', () => {
    updateMessageEncoder();
  });

  function updateMessageEncoder() {
    if (!currentResult || !currentResult.codeTable) return;
    const msg = testMessageInput.value.trim();

    if (!msg) {
      translationBreakdown.textContent = '(enter a message above)';
      resultingBitstream.textContent = '-';
      decodedOutputText.textContent = '-';
      return;
    }

    const parts = [];
    let bits = '';
    let hasError = false;

    for (let i = 0; i < msg.length; i++) {
      const c = msg[i];
      const code = currentResult.codeTable[c];
      if (code !== undefined) {
        parts.push(`${c}(${code})`);
        bits += code;
      } else {
        parts.push(`${c}(?)`);
        hasError = true;
      }
    }

    if (hasError) {
      translationBreakdown.textContent = `Warning: Some characters not in tree alphabet.`;
    } else {
      translationBreakdown.textContent = parts.join(' + ');
    }

    resultingBitstream.textContent = bits || '-';
    decodedOutputText.textContent = msg;
  }

  // Animate Tree Traversal Trace
  btnTraceDecode.addEventListener('click', () => {
    const bitStr = resultingBitstream.textContent.trim();
    if (!bitStr || bitStr === '-') {
      alert('Please enter a valid message to encode first.');
      return;
    }

    try {
      const res = engine.decode(bitStr);
      decodedOutputText.textContent = res.decodedText || '(none)';

      // Switch view to full tree
      goToStep(currentResult.steps.length - 1);

      // Animate tracer ball traveling down the branches
      let i = 0;
      const interval = 450;
      const timer = setInterval(() => {
        if (i >= res.trace.length) {
          clearInterval(timer);
          visualizer.activeTracerNodeId = null;
          visualizer.renderForest(visualizer.currentRoots);
          return;
        }

        const step = res.trace[i];
        visualizer.activeTracerNodeId = step.nodeId;
        visualizer.renderForest(visualizer.currentRoots, {
          activeTracerNodeId: step.nodeId
        });
        i++;
      }, interval);
    } catch (err) {
      alert(`Decode Error: ${err.message}`);
    }
  });

  // Initial Auto Build (Defaults to teacher's hand note)
  buildTree();
});

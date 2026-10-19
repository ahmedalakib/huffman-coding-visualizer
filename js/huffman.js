/**
 * Huffman Coding Engine - ICE 245 Project (Algorithm Course Hand-Note Edition)
 * Exactly mirrors the blackboard/hand-note algorithm progression:
 * - Step 1: Merge 5 + 9 = 14
 * - Step 2: Merge 12 + 13 = 25
 * - Step 3: Merge 14 + 16 = 30
 * - Step 4: Merge 25 + 30 = 55
 * - Step 5: Merge 45 + 55 = 100
 * - Step 6: Complete Tree with 0 (left) and 1 (right)
 */

class HuffmanNode {
  constructor(char, weight, left = null, right = null, id = null) {
    this.id = id !== null ? id : HuffmanNode.nextId++;
    this.char = char; // null for internal nodes
    this.weight = weight;
    this.left = left;
    this.right = right;
    this.code = '';
    this.isLeaf = (left === null && right === null);
  }

  static nextId = 1;

  static resetIdCounter() {
    HuffmanNode.nextId = 1;
  }

  clone() {
    const copy = new HuffmanNode(
      this.char,
      this.weight,
      this.left ? this.left.clone() : null,
      this.right ? this.right.clone() : null,
      this.id
    );
    copy.code = this.code;
    return copy;
  }
}

class HuffmanEngine {
  constructor() {
    this.steps = [];
    this.mergeHistory = []; // records { stepNum, left, right, parent }
    this.root = null;
    this.codeTable = {};
    this.charMeta = {};
    this.inputString = '';
    this.frequencies = {};
    this.metrics = null;
  }

  static parseInput(input) {
    // If input is an object: { a: 45, b: 13, ... }
    if (typeof input === 'object' && input !== null) {
      return input;
    }

    const str = String(input).trim();
    // Check if it's formatted as "a:45, b:13, c:12" or "a=45, b=13"
    if (str.includes(':') || (str.includes('=') && str.includes(','))) {
      const map = {};
      const pairs = str.split(/[,;\n]/);
      for (const pair of pairs) {
        const trimmed = pair.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/[:=]/);
        if (parts.length === 2) {
          const sym = parts[0].trim();
          const count = parseInt(parts[1].trim(), 10);
          if (!isNaN(count) && count > 0) {
            map[sym] = count;
          }
        }
      }
      if (Object.keys(map).length > 0) {
        return map;
      }
    }

    // Otherwise, treat as character frequency count
    const freq = {};
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      freq[c] = (freq[c] || 0) + 1;
    }
    return freq;
  }

  static formatChar(c) {
    if (c === ' ') return '␣ (space)';
    if (c === '\n') return '\\n';
    if (c === '\t') return '\\t';
    return c;
  }

  build(input) {
    HuffmanNode.resetIdCounter();
    this.steps = [];
    this.mergeHistory = [];
    this.codeTable = {};
    this.charMeta = {};
    this.inputString = typeof input === 'string' ? input : '';

    this.frequencies = HuffmanEngine.parseInput(input);
    const symbols = Object.keys(this.frequencies);

    if (symbols.length === 0) {
      throw new Error('Please enter at least one symbol or frequency.');
    }

    // Sort initial leaves ascending by weight
    const leaves = symbols.map(sym => new HuffmanNode(sym, this.frequencies[sym]));
    leaves.sort((a, b) => {
      if (a.weight !== b.weight) return a.weight - b.weight;
      return a.char.localeCompare(b.char);
    });

    // Step 0: Initial forest of all leaves
    let queue = leaves.map(n => n.clone());

    this.steps.push({
      stepNum: 0,
      title: 'Initial Leaf Nodes',
      summary: `Created ${symbols.length} leaf nodes sorted by weight in ascending order.`,
      queue: queue.map(n => n.clone()),
      treeRoots: queue.map(n => n.clone()),
      activeNodes: [],
      newParentId: null,
      isFinal: false
    });

    let mergeCount = 1;

    // Repeatedly combine two smallest nodes until 1 root remains
    while (queue.length > 1) {
      const nodeLeft = queue.shift();
      const nodeRight = queue.shift();

      const parentWeight = nodeLeft.weight + nodeRight.weight;
      // Always put smaller weight on the left (bit 0), larger on the right (bit 1)
      const parentNode = new HuffmanNode(null, parentWeight, nodeLeft, nodeRight);

      // Record in merge history for teacher's hand-note subtree row
      this.mergeHistory.push({
        stepNum: mergeCount,
        leftWeight: nodeLeft.weight,
        rightWeight: nodeRight.weight,
        parentWeight: parentWeight,
        leftLabel: nodeLeft.char || nodeLeft.weight,
        rightLabel: nodeRight.char || nodeRight.weight,
        subtree: parentNode.clone()
      });

      // Insert parent node back into queue maintaining ascending sort
      let insertIndex = queue.findIndex(item => item.weight > parentNode.weight);
      if (insertIndex === -1) {
        queue.push(parentNode);
      } else {
        queue.splice(insertIndex, 0, parentNode);
      }

      const leftName = nodeLeft.char ? `'${nodeLeft.char}' (${nodeLeft.weight})` : `(${nodeLeft.weight})`;
      const rightName = nodeRight.char ? `'${nodeRight.char}' (${nodeRight.weight})` : `(${nodeRight.weight})`;

      this.steps.push({
        stepNum: mergeCount,
        title: `Step ${mergeCount}: Merge ${leftName} + ${rightName} = (${parentWeight})`,
        summary: `Extracted two lowest weights: ${nodeLeft.weight} and ${nodeRight.weight}. Created parent node (${parentWeight}).`,
        queue: queue.map(n => n.clone()),
        treeRoots: queue.map(n => n.clone()),
        activeNodes: [nodeLeft.id, nodeRight.id],
        newParentId: parentNode.id,
        isFinal: queue.length === 1
      });

      mergeCount++;
    }

    this.root = queue[0];

    // Assign binary codes: Left = 0, Right = 1
    this.assignCodes(this.root, '');

    // Final step: Tree Complete with all codes assigned
    this.steps.push({
      stepNum: mergeCount,
      title: 'Final Huffman Tree & Prefix Codes',
      summary: 'Huffman Tree complete! All variable-length binary codes assigned.',
      queue: [this.root.clone()],
      treeRoots: [this.root.clone()],
      activeNodes: [],
      newParentId: this.root.id,
      isFinal: true
    });

    this.calculateMetrics();
    return this.getResult();
  }

  assignCodes(node, currentCode) {
    if (!node) return;
    node.code = currentCode;

    if (node.isLeaf) {
      this.codeTable[node.char] = currentCode || '0';
      return;
    }

    if (node.left) {
      this.assignCodes(node.left, currentCode + '0');
    }
    if (node.right) {
      this.assignCodes(node.right, currentCode + '1');
    }
  }

  calculateMetrics() {
    const totalChars = Object.values(this.frequencies).reduce((a, b) => a + b, 0);
    const uniqueChars = Object.keys(this.frequencies).length;

    let huffmanTotalBits = 0;
    let entropy = 0;
    let avgCodeLength = 0;
    let kraftSum = 0;

    for (const [char, count] of Object.entries(this.frequencies)) {
      const code = this.codeTable[char] || '';
      const prob = count / totalChars;
      const codeLen = code.length;
      const totalBits = count * codeLen;

      huffmanTotalBits += totalBits;
      avgCodeLength += prob * codeLen;
      if (prob > 0) entropy += -prob * Math.log2(prob);
      kraftSum += Math.pow(2, -codeLen);

      this.charMeta[char] = {
        char,
        formattedChar: HuffmanEngine.formatChar(char),
        freq: count,
        prob: prob,
        code: code,
        length: codeLen,
        totalBits: totalBits
      };
    }

    const standardAsciiBits = totalChars * 8;
    const compressionRatio = standardAsciiBits / (huffmanTotalBits || 1);
    const spaceSavingsPercent = ((standardAsciiBits - huffmanTotalBits) / standardAsciiBits) * 100;

    this.metrics = {
      totalChars,
      uniqueChars,
      standardAsciiBits,
      huffmanTotalBits,
      compressionRatio: Number(compressionRatio.toFixed(3)),
      spaceSavingsPercent: Number(spaceSavingsPercent.toFixed(2)),
      avgCodeLength: Number(avgCodeLength.toFixed(3)),
      entropy: Number(entropy.toFixed(3)),
      kraftSum: Number(kraftSum.toFixed(4))
    };
  }

  encode(text) {
    if (!text) return { bitString: '', tokens: [], totalBits: 0 };
    let bitString = '';
    const tokens = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = this.codeTable[char];
      if (code === undefined) {
        throw new Error(`Symbol '${char}' is not in the Huffman code dictionary.`);
      }
      tokens.push({
        char,
        code
      });
      bitString += code;
    }

    return { bitString, tokens, totalBits: bitString.length };
  }

  decode(bitString) {
    if (!this.root) throw new Error('Huffman Tree not constructed.');
    if (!bitString) return { decodedText: '', trace: [] };

    let decodedText = '';
    const trace = [];
    let currentNode = this.root;

    for (let i = 0; i < bitString.length; i++) {
      const bit = bitString[i];
      if (bit !== '0' && bit !== '1') {
        throw new Error(`Invalid bit '${bit}' at position ${i + 1}.`);
      }

      currentNode = bit === '0' ? (currentNode.left || currentNode) : (currentNode.right || currentNode);

      if (currentNode.isLeaf) {
        decodedText += currentNode.char;
        trace.push({
          bitIndex: i,
          bit,
          nodeId: currentNode.id,
          isLeaf: true,
          char: currentNode.char
        });
        currentNode = this.root;
      } else {
        trace.push({
          bitIndex: i,
          bit,
          nodeId: currentNode.id,
          isLeaf: false,
          weight: currentNode.weight
        });
      }
    }

    return { decodedText, trace };
  }

  getResult() {
    return {
      root: this.root,
      steps: this.steps,
      mergeHistory: this.mergeHistory,
      codeTable: this.codeTable,
      charMeta: this.charMeta,
      metrics: this.metrics,
      frequencies: this.frequencies
    };
  }
}

if (typeof window !== 'undefined') {
  window.HuffmanNode = HuffmanNode;
  window.HuffmanEngine = HuffmanEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HuffmanNode, HuffmanEngine };
}

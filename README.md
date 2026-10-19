# Huffman Coding Algorithm Visualizer & Explorer
**ICE 245 Course Project: Information & Coding Engineering**
*Tactile Hand-Note Edition*

---

## 📌 Project Overview

This project is a 100% offline, tactile educational tool designed for **ICE 245 Algorithm Coursework**, matching class hand notes and textbook standards:

1. **Tactile Tree Construction**:
   - Tap/click anywhere on the canvas or press <kbd>Space</kbd> / <kbd>&rarr;</kbd> to advance the tree construction part by part.
   - Stepper trail: `[0: Leaves] ➔ [1: 5+9=14] ➔ [2: 12+13=25] ➔ [3: 14+16=30] ➔ [4: 25+30=55] ➔ [5: 45+55=100] ➔ [6: Full Tree]`.

2. **Prefix Code Table & Bit Calculations**:
   - Displays the exact prefix codes from the notebook:
     - `a : 0`
     - `b : 101`
     - `c : 100`
     - `d : 111`
     - `e : 1101`
     - `f : 1100`
   - Total bit calculation ($\sum f_i \cdot l_i = 224$ bits) vs. Fixed-length coding ($100 \times 3 = 300$ bits), saving **25.3%**!

3. **Convert Message ⇄ Binary (Interactive Encoder & Decoder)**:
   - Type any word (e.g. `bad`, `cafe`, `fade`, `abf`) to see the symbol-by-symbol binary translation:
     `b(101) + a(0) + d(111) = 1010111`.
   - Click **"Trace Decode on Tree"** to watch the active tracer travel through the tree branches node-by-node and decode the binary string back into text!

---

## 🚀 How to Run (100% Offline)

- **Direct Launch**: Double-click [`index.html`](file:///g:/ICE%20245%20PROJECT/index.html).
- **Windows Launcher**: Double-click [`start.bat`](file:///g:/ICE%20245%20PROJECT/start.bat).
- **Python Server (Optional)**: Run `python run_offline.py`.
"# huffman-coding-visualizer" 

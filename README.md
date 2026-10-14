# Smart CPU Process Scheduler - Web UI

A clean, college-level web simulation for the **Smart CPU Process Scheduler** mini-project. This UI serves as a visual and interactive representation of your original C++ CPU scheduling program.

---

## 📁 Project Structure

```text
hello/
├── index.html        # Main single-page web UI (HTML5)
├── style.css         # Clean, viva-friendly college project styling (CSS3)
├── script.js         # Exact C++ scheduling algorithms & dynamic Gantt chart (JavaScript)
└── README.md         # Project documentation and Viva guide
```

---

## 🚀 How to Run the Project

1. Simply **double-click** `index.html` to open it directly in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Brave, Safari).
2. Alternatively, you can start a local development server using Python:
   ```bash
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

---

## ⚙️ Implemented Algorithms (Matching C++ Code)

All 6 algorithms from your C++ program are implemented with identical logic:

1. **FCFS (First Come First Serve)** - Non-Preemptive
   - Executes processes strictly according to arrival order.
2. **SJF Non-Preemptive (Shortest Job First)** - Non-Preemptive
   - Among available arrived processes, selects the process with the smallest burst time.
3. **SRTF (Shortest Remaining Time First)** - Preemptive SJF
   - Evaluates remaining burst time at every time unit and preempts if a shorter job arrives.
4. **Round Robin (RR)** - Preemptive
   - Uses a FIFO ready queue and allocates CPU time according to the specified **Time Quantum**.
5. **Priority Non-Preemptive** - Non-Preemptive
   - Selects the ready process with the highest priority (smaller numeric value = higher priority, e.g., 1 is higher than 2).
6. **Priority Preemptive** - Preemptive
   - Preempts the current running process if a process with higher priority arrives.

---

## 📊 Formulas Used

- **Completion Time (CT)**: Time at which process finishes execution.
- **Turnaround Time (TAT)**: $\text{TAT} = \text{CT} - \text{AT}$
- **Waiting Time (WT)**: $\text{WT} = \text{TAT} - \text{BT}$
- **Average Waiting Time**: $\frac{\sum \text{WT}}{N}$
- **Average Turnaround Time**: $\frac{\sum \text{TAT}}{N}$

---

## 🎓 College Practical / Viva Tips

- **Gantt Chart**: The horizontal blocks are generated dynamically with proportional widths. Start and end timestamps are marked directly below the dividing lines.
- **Preemption Visualization**: In SRTF and Priority Preemptive, processes split across multiple blocks (e.g., `P1 -> P2 -> P1`), clearly showing preemption points.
- **Time Quantum**: The Time Quantum input automatically appears only when Round Robin is selected.
- **Example Data**: Click **Load Example Data** for an instant 4-process standard set ready to run in front of the external examiner.

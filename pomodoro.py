import tkinter as tk
import time
import threading
import subprocess

# === Config ===
FOCUS_DURATION = 15      # seconds (use 900 for 15 minutes)
BREAK_DURATION = 5       # seconds (use 300 for 5 minutes)

class PomodoroApp:
    def __init__(self, root):
        self.root = root
        self.running = False
        self.mode = "focus"
        self.start_time = None
        self.timer_thread = None

        self.label = tk.Label(root, text="Pomodoro Timer", font=("Helvetica", 16))
        self.label.pack(pady=10)

        self.time_display = tk.Label(root, text="0s", font=("Helvetica", 24))
        self.time_display.pack(pady=10)

        self.start_focus_btn = tk.Button(root, text="Start Focus", command=self.start_focus)
        self.start_focus_btn.pack(pady=5)

        self.start_break_btn = tk.Button(root, text="Start Break", command=self.start_break)
        self.start_break_btn.pack(pady=5)

        self.stop_btn = tk.Button(root, text="Stop", command=self.stop)
        self.stop_btn.pack(pady=5)

    def start_focus(self):
        self.start_timer("focus", FOCUS_DURATION)

    def start_break(self):
        self.start_timer("break", BREAK_DURATION)

    def start_timer(self, mode, duration):
        self.mode = mode
        self.duration = duration
        self.running = True
        self.start_time = time.time()
        if self.timer_thread and self.timer_thread.is_alive():
            return
        self.timer_thread = threading.Thread(target=self.tick)
        self.timer_thread.start()

    def stop(self):
        self.running = False
        self.time_display.config(text="0s")

    def tick(self):
        while self.running:
            elapsed = int(time.time() - self.start_time)
            self.time_display.config(text=f"{elapsed}s")
            if elapsed > 0 and elapsed % self.duration == 0:
                self.play_sound()
                time.sleep(1)  # prevent rapid multiple triggers
            time.sleep(1)

    def play_sound(self):
        print(f"[ALERT] {self.mode.upper()} complete.")
        subprocess.call(["afplay", "alert.mp3"])  # plays mp3 on macOS

# === Run App ===
root = tk.Tk()
root.title("Pomodoro Timer")
app = PomodoroApp(root)
print("Running GUI")
root.mainloop()

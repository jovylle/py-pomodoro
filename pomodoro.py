import time
import subprocess

FOCUS_DURATION = 15  # seconds
BREAK_DURATION = 5

def run_timer(name, duration):
    print(f"\n⏱️  {name.upper()} - {duration}s")
    for i in range(duration):
        print(f"{i+1}s / {duration}s", end="\r")
        time.sleep(1)
    print(f"\n🔔 {name.upper()} DONE!")
    subprocess.call(["afplay", "alert.mp3"])

while True:
    run_timer("focus", FOCUS_DURATION)
    input("Press Enter to start break...")
    run_timer("break", BREAK_DURATION)
    input("Press Enter to start focus...")

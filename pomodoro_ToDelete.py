import time

def run_timer(name, duration):
    """Run a simple timer."""
    print(f"\n⏱️  {name.upper()} - {duration // 60} minutes")
    for i in range(duration):
        remaining_minutes = (duration - i) // 60
        remaining_seconds = (duration - i) % 60
        print(f"{remaining_minutes}m {remaining_seconds}s remaining", end="\r")
        time.sleep(1)
    print(f"\n🔔 {name.upper()} DONE!")

if __name__ == "__main__":
    print("This is a standalone timer script.")
    print("You can integrate it with the Electron app if needed.")
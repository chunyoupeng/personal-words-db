import subprocess
import time

# 进程启动函数
def start_process():
    return subprocess.Popen(['node', 'addWord.js'])

# 进程终止函数
def stop_process(process):
    process.terminate()
    process.wait()  # 等待进程终止

# 主循环
def main():
    while True:
        process = start_process()
        # 等待半小时
        time.sleep(1800)
        stop_process(process)

if __name__ == "__main__":
    main()
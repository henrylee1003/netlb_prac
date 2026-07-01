# Docker 學習筆記

## 1. Docker 解決什麼問題？

> 「我的電腦跑得起來，但換到伺服器就壞掉了。」

原因通常是 Python 版本不同、套件版本衝突、系統環境不一樣。Docker 把「程式 + 它需要的環境」打包成一個可以到處搬動、行為一致的單位。

---

## 2. 核心概念

### Container vs 虛擬機（VM）

```
虛擬機（VM）                    Docker Container
┌─────────────────┐            ┌─────────────────┐
│   Guest OS      │            │   你的應用程式   │
│   （完整系統）   │            │   + 需要的套件   │
│   你的應用程式   │            ├─────────────────┤
├─────────────────┤            │  共用 Host OS    │
│   Hypervisor    │            │  的核心          │
├─────────────────┤            ├─────────────────┤
│   Host OS       │            │   Host OS        │
└─────────────────┘            └─────────────────┘
啟動要幾分鐘，佔幾 GB           啟動幾秒，輕量很多
```

Container 不是完整的作業系統，只打包應用程式需要的東西，共用主機的 Linux 核心。

### Image 與 Container 的關係

```
Image（食譜）  ──執行 docker run──▶  Container（做好的菜）
```

- Image：唯讀、可重複使用，本身不會變
- Container：Image 執行後的「實例」，可以同時存在多個，互不影響
- 每次 `docker run` 都是從 image 建立一個全新的 container

### Dockerfile → Image → Container 的流程

```
Dockerfile          Image              Container
（建造說明書） ──build──▶ （成品） ──run──▶ （運行中）
```

---

## 3. Dockerfile 語法

```dockerfile
FROM python:3.11-slim   # 地基：從哪個 base image 開始
WORKDIR /app             # 容器內的工作目錄
COPY . .                 # 把檔案複製進 image（來源 目的地）
CMD ["python3", "app.py"]  # 容器啟動時預設執行的指令
```

**心智模型：**
```
FROM    →  地基（base image）
WORKDIR →  在哪裡蓋房子
COPY    →  把家具（程式碼）搬進去
CMD     →  房子蓋好後，預設要做什麼事
```

### 撰寫順序的最佳實踐

**原則：少變動的放前面，常變動的放後面**（為了善用快取）

```dockerfile
FROM python:3.11-slim                  # 幾乎不變
WORKDIR /app                            # 不變
COPY requirements.txt .                 # 套件清單，偶爾變
RUN pip install -r requirements.txt     # 跟著套件清單變
COPY . .                                # 程式碼，常常變
```

這樣只改程式碼時，不需要重新安裝整包套件，build 速度差很多。

---

## 4. 分層建造與快取機制

Docker image 是一層一層疊起來的：

```
┌─────────────────┐
│  COPY . .        │ ← 第 3 層
├─────────────────┤
│  WORKDIR /app    │ ← 第 2 層
├─────────────────┤
│  python:3.11-slim│ ← 第 1 層（base image）
└─────────────────┘
```

Docker 會快取每一層。如果某層的內容沒變，重新 build 時會直接用快取（顯示 `CACHED`），不用重做。

**實測證據：**
- 第一次 build（全新）：8.4s
- 第二次 build（只改了 COPY 那層）：1.0s，快了 8 倍

---

## 5. 常用指令

```bash
# Image 相關
docker images              # 列出本機所有 image
docker build -t 名稱 .      # 根據 Dockerfile 建造 image，-t 取名字
docker rmi <image id>      # 刪除 image

# Container 相關
docker run 名稱             # 從 image 啟動一個新 container
docker run -it ubuntu bash # 啟動並進入互動式終端
docker ps                  # 列出運行中的 container
docker ps -a               # 列出所有 container（含已停止的）
docker rm <container id>   # 刪除單一 container
docker container prune     # 刪除所有已停止的 container
```

**重要觀念：Container 是「用完即丟」的**

```
docker images（食譜）        docker ps -a（做出來的菜）
─────────────────          ─────────────────
hello-world                  hello-world container #1
ubuntu                       hello-world container #2
                              ubuntu container #1
```

`exit` 離開 container 後，container 狀態變成 `Exited`，但不會自動消失，還在 `docker ps -a` 看得到。你在 container 裡的改動（例如裝套件），下次重新 `docker run` 不會留著，除非刻意儲存成新 image。這跟虛擬機很不一樣——VM 通常長期累積狀態，Container 的哲學是隨時可以重建。

---

## 6. docker-compose：管理多個服務

### 為什麼需要它

真實專案常常需要多個服務一起運作（例如：Ollama 服務 + Python 應用），一個一個手動 `docker run` 很麻煩。`docker-compose` 用一個 YAML 檔案描述「需要哪些服務、怎麼串起來」，一個指令就能全部啟動，這個檔案本身也是專案文件。

### 基本語法

```yaml
services:              # 我要跑哪些服務
  app:                  # 服務名稱（自己取）
    build: .              # 用目前目錄的 Dockerfile 來 build
    container_name: my-python-app
    volumes:
      - .:/app             # 即時掛載
```

```bash
docker compose up      # 啟動所有定義的服務
```

### volumes：即時掛載 vs COPY 一次性複製

```yaml
volumes:
  - .:/app
```

意思是：你電腦上的目前目錄 ◀══即時同步══▶ container 裡的 `/app`。這不是複製一次，是兩邊指向同一份檔案。

| | COPY（Dockerfile） | volumes（docker-compose.yml） |
|---|---|---|
| 時機 | build 時複製一次 | 執行時即時同步 |
| 改檔案後 | image 不會變，要重新 build | container 馬上看到最新內容 |
| 適合場景 | 正式部署，打包確定版本 | 開發階段，邊改邊測 |

**實測證據：** 沒有重新 build，只是在電腦上對 `app.py` 多加一行，`docker compose up` 後 container 內就直接印出新內容。

### docker-compose 額外做的事

- 自動建立一個虛擬網路（例如 `專案名_default`），讓裡面的服務可以用**服務名稱**互相溝通，不用記 IP（之後 Ollama 服務和 app 服務可以直接用 `http://ollama:11434` 連線）
- image 名稱自動加上專案資料夾名稱當前綴

---

## 7. 概念關係圖（總結）

```
Dockerfile  →  docker build  →  Image  →  docker run  →  Container
                                   ↑
                          多個 Image 用 docker-compose.yml 一起管理
                                   ↓
                          docker compose up → 多個 Container 同時啟動
                                                 ↑
                                          用 volumes 做即時掛載開發
```

---

## 8. 下一步銜接

Docker 學完之後，下一階段是 **Ollama**：

- 會用 Docker 跑 Ollama，不用擔心版本衝突、安裝失敗
- docker-compose 學到的「多服務管理」會直接用在「Ollama 服務 + Python 應用」的組合上
- volumes 觀念會用在「保存下載的模型檔案，不用每次重新下載」

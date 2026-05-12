# MarkItDown Web

Document to Markdown Converter - Web 版。基于 Microsoft MarkItDown，支持 PDF、DOCX、PPTX、XLSX、HTML、CSV、JSON、XML、图片、音频等格式转换为 Markdown。

## 项目结构

```
markitdown-desktop/
├── main.py              # 入口，启动 uvicorn 服务
├── server.py            # FastAPI 后端（转换 API + 静态文件 + 下载端点）
├── requirements.txt     # Python 依赖
└── static/
    ├── index.html       # 前端页面
    ├── style.css        # 样式
    └── script.js        # 前端逻辑（拖拽上传、转换、预览、复制、保存）
```

## 本地启动

```bash
# 1. 创建虚拟环境
python -m venv venv

# 2. 激活虚拟环境
.\venv\Scripts\activate        # Windows PowerShell
# venv\Scripts\activate.bat     # Windows CMD
# source venv/bin/activate      # Linux/macOS

# 3. 安装依赖
pip install -r requirements.txt

# 4. 启动服务
python main.py
```

启动后自动打开浏览器访问 http://127.0.0.1:8877

## 服务器部署流程

以下以 Ubuntu 服务器为例，部署到 8877 端口。

### 1. 上传项目文件

```bash
# 从本地上传到服务器
scp -i your-key.pem -r markitdown-desktop/ ubuntu@YOUR_SERVER_IP:/home/ubuntu/
```

需要上传的文件：
- `main.py`
- `server.py`
- `requirements.txt`
- `static/` 目录（index.html, style.css, script.js）
- `MarkItDown-1.0.0-win-x64.zip`（可选，单机版下载包）

### 2. 创建 Python 虚拟环境并安装依赖

```bash
ssh ubuntu@YOUR_SERVER_IP

cd /home/ubuntu/markitdown-desktop
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. 测试运行

```bash
# 手动测试
MARKITDOWN_HOST=0.0.0.0 MARKITDOWN_PORT=8877 venv/bin/python main.py

# 浏览器访问 http://YOUR_SERVER_IP:8877 验证
# Ctrl+C 退出
```

### 4. 创建 systemd 服务

```bash
sudo tee /etc/systemd/system/markitdown.service > /dev/null << 'EOF'
[Unit]
Description=MarkItDown Desktop
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/markitdown-desktop
Environment=MARKITDOWN_HOST=0.0.0.0
Environment=MARKITDOWN_PORT=8877
ExecStart=/home/ubuntu/markitdown-desktop/venv/bin/python main.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### 5. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable markitdown
sudo systemctl start markitdown
```

### 6. 验证

```bash
# 检查服务状态
sudo systemctl status markitdown

# 测试 API
curl http://localhost:8877/api/formats

# 测试转换
curl -X POST http://localhost:8877/api/convert -F "file=@test.pdf"
```

### 7. 开放防火墙端口

```bash
# UFW
sudo ufw allow 8877/tcp

# 或 iptables
sudo iptables -A INPUT -p tcp --dport 8877 -j ACCEPT
```

如果是云服务器（AWS/GCP/Azure），还需在安全组中开放 8877 端口的入站规则。

## 常用运维命令

```bash
# 查看日志
sudo journalctl -u markitdown -f

# 重启服务
sudo systemctl restart markitdown

# 停止服务
sudo systemctl stop markitdown
```

## 更新部署

```bash
# 1. 上传新文件
scp -i your-key.pem server.py ubuntu@YOUR_SERVER_IP:/home/ubuntu/markitdown-desktop/
scp -i your-key.pem static/* ubuntu@YOUR_SERVER_IP:/home/ubuntu/markitdown-desktop/static/

# 2. 重启服务
ssh -i your-key.pem ubuntu@YOUR_SERVER_IP "sudo systemctl restart markitdown"
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MARKITDOWN_HOST` | `127.0.0.1` | 监听地址，部署时设为 `0.0.0.0` |
| `MARKITDOWN_PORT` | `8877` | 监听端口 |

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 前端页面 |
| GET | `/api/formats` | 返回支持的文件格式列表 |
| POST | `/api/convert` | 上传文件并转换为 Markdown |
| GET | `/download` | 下载单机版 zip 包 |

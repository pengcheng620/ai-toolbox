# 🔧 修复 IDE 依赖识别问题

如果 VS Code 仍然显示 mypy 无法找到模块，请按照以下步骤操作：

## 1. 重新加载 VS Code 窗口

**方法一：命令面板**
1. 按 `Cmd+Shift+P` (macOS) 或 `Ctrl+Shift+P` (Windows/Linux)
2. 输入 "Developer: Reload Window"
3. 回车执行

**方法二：完全重启 VS Code**
1. 关闭 VS Code
2. 重新打开项目

## 2. 确认 Python 解释器

1. 按 `Cmd+Shift+P` 打开命令面板
2. 输入 "Python: Select Interpreter"
3. 选择 `./backend/.venv/bin/python`

## 3. 验证配置

运行以下命令验证环境：

```bash
# 检查 Python 解释器
which python
# 应该输出: /Users/lup/WorkSpace/work/AI/ai-toolbox/backend/.venv/bin/python

# 检查 mypy
uv run mypy --version

# 测试 mypy
uv run mypy app/config.py --config-file=mypy.ini
```

## 4. 如果问题仍然存在

删除 VS Code 工作区设置并重新创建：

```bash
rm -rf .vscode
mkdir .vscode
```

然后重新创建 `.vscode/settings.json`：

```json
{
    "python.interpreter.path": "./.venv/bin/python",
    "python.defaultInterpreterPath": "./.venv/bin/python",
    "python.linting.mypyEnabled": true,
    "python.linting.mypyArgs": ["--ignore-missing-imports"]
}
```

## 5. 确认环境变量

确保已配置 `.env` 文件：

```bash
# 如果没有 .env 文件，运行：
python setup_env.py
```

然后编辑 `.env` 文件，填入您的 Azure OAuth 配置。 
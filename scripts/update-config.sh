#!/bin/bash

# AI Toolbox - 配置更新脚本
# 当修改 config/common.yml 后，运行此脚本更新所有相关配置

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${PROJECT_ROOT}/config/common.yml"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖工具..."
    
    # 检查Node.js (前端配置生成需要)
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装或不在PATH中"
        log_info "请安装Node.js: https://nodejs.org/"
        exit 1
    fi
    
    # 检查配置文件
    if [ ! -f "$CONFIG_FILE" ]; then
        log_error "配置文件不存在: $CONFIG_FILE"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 显示当前配置
show_current_config() {
    log_info "当前配置信息:"
    
    # 尝试使用Python读取配置
    if command -v python3 &> /dev/null; then
        cd "${PROJECT_ROOT}/backend"
        python3 -c "
try:
    from app.utils.config_loader import get_config
    config = get_config()
    print(f'API端口: {config.get_api_port()}')
    print(f'API主机: {config.get_api_host()}')  
    print(f'目标IP: {config.get_target_ip()}')
    print(f'配置版本: {config.get(\"meta.config_version\", \"unknown\")}')
except Exception as e:
    print(f'读取配置失败: {e}')
    print('请确保已安装PyYAML: pip install pyyaml')
" 2>/dev/null || log_warning "无法读取配置，请检查Python环境"
        cd - > /dev/null
    else
        log_warning "Python3 未安装，跳过配置显示"
    fi
}

# 更新前端配置
update_frontend_config() {
    log_info "更新前端配置..."
    
    cd "${PROJECT_ROOT}/frontend"
    
    # 检查前端配置脚本是否存在
    if [ ! -f "scripts/load-config.js" ]; then
        log_error "前端配置脚本不存在: scripts/load-config.js"
        exit 1
    fi
    
    # 检查是否有js-yaml依赖
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/js-yaml" ]; then
        log_info "安装前端依赖..."
        if command -v pnpm &> /dev/null; then
            pnpm add --save-dev js-yaml
        elif command -v npm &> /dev/null; then
            npm install --save-dev js-yaml
        else
            log_error "未找到npm或pnpm"
            exit 1
        fi
    fi
    
    # 生成本地开发环境配置
    log_info "生成本地开发环境配置..."
    node scripts/load-config.js
    
    # 生成生产环境配置
    log_info "生成生产环境配置..."
    node scripts/load-config.js --production
    
    cd - > /dev/null
    log_success "前端配置更新完成"
}

# 更新Docker配置
update_docker_config() {
    log_info "更新Docker配置..."
    
    # 这里可以添加更新docker-compose.yml的逻辑
    # 由于YAML解析比较复杂，暂时提醒用户手动检查
    log_warning "请手动检查以下文件是否需要更新:"
    echo "  - docker-compose.prod.yml"
    echo "  - backend/Dockerfile"
    
    log_info "Docker配置检查完成"
}

# 更新部署脚本
update_deployment_scripts() {
    log_info "检查部署脚本..."
    
    # 检查是否需要更新脚本中的硬编码配置
    local scripts_to_check=(
        "scripts/deploy.sh"
        "scripts/test-deployment.sh"
    )
    
    for script in "${scripts_to_check[@]}"; do
        if [ -f "${PROJECT_ROOT}/${script}" ]; then
            log_info "脚本存在: ${script}"
        else
            log_warning "脚本缺失: ${script}"
        fi
    done
    
    log_success "部署脚本检查完成"
}

# 验证配置更新
verify_config_update() {
    log_info "验证配置更新..."
    
    # 检查前端环境文件
    if [ -f "${PROJECT_ROOT}/frontend/.env.local" ]; then
        log_success "前端环境文件存在: frontend/.env.local"
        log_info "内容预览:"
        head -5 "${PROJECT_ROOT}/frontend/.env.local" | sed 's/^/  /'
    else
        log_warning "前端环境文件不存在"
    fi
    
    echo ""
    
    # 再次显示配置
    show_current_config
    
    log_success "配置验证完成"
}

# 显示后续步骤
show_next_steps() {
    log_info "后续步骤:"
    echo ""
    echo "1. 测试后端配置:"
    echo "   cd backend && python3 run_dev.py"
    echo ""
    echo "2. 测试前端配置:"
    echo "   cd frontend && pnpm dev"
    echo ""
    echo "3. 重新部署 (如果需要):"
    echo "   ./scripts/deploy.sh"
    echo ""
    echo "4. 验证部署 (如果已部署):"
    echo "   ./scripts/test-deployment.sh"
}

# 主流程
main() {
    log_info "🔧 AI Toolbox 配置更新脚本"
    echo "配置文件: ${CONFIG_FILE}"
    echo ""
    
    check_dependencies
    show_current_config
    echo ""
    
    # 询问是否继续
    read -p "是否继续更新配置? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        log_info "配置更新已取消"
        exit 0
    fi
    
    update_frontend_config
    update_docker_config
    update_deployment_scripts
    verify_config_update
    
    echo ""
    show_next_steps
    
    log_success "🎉 配置更新完成！"
}

# 显示帮助
show_help() {
    echo "AI Toolbox 配置更新脚本"
    echo ""
    echo "使用方法:"
    echo "  $0                # 更新所有配置"
    echo "  $0 --frontend     # 仅更新前端配置"
    echo "  $0 --show         # 仅显示当前配置"
    echo "  $0 --help         # 显示帮助"
    echo ""
    echo "功能:"
    echo "  - 从 config/common.yml 读取统一配置"
    echo "  - 更新前端环境变量文件"
    echo "  - 检查Docker和部署脚本配置"
    echo "  - 验证配置更新结果"
}

# 处理命令行参数
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --show)
        check_dependencies
        show_current_config
        exit 0
        ;;
    --frontend)
        check_dependencies
        update_frontend_config
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "未知参数: $1"
        echo "使用 --help 查看帮助"
        exit 1
        ;;
esac
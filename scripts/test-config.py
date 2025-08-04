#!/usr/bin/env python3
"""
配置系统测试脚本 - 验证统一配置是否正常工作
"""

import sys
import os
from pathlib import Path

# 添加项目路径
current_dir = Path(__file__).parent
project_root = current_dir.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

def test_config_loading():
    """测试配置加载"""
    print("🧪 测试配置加载...")
    
    try:
        from app.utils.config_loader import get_config
        
        config = get_config()
        print("✅ 配置加载器导入成功")
        
        # 测试基本配置获取
        api_port = config.get_api_port()
        api_host = config.get_api_host()
        target_ip = config.get_target_ip()
        
        print(f"📋 配置信息:")
        print(f"  API端口: {api_port}")
        print(f"  API主机: {api_host}")
        print(f"  目标IP: {target_ip}")
        
        # 测试CORS和安全配置
        cors_origins = config.get_cors_origins()
        allowed_hosts = config.get_allowed_hosts()
        
        print(f"  CORS源: {cors_origins}")
        print(f"  允许主机: {allowed_hosts}")
        
        # 测试生产环境配置
        prod_config = config.get_production_config()
        print(f"  生产配置: {prod_config}")
        
        return True
        
    except ImportError as e:
        print(f"❌ 配置加载器导入失败: {e}")
        print("💡 请确保安装了PyYAML: pip install pyyaml")
        return False
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        return False

def test_config_file():
    """测试配置文件是否存在和格式正确"""
    print("\n🧪 测试配置文件...")
    
    config_file = project_root / "config" / "common.yml"
    
    if not config_file.exists():
        print(f"❌ 配置文件不存在: {config_file}")
        return False
    
    print(f"✅ 配置文件存在: {config_file}")
    
    try:
        import yaml
        with open(config_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
        
        print("✅ 配置文件格式正确")
        
        # 检查必要的配置项
        required_keys = [
            'network.api_port',
            'deployment.target_ip',
            'services.backend.host'
        ]
        
        for key in required_keys:
            keys = key.split('.')
            current = config
            for k in keys:
                if isinstance(current, dict) and k in current:
                    current = current[k]
                else:
                    print(f"⚠️  缺少配置项: {key}")
                    break
            else:
                print(f"✅ 配置项存在: {key} = {current}")
        
        return True
        
    except ImportError:
        print("⚠️  PyYAML未安装，跳过YAML格式检查")
        return True
    except Exception as e:
        print(f"❌ 配置文件格式错误: {e}")
        return False

def test_frontend_script():
    """测试前端配置脚本"""
    print("\n🧪 测试前端配置脚本...")
    
    frontend_script = project_root / "frontend" / "scripts" / "load-config.js"
    
    if not frontend_script.exists():
        print(f"❌ 前端配置脚本不存在: {frontend_script}")
        return False
    
    print(f"✅ 前端配置脚本存在: {frontend_script}")
    
    # 检查Node.js是否可用
    if os.system("node --version > /dev/null 2>&1") != 0:
        print("⚠️  Node.js不可用，跳过前端脚本测试")
        return True
    
    # 运行前端配置脚本显示配置
    print("📋 运行前端配置脚本...")
    os.chdir(project_root / "frontend")
    result = os.system("node scripts/load-config.js --show")
    
    if result == 0:
        print("✅ 前端配置脚本运行成功")
        return True
    else:
        print("❌ 前端配置脚本运行失败")
        return False

def main():
    """主测试函数"""
    print("🔧 AI Toolbox 配置系统测试")
    print("=" * 50)
    
    results = []
    
    # 测试配置文件
    results.append(test_config_file())
    
    # 测试后端配置加载
    results.append(test_config_loading())
    
    # 测试前端配置脚本  
    results.append(test_frontend_script())
    
    print("\n" + "=" * 50)
    print("📊 测试结果:")
    
    passed = sum(results)
    total = len(results)
    
    print(f"通过: {passed}/{total}")
    
    if passed == total:
        print("🎉 所有测试通过！配置系统正常工作。")
        return 0
    else:
        print("⚠️  部分测试失败，请检查配置。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
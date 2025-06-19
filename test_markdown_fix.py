#!/usr/bin/env python3
"""
测试 Markdown 格式修复的脚本
验证流式响应不会破坏 Markdown 语法
"""

import asyncio
import aiohttp
import json

async def test_jira_streaming():
    """测试 Jira Definition of Done 流式响应"""
    
    url = "http://localhost:8000/api/v1/ai/jira/generate"
    
    payload = {
        "task_description": "实现用户权限管理系统，包括角色分配和权限验证功能",
        "stream": True
    }
    
    print("🚀 开始测试 Jira Definition of Done 流式响应...")
    print(f"📡 请求 URL: {url}")
    print(f"📦 请求数据: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    print("\n" + "="*60)
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as response:
            print(f"📡 响应状态: {response.status}")
            print(f"📡 响应头: {dict(response.headers)}")
            print("\n🔄 开始接收流式数据:")
            print("-" * 60)
            
            full_content = ""
            chunk_count = 0
            
            async for line in response.content:
                line_str = line.decode('utf-8').strip()
                
                if line_str.startswith('data: '):
                    data = line_str[6:]  # 移除 'data: ' 前缀
                    
                    if data == '[DONE]':
                        print("\n✅ 流式响应完成")
                        break
                    elif data.startswith('Error:'):
                        print(f"\n❌ 错误: {data}")
                        break
                    else:
                        chunk_count += 1
                        full_content += data
                        print(f"📝 Chunk {chunk_count}: '{data}'")
            
            print("\n" + "="*60)
            print("📋 完整内容:")
            print("-" * 60)
            print(full_content)
            print("-" * 60)
            
            # 检查 Markdown 语法是否完整
            print("\n🔍 Markdown 语法检查:")
            
            # 检查粗体语法
            bold_patterns = []
            import re
            
            # 查找所有粗体模式
            bold_matches = re.findall(r'\*\*[^*]*\*\*', full_content)
            print(f"✅ 找到 {len(bold_matches)} 个完整的粗体语法:")
            for i, match in enumerate(bold_matches, 1):
                print(f"   {i}. {match}")
            
            # 检查是否有破损的粗体语法
            broken_bold = re.findall(r'\*\*[^*]*(?!\*\*)', full_content)
            if broken_bold:
                print(f"❌ 发现 {len(broken_bold)} 个破损的粗体语法:")
                for i, match in enumerate(broken_bold, 1):
                    print(f"   {i}. {match}")
            else:
                print("✅ 没有发现破损的粗体语法")
            
            # 检查换行符分布
            lines = full_content.split('\n')
            print(f"\n📏 内容结构:")
            print(f"   总行数: {len(lines)}")
            print(f"   非空行数: {len([line for line in lines if line.strip()])}")
            print(f"   空行数: {len([line for line in lines if not line.strip()])}")
            
            # 显示前几行内容结构
            print(f"\n📖 前10行内容结构:")
            for i, line in enumerate(lines[:10], 1):
                if line.strip():
                    print(f"   {i:2d}: '{line}'")
                else:
                    print(f"   {i:2d}: [空行]")

if __name__ == "__main__":
    asyncio.run(test_jira_streaming())

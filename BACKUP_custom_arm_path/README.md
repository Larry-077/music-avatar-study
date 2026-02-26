# Custom Arm Path 功能备份

**备份日期**: 2026-02-20

## 备份内容

这个目录包含了 Custom Arm Path（手动绘制手臂轨迹）功能的完整代码备份。

### 备份文件

1. **CurveEditor.jsx** - 路径绘制编辑器组件
   - 双 Canvas 叠加系统（网格 + 角色）
   - 鼠标/触摸绘制交互
   - 路径重采样算法
   - 预览滑块
   - 实时角色反馈

### 功能描述

Custom Arm Path 允许用户：
- 在画布上手绘手臂运动轨迹
- 实时预览角色跟随路径的动画
- 使用滑块查看路径上任意位置的角色姿态
- 轨迹自动重采样为 60 个均匀分布的点
- 路径归一化到 0-1 坐标系

### 数据格式

绘制完成的路径以以下格式存储：

```json
[
  { "x": 0.45, "y": 0.32 },
  { "x": 0.48, "y": 0.35 },
  ...
  // 共 60 个点
]
```

### 相关事件日志

- `curve_draw_start` - 开始绘制
- `curve_clear` - 清除路径
- `custom_arm_path` - 完成绘制（包含完整路径数据）

### 集成位置

该功能原本集成在 MappingStudio 中：
- 当用户选择 `custom_arm` effector 时显示
- 位于右侧控制面板底部
- 通过 `customArmPath` state 传递数据

### 恢复方法

如需恢复此功能：

1. 将 `CurveEditor.jsx` 复制回 `src/components/`
2. 在 `MappingStudio.jsx` 中：
   - 导入 CurveEditor
   - 在 custom_arm effector 选中时渲染 CurveEditor
   - 传递 customArmPath props
3. 在 `page.jsx` 中：
   - 添加 customArmPath state
   - 在 final_submit 时包含 customArmPath

### 删除原因

简化研究设计，只关注预定义动作类型的选择和强度调节。

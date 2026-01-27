### 🐛 关键修复 (Critical Fixes)

- **PDF 导出黑框彻底修复**:
  - **解决每个字被黑框包裹的问题**: 在导出的 `filter` 函数中强制移除所有元素的 `border`、`outline` 和 `boxShadow` 样式，彻底解决了 `CharacterCell` 容器在 PDF 中出现黑色粗边框的问题。

- **分页切割精度修复**:
  - **修正右侧内容被切断**: 移除了错误的 padding 补偿计算（padding 在网格外围，不影响内部切割），使用精确的 `cellStride` 倍数计算切片宽度，确保最后一列/行完整显示。
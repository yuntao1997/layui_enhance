# 可编辑表格



可编辑表格只支持data方式渲染，不支持URL方式

table元素需添加 <b>row-editable-table</b> 样式

为表头参数增加editConfig属性

```
editConfig: { form: "checkbox", verify: "require", placeholder: "...",dict: [] }
```

form取值范围包括：input、checkbox、select、color。更多可自由扩展

支持行数据校验





<iframe width="100%" height="500" src="//jsrun.pro/amWKp/embedded/all/light" allowfullscreen="allowfullscreen" frameborder="0"></iframe>
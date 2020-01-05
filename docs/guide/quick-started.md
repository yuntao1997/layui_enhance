# 快速开始

## 下载地址

::: tip

你可以在github中获取最新版源码

github:  [https://github.com/yuntao1997/layui_enhance](https://github.com/yuntao1997/layui_enhance)

:::



## 引入项目

获取到源码后，你只需要引入下述两个文件

```
enhance.css
enhance.js / enhance.all.js  
```

没错，不用去管其它任何文件。





``` html
<html>
    <link rel="stylesheet" href="http://yuntao-demo.oss-cn-hongkong.aliyuncs.com/layui-enhance/layui/css/layui.css">
    <link rel="stylesheet" href="http://yuntao-demo.oss-cn-hongkong.aliyuncs.com/layui-enhance/enhance.css">
    
    <body>
       <table id="listTable" lay-filter="listTable" class="row-editable-table"></table>
    </body>
    
    <!-- 非模块化方式 -->
    <script src="http://yuntao-demo.oss-cn-hongkong.aliyuncs.com/layui-enhance/layui/layui.all.js"></script>
     <script src="http://yuntao-demo.oss-cn-hongkong.aliyuncs.com/layui-enhance/enhance.all.js"></script>
    <script type="text/javascript">
        table.render({...})
    </script>
    
    <!-- 模块化方式 -->
    <script src="http://yuntao-demo.oss-cn-hongkong.aliyuncs.com/layui-enhance/layui/layui.js"></script>
     <script src="http://yuntao-demo.oss-cn-hongkong.aliyuncs.com/layui-enhance/enhance.js"></script>
    <script type="text/javascript">
        layui.config({
              base: './' //你的扩展模块所在目录
        }).use(['enhance'], function(){
        	let $ = layui.jquery,table = layui.table 
        	table.render({...})
        })
        
    </script>
 	
</html>

```


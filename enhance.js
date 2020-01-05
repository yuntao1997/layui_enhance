layui.define(['layer', 'form', 'jquery', 'table', 'laydate'], function(exports) {
    
    /* 这些方法建议单独存放于一个JS中，此处为了整体代码的简洁性，不单独存放 */
    window.isBlank = (str) => {
        return str === undefined || str === null || /^\s*$/.test(str)
    }
    window.isNotBlank = (str) => {
        return !isBlank(str)
    }
    window.defaultString = function(str, defaultStr) {
        return isBlank(str) ? (defaultStr ? defaultStr : "") : str
    }
    window.formatTime = (millsecond) => {
        // 将毫秒格式化为 可读的 字符串
        if (!Number.isInteger(millsecond)) {
            return millsecond
        }
        let second = millsecond / 1000

        if (second < 60) {
            return (second) + "秒"
        } else if (second / 60 < 60) {
            return Math.floor((second / 60)) + "分" + Math.floor((second % 60)) + "秒"
        } else if (second / 60 / 60 < 24) {
            return Math.floor((second / 60 / 60)) + "时" + Math.floor((second / 60 % 60)) + "分" + Math.floor((second % 60)) + "秒"
        } else {
            return Math.floor((second / 86400)) + "天" + Math.floor((second % 86400 / 60 / 60)) + "时" +
                Math.floor((second % 86400 / 60 % 60)) + "分" + Math.floor((second % 60)) + "秒"
        }
        return millsecond
    }

    Date.prototype.format = function(fmt) {
        let o = {
            "M+": this.getMonth() + 1, //月份
            "d+": this.getDate(), //日
            "h+": this.getHours(), //小时
            "m+": this.getMinutes(), //分
            "s+": this.getSeconds(), //秒
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度
            "S": this.getMilliseconds() //毫秒
        };
        fmt = fmt.replace(new RegExp("HH", 'g'), "hh")
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        for (var k in o) {
            if (new RegExp("(" + k + ")").test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            }
        }
        return fmt;
    }

    /**
     * 将日期字符串从一种类型转换为另一种类型
     * @param {string} dateStr
     * @param {string} pattern
     */
    function formatToAnotherPattern(dateStr, pattern) {
        if (dateStr === undefined || dateStr === null || dateStr.trim() === "") {
            return ""
        }
        if (pattern === undefined || pattern === null || pattern.trim() === "") {
            return ""
        }
        return new Date(dateStr).format(pattern)
    }


    /**
     * 增强layui table 功能
     * 1、给表格数据增加默认属性，以实现工具栏重新渲染功能
     * 2、当分页不启用时，将默认只显示10条 修改为显示所有
     * 3、设置表格的默认分页参数
     * 4、增加获取table实例的方法
     * 5、增加 新增行功能，可指定位置
     * 6、增加 渲染指定行、列方法
     * 7、增加 获取表格所有行数据
     * 8、增加 删除指定行
     * 9、扩展表格加载耗时显示
     * 10、内容超出设置
     * 11、支持单元格单击事件
     * 12、增强 当工具栏宽度不够时，弹出详情里面的按钮不能点击
     * 13、增加 可编辑列的配置（增加字段：editConfig: { form: "input", verify: "required", placeholder: "必填",dict: ""} ）
     * 14、增加 扩展操作列表（增加字段
     *      extToolbar: ["excel","csv"],
     *      excel: {templateUrl: "", exportUrl: "" , importUrl: "",params: {},beforeHandler(obj){} }
     *      csv: {templateUrl: "", exportUrl: "" , importUrl: "",params: {},beforeHandler(obj){} }
     * 15、获取 指定表格的指定列配置信息
     * 16、增加 合并单元格方法
     * 17、增强 当列表中某列为字典值时，自动设置 templet 函数 （为col 增加 dict 字段）
     * 18、增强 当列表中某列开启日期格式化时，自动设置templet 函数（为col 增加字段：dateFormat: boolean || string，取值：true/false、yyyy-MM-dd hh:mm:ss）
     * 19、增强 合计行数据自定义显示（为col 增加：totalRowFormatter(rows){return value}）
     * 20、设置列对齐默认为居中
     */
    let $ = layui.$,
        table = layui.table,
        form = layui.form
    if (layui && layui.table && !layui.table.$enhanced) {

        let wait = ms => new Promise((r, j) => setTimeout(r, ms))

        layui.table.config.cellToolbarName = "LAY_CELL_TOOLBAR"
        layui.table.config.parseData = (res) => {
            // 覆盖数据表格默认的数据转换，增加自定义字段，以实现更新指定行时可对列工具栏进行重新渲染，只对ajax访问时有效
            res.data && res.data.constructor == Array && res.data.forEach(o => o[layui.table.config.cellToolbarName] = "just for update cell toolbar")
            return res
        }

        let instanceMap = new Map()
        let $render = layui.table.render
        layui.table.render = (config) => {

            let waitForInstance = (timeoutms) => new Promise((resolve, reject) => {
                let check = () => {
                    if (layui.table.getInstance(config.id))
                        resolve()
                    else if ((timeoutms -= 100) < 0)
                        reject('timed out!')
                    else
                        setTimeout(check, 100)
                }
                setTimeout(check, 100)
            })

            config.request = config.request || {}
            config.startTime = new Date().getTime()

            if (!config.page) {
                config.limit = Number.MAX_VALUE
                config.request.pageName = 'currPage'
                delete config.request.limitName
            } else {
                config.request.pageName = 'currPage'
                config.request.limitName = 'pageSize'
            }

            if (config.page && !(config.limit || config.page.limit)) {
                if (typeof config.page === "boolean") {
                    config.page = { limit: 30 }
                } else {
                    config.page.limit = 30
                }
            }

            config.data && config.data.constructor == Array && config.data.forEach(o => o[layui.table.config.cellToolbarName] = "just for update cell toolbar")

            // 设置列表页字典、设置列对齐默认为居中
            config.cols && config.cols.forEach(o => {
                o.forEach(col => {
                    col.align = col.align || "center"
                    const dict = col.dict
                    if (!col.templet && isNotBlank(dict) && Array.isArray(dict)) {
                        col.templet = (item) => {
                            let result = ""
                            for (let i = 0; i < dict.length; i++) {
                                if (dict[i].value == item[col.field]) {
                                    result = `<span style="color:${dict[i].color}">${dict[i].label}</span>`
                                }
                            }

                            return `<div>${result}</div>`
                        }
                    }
                })
            })

            /**
             *  设置可编辑列。
             *  editConfig: {form: "input", verify: "required", placeholder: "必填"}
             *  form 表单类型，值可以为：input、select
             *  verify。 表单验证，参考 layui form verify
             *  dict。字典类型，针对select适用
             *  placeholder
             */
            config.cols && config.cols.forEach(o => {
                o.forEach(col => {
                    if (!col.editConfig || col.templet) {
                        return
                    }
                    let editConfig = col.editConfig
                    let templateStr = null

                    if (editConfig.form === 'input') {
                        templateStr = `<input type="text" data-name="${col.field}" value="{{d.${col.field} ? d.${col.field} : ''}}"
                                           lay-filter="${col.field}" autocomplete="off"
                                           data-index="{{d.LAY_TABLE_INDEX}}" lay-verify="${defaultString(editConfig.verify)}"
                                           class="layui-input custom-input" placeholder="${defaultString(editConfig.placeholder)}"/>`
                        col.templet = `<div>${templateStr}</div>`
                        return
                    }
                    if (editConfig.form === 'color') {
                        templateStr = `<input type="color" data-name="${col.field}" value="{{d.${col.field} ? d.${col.field} : ''}}"
                                           lay-filter="${col.field}" autocomplete="off"
                                           data-index="{{d.LAY_TABLE_INDEX}}" lay-verify="${defaultString(editConfig.verify)}"
                                           class="layui-input custom-input" placeholder="${defaultString(editConfig.placeholder)}"/>`
                        col.templet = `<div>${templateStr}</div>`
                        return
                    }

                    // 必须通过 dom 模板的方式
                    let templateId = `${config.id}_${col.field}_tpl`
                    if (editConfig.form === 'select' && editConfig.dict) {
                        templateStr = `<select data-name="${col.field}" lay-verify="${defaultString(editConfig.verify)}"  lay-search
                                                value="{{defaultString(d.${col.field})}}"
                                                lay-filter="${col.field}" data-index="{{d.LAY_TABLE_INDEX}}">
                                            ` +
                            (defaultString(editConfig.verify).indexOf("required") != -1 ? "" : `<option value="">${defaultString(editConfig.placeholder, "请选择")}</option>`)
                        if (typeof editConfig.dict == "string") {
                            templateStr += `{{# $global.getDictDataList('${editConfig.dict}').forEach(function(o) { }}
                                            <option value="{{o.value}}" {{o.value == d.${col.field} ? 'selected' : ''}}>{{o.label}}</option>
                                            {{# }) }}`
                        } else {
                            editConfig.dict.forEach(o => {
                                templateStr += `<option value="${o.value}" {{'${o.value}' == d.${col.field} ? 'selected' : ''}}>${o.label}</option>`
                            })
                        }
                        templateStr += `</select>`

                    } else if (editConfig.form === 'checkbox') {
                        templateStr = `<input type="checkbox" data-name="${col.field}" data-index="{{d.LAY_TABLE_INDEX}}"
                                           lay-skin="primary" lay-filter="${col.field}" {{d.${col.field} == 1 ? 'checked' : "" }} />`
                    }
                    let $templte = $(`#${templateId}`)
                    if ($templte.length == 0) {
                        layui.$("body").append(`<script type="text/html" id="${templateId}">${templateStr}</script>`)
                    }
                    col.templet = `#${templateId}`
                    return

                })
            })

            /**
             * 设置列的日期时间格式化，
             * dateFormat： boolean || string
             * dateFormat: true
             * dateFormat: "yyyy-MM-dd hh:mm:ss"
             */
            config.cols && config.cols.forEach(o => {
                o.forEach(col => {
                    if (col.templet || !col.dateFormat || !col.field) {
                        return
                    }
                    let pattern = "yyyy-MM-dd"
                    if (typeof col.dateFormat == 'string') {
                        pattern = col.dateFormat
                    }
                    col.templet = function(d) {

                        return `<div>${formatToAnotherPattern(d[col.field], pattern)}</div>`
                    }
                })
            })

            config.overflow = config.overflow || { type: 'tips' }
            let $done = config.done
            config.done = (res, curr, count) => {
                if (!config.id) {
                    return
                }

                // 去除可编辑表格，文本超出无省略号的问题
                $(`div[lay-id='${config.id}'] .layui-table-body .layui-table-cell:not(:has(input))`).css("cssText", "overflow:hidden!important;")
                $(`div[lay-id='${config.id}'] .layui-table-body .layui-table-cell:not(:has(div))`).css("cssText", "overflow:hidden!important;")

                if (config.overflow) {
                    let overflowOptions = {
                        type: "tips",
                        minWidth: 300,
                        maxWidth: 300,
                        color: "white",
                        bgColor: "black"
                    }
                    $.extend(overflowOptions, config.overflow)

                    let layBody = $(`div[lay-id='${config.id}'] .layui-table-body`)
                    // let color = 'white', bgColor = 'black', minWidth = 300, maxWidth = 300
                    let { type, color, bgColor, minWidth, maxWidth } = overflowOptions

                    let tooltipIndex = null
                    layBody.off(['mouseenter', 'mouseleave'], 'td').on('mouseenter', 'td', function() {
                        let othis = $(this),
                            elemCell = othis.children('.layui-table-cell')
                        if (othis.data('off') || othis.data("field") === 'LAY_CELL_TOOLBAR') return;
                        if (othis.has('select').length != 0) return;

                        let outerWidth = othis.children('.layui-table-cell').outerWidth()
                        let layerWidth = (outerWidth < minWidth ? minWidth : (outerWidth > maxWidth ? maxWidth : outerWidth))

                        if (elemCell.prop('scrollWidth') > elemCell.outerWidth()) {
                            tooltipIndex = layer.tips('<span style="color: ' + color + '">' + othis.text() + '</span>', this, {
                                tips: [1, bgColor],
                                maxWidth: layerWidth,
                                time: 0
                            });
                        }
                    }).on('mouseleave', 'td', function() {
                        layer.close(tooltipIndex)
                    })
                }

                (async () => {


                    // 等待获取到实例
                    await waitForInstance(10 * 1000)

                    let ins = layui.table.getInstance(config.id)
                    if (!ins) {
                        $done && $done(res, curr, count)
                        return
                    }
                    let layTable = $(`div[lay-id='${ins.config.id}']`),
                        layBody = layTable.find(`.layui-table-body`),
                        layTotal = layTable.find(`.layui-table-total`)

                    // let time = new Date().getTime() - ins.config.startTime
                    // $(`div[lay-id='${config.id}'] .layui-table-page>div`).append($(`<div class="pull-right" style="height:26px;padding: 5px">加载耗时：${formatTime(time)}</div>`))
                    if (ins.config.time) {
                        let time = ins.config.time
                        let elapsedTime = Number.parseInt(time.substring(0, time.indexOf(" ")))
                        layTable.find(`.layui-table-page>div`).append($(`<div class="pull-right" style="height:26px;padding: 5px">加载耗时：${formatTime(elapsedTime)}</div>`))
                    }

                    if (ins.config.scrollTop && ins.config.data) {
                        layBody.scrollTop(ins.config.scrollTop)
                        delete ins.config.scrollTop
                    }

                    // 支持单元格单击事件
                    layBody.on("click", "td", function(event) {
                        let rows = layui.table.getRows(ins.config.id)
                        let rowIndex = $(this).parent().data("index")
                        let colIndex = $(this).index()

                        // let col = ins.config.cols.length == 1 ? ins.config.cols[0][colIndex] : ins.config.cols[1][colIndex]
                        // data-key="2-0-0"  2 代表cols有3组，0：代表第一组，0： 代表第一列

                        let col = layui.table.getColConfigByField(config.id, $(this).attr("data-field"))
                        if (!col) {
                            return;
                        }
                        // 复选框、单选框、索引列，不进行监听
                        if (["checkbox", "radio", "numbers"].includes(col.type)) {
                            return
                        }

                        layui.event.call(ins, 'table', "cell(" + ins.config.elem.attr("lay-filter") + ")", {
                            data: rows[rowIndex],
                            rowIndex: rowIndex,
                            colIndex: colIndex,
                            col: col
                        })
                        // event.stopPropagation()
                    })


                    /***** 给工具栏增加扩展按钮    开始                     **/
                    $(document).on("click", function(e) {
                        $(".layui-table-custom-tool-panel").removeClass("layui-hide").addClass("layui-hide")
                        layui.stope(e)
                    })

                    if (config.extToolbar && Array.isArray(config.extToolbar) && !ins.config.$extToolbarInited) {
                        let $toolbar = $(`div[lay-id='${config.id}'] > .layui-table-tool .layui-table-tool-self`)
                        // 监听自定义bar点击事件，显示相应的panel，并组织事件传播
                        $toolbar.on("click", "*[custom-event]", function(e) {
                            layui.stope(e)
                            let layEvent = $(this).attr("custom-event")
                            if (!layEvent || !layEvent.startsWith("custom-")) {
                                return
                            }
                            let curIndex = $(this).index()
                            $(`[lay-id='${config.id}'] .layui-table-tool-self>div:not(:eq(${curIndex}))`).find(".layui-table-custom-tool-panel").not(".layui-hide").addClass("layui-hide")

                            $(this).find(".layui-table-custom-tool-panel").toggleClass("layui-hide")
                        })

                        let defaultToolbar = {
                            "excel": {
                                title: "EXCEL导入导出",
                                icon: "layui-icon layui-icon-export",
                                buttons: [{
                                    type: "excel_template",
                                    icon: "fa fa-download",
                                    title: "EXCEL模板",
                                    condition: config.excel && config.excel.templateUrl,
                                    click: () => {
                                        let loadIndex = top.layer.load(1, {
                                            shade: [0.8, '#393D49'],
                                            offset: [`${screen.availHeight / 2 - 50}px`, `${screen.availWidth / 2 - 50}px`]
                                        })
                                        $http.download(config.excel.templateUrl, instance.config.excel.params).finally(() => top.layer.close(loadIndex))
                                    }
                                }, {
                                    type: "excel_export",
                                    icon: "fa fa-download",
                                    title: "EXCEL导出",
                                    condition: config.excel && config.excel.exportUrl,
                                    click: () => {
                                        let loadIndex = top.layer.load(1, {
                                            shade: [0.8, '#393D49'],
                                            offset: [`${screen.availHeight / 2 - 50}px`, `${screen.availWidth / 2 - 50}px`]
                                        })
                                        $http.download(config.excel.exportUrl, instance.config.excel.params).finally(() => top.layer.close(loadIndex))
                                    }
                                }, {
                                    type: "excel_import",
                                    icon: "fa fa-upload",
                                    title: "EXCEL导入",
                                    condition: config.excel && config.excel.importUrl,
                                    click: () => {
                                        if (!layui.importExcel) {
                                            layer.error("导入功能暂不可用，请检查导入组件是否加载")
                                            return
                                        }
                                        layui.importExcel && layui.importExcel.render({
                                            url: config.excel.importUrl,
                                            title: config.title,
                                            autoClose: true,
                                            loading: true,
                                            params: instance.config.excel.params,
                                            success: (res) => {
                                                if (res.data && res.data.successCount != 0) {
                                                    window.reloadTable && window.reloadTable()
                                                }
                                            }
                                        })
                                    }
                                }]
                            },
                            "csv": {
                                title: "CSV导入导出",
                                icon: "layui-icon layui-icon-export",
                                buttons: [{
                                    type: "csv_export",
                                    icon: "fa fa-download",
                                    title: "CSV导出",
                                    condition: config.csv && config.csv.exportUrl,
                                    click: () => {
                                        let loadIndex = top.layer.load(1, {
                                            shade: [0.8, '#393D49'],
                                            offset: [`${screen.availHeight / 2 - 50}px`, `${screen.availWidth / 2 - 50}px`]
                                        })
                                        $http.download(config.csv.exportUrl, instance.config.csv.params).finally(() => top.layer.close(loadIndex))
                                    }
                                }]
                            }
                        }

                        for (const key in defaultToolbar) {
                            if (!config.extToolbar.includes(key)) {
                                continue
                            }
                            let toolbar = defaultToolbar[key]
                            let $exim = $(`<div class="layui-inline" title="${toolbar.title}" custom-event="custom-exports"><i class="${toolbar.icon}"></i></div>`)
                            let $ul = $(`<ul class="layui-table-custom-tool-panel layui-hide"></ul>`)
                            $exim.append($ul)
                            toolbar.buttons.forEach(o => {
                                $ul.append((o.condition ? `<li data-type="${o.type}"><i class="${o.icon}"></i> ${o.title}</a></li>` : ""))
                            })
                            $toolbar.append($exim)

                            // 监听自定义li点击事件
                            $exim.on("click", "li", function(e) {
                                layui.stope(e)

                                let type = this.getAttribute("data-type")
                                config[key] && config[key].beforeHandle && config[key].beforeHandle({ type })
                                // toolbar.beforeHandle && toolbar.beforeHandle({type})

                                for (const o of toolbar.buttons) {
                                    if (o.type && o.type == type) {
                                        o.click()
                                        break
                                    }
                                }
                            })
                        }
                        ins.config.$extToolbarInited = true
                        /***** 给工具栏增加扩展按钮    结束                     **/
                    }

                    // 合计行自定义显示值
                    config.cols && config.cols.forEach(o => {
                        o.forEach(col => {
                            if (col.templet || !col.totalRow || !col.totalRowFormatter || !col.field) {
                                return
                            }
                            let rows = layui.table.getRows(config.id)
                            let value = (typeof col.totalRowFormatter === "function") ? col.totalRowFormatter(rows) : ""
                            layTotal.find(`[data-field='${col.field}']>div`).html(value)
                        })
                    })

                    $done && $done(res, curr, count)
                })()
            }
            let instance = $render(config)
            instance != null && isNotBlank(instance.config.id) && instanceMap.set(instance.config.id, instance)

            return instance
        }

        let $reload = layui.table.reload
        layui.table.reload = (tableId, config) => {
            config.data && config.data.constructor == Array && config.data.forEach(o => o[layui.table.config.cellToolbarName] = "just for update cell toolbar")

            let ins = layui.table.getInstance(tableId)
            if (!ins) {
                return $reload(tableId, config)
            }
            ins.config.scrollTop = $(`div[lay-id='report_grid_field_table'] .layui-table-body`).scrollTop()
            ins.config.startTime = new Date().getTime()

            if (ins.config.url && ins.config.page) {
                // 如果通过URL进行加载，reload时自动从第一页加载
                if (config.page) {
                    config.page.curr = 1
                } else {
                    config.page = { curr: 1 }
                }
            }

            // 当reload的时候扩展工具栏需要重新渲染
            ins.config.$extToolbarInited = false
            return $reload(tableId, config)
        }

        // layui.table.config.request = {pageName: 'currPage', limitName: 'pageSize'}

        /**
         * 获取Table实例
         * @param tableId
         * @return {any}
         */
        layui.table.getInstance = (tableId) => {
            return instanceMap.get(tableId)
        }

        /**
         * 获取指定表格的指定列配置信息
         * @param tableId
         * @param field
         * @return {null|*}
         */
        layui.table.getColConfigByField = (tableId, field) => {
            let ins = layui.table.getInstance(tableId)
            if (!ins) {
                return null
            }
            for (let i = 0; i < ins.config.cols.length; i++) {
                for (let j = 0; j < ins.config.cols[i].length; j++) {
                    if (ins.config.cols[i][j].field == field) {
                        return ins.config.cols[i][j]
                    }
                }
            }
        }
        /**
         * 添加新行
         * @param tableId
         * @param index 位置，从0开始
         * @param data
         */
        layui.table.addRow = (tableId, index, data) => {
            if (!(layui.table.cache[tableId] && data)) {
                return
            }

            // 如果有可编辑列，且为单选下拉框，并为必填，自动设置默认值为 字典的第一个值
            let row = {}
            let ins = layui.table.getInstance(tableId)
            ins.config.cols.forEach(cols => {
                cols.forEach(col => {
                    // 已经设置过值就不再重复设置了
                    if (data[col.field]) {
                        return;
                    }
                    let editConfig = col.editConfig
                    if (editConfig && editConfig.form == "select" && isNotBlank(editConfig.dict) && defaultString(editConfig.verify).indexOf("required") != -1) {
                        let list = typeof editConfig.dict == "string" ? $global.getDictDataList(editConfig.dict) : editConfig.dict
                        if (list.length == 0) {
                            return
                        }
                        row[col.field] = list[0].value
                        return;
                    }
                    if (editConfig && editConfig.form == "checkbox") {
                        row[col.field] = 0
                        return;
                    }
                })
            })
            row = { ...data, ...row }
            let bak = layui.table.cache[tableId].slice()
            // 当有默认值/下拉框时，手动指定默认值
            bak.splice(index, 0, row)
            layui.table.reload(tableId, {
                data: bak
            })
        }

        /**
         * 重新渲染指定行
         * @param tableId 表格ID
         * @param rowIndex 行索引
         * @param data 数据
         */
        layui.table.renderSpecRow = (tableId, rowIndex, data) => {
            let instance = layui.table.getInstance(tableId)
            if (instance == null) {
                return
            }
            if (!data) {
                return
            }
            data = $.extend({
                LAY_CELL_TOOLBAR: "just for update cell toolbar",
                LAY_TABLE_INDEX: rowIndex
            }, data)

            let tr = $(`[lay-id='${tableId}'] .layui-table-body .layui-table tr:eq(${rowIndex})`)
            layui.each(data, (field, index) => {
                let td = tr.children('td[data-field="' + field + '"]')

                let templet = null
                let cols = instance.config.cols
                for (let i = 0; i < cols.length; i++) {
                    let bFind = false
                    for (let j = 0; j < cols[i].length; j++) {
                        let col = cols[i][j]
                        if (col.field == field) {
                            col.templet && (templet = col.templet)
                            bFind = true
                            break
                        }
                    }
                    if (bFind) {
                        break
                    }
                }

                td.children(".layui-table-cell").html(function() {
                    return templet ? function() {
                        return "function" == typeof templet ? templet(data) :
                            layui.laytpl(layui.$(templet).html() || data[field]).render(data)
                    }() : data[field]
                }()), td.data("content", data[field])
            })

            layui.table.cache[tableId][rowIndex] = $.extend(layui.table.cache[tableId][rowIndex], data)
        }

        /**
         * 获取指定表格所有行数据
         * @param tableId
         * @return {Array}
         */
        layui.table.getRows = (tableId) => {
            if (isBlank(tableId)) {
                return []
            }
            return layui.table.cache[tableId] ? layui.table.cache[tableId] : []
        }

        /**
         * 删除指定行
         * @param {string} tableId 表格ID
         * @param {number} rowIndex 行索引。>= 0
         * @return {boolean}
         */
        layui.table.deleteRow = (tableId, rowIndex) => {
            let ins = layui.table.getInstance(tableId)
            if (ins == null) {
                return false
            }
            if (rowIndex < 0) {
                return false
            }
            $(`[lay-id='${tableId}'] .layui-table-body .layui-table tr:eq(${rowIndex})`).remove()
            layui.table.cache[tableId].splice(rowIndex, 1)
            layui.table.reload(tableId, {
                data: layui.table.cache[tableId]
            })
        }

        /**
         * 合并单元格
         * @param tableId 表格ID
         * @param field 字段名
         */
        layui.table.mergeCell = (tableId, field) => {
            let $trs = $(`[lay-id='${tableId}'] .layui-table-body>.layui-table tr`);
            // 依据字段自动获取列索引
            let ins = layui.table.getInstance(tableId)
            if (!ins) {
                return
            }

            let merge = (data, index, field) => {
                let lastValue = data[0][field],
                    spanNum = 1;
                for (let i = 1; i < data.length; i++) {

                    if (data[i][field] == lastValue) {
                        spanNum++;
                        if (i == data.length - 1) {
                            $trs.eq(i - spanNum + 1).find('td').eq(index).attr('rowspan', spanNum);
                            for (let j = 1; j < spanNum; j++) {
                                $trs.eq(i - j + 1).find('td').eq(index).attr('del', 'true');
                            }
                        }
                    } else {
                        $trs.eq(i - spanNum).find('td').eq(index).attr('rowspan', spanNum);
                        for (let j = 1; j < spanNum; j++) {
                            $trs.eq(i - j).find('td').eq(index).attr('del', 'true');
                        }
                        spanNum = 1;
                        lastValue = data[i][field];
                    }

                }
            }

            let data = layui.table.getRows(tableId)
            if (!data || data.length == 0) {
                return
            }

            let tableCols = ins.config.cols
            let col = null
            for (let i = 0; i < tableCols.length; i++) {
                for (let j = 0; j < tableCols[i].length; j++) {
                    if (tableCols[i][j].field == field) {
                        col = tableCols[i][j]
                        break
                    }
                }
                if (col) {
                    break
                }
            }

            // 如果有合并单元格，先查看表头有没有合并，并找到相应的索引
            let index = null

            let curIndex = Number.parseInt(col.key.substring(col.key.lastIndexOf("-") + 1))

            let parentKey = col.parentKey
            if (parentKey) {
                let parentIndex = Number.parseInt(parentKey.substring(parentKey.lastIndexOf("-") + 1))
                index = parentIndex + curIndex
            } else {
                index = curIndex
            }
            merge(data, index, field);


            $trs.find('[del="true"]').hide();

        }

        /*** ===============  增强 当工具栏宽度不够时，弹出详情里面的按钮不能点击  ===============  */
        $(document).off('mousedown', `.layui-table-grid-down`).on('mousedown', `.layui-table-grid-down`, function(event) {
            //直接记录td的jquery对象
            layui.table._tableTrCurrr = $(this).closest('td');
        });

        //给弹出的详情里面的按钮添加监听级联的触发原始table的按钮的点击事件
        $(document).off('click', '[lay-event]').on('click', '.layui-table-tips-main [lay-event]', function(event) {
            let elem = $(this);
            let tableTrCurrr = layui.table._tableTrCurrr;
            if (!tableTrCurrr) {
                return;
            }
            let layerIndex = elem.closest('.layui-table-tips').attr('times');
            layer.close(layerIndex);
            layui.table._tableTrCurrr.find('[lay-event="' + elem.attr('lay-event') + '"]').first().click();
        });
        /*** ===============  增强 当工具栏宽度不够时，弹出详情里面的按钮不能点击   ===============  */

        layui.table.$enhanced = true
    }

    /**
     * 增强layer功能
     * 1、增加 layer.open  {@code btnConfirmIndex} 参数，用于设置确认按钮索引，以修改默认样式
     * 2、增加 layer.success 方法
     * 3、增加 layer.error   方法
     * 4、增加 layer.loading 方法
     */
    if (layui && layui.layer && !layui.layer.$enhanced) {

        let $open = layer.open
        layer.open = (config) => {
            if (config.type == 2) {
                // iframe 模式
                let $end = config.end
                config.end = () => {
                    // 删除open_cache_table 相关dom
                    let win = top != parent ? parent : window
                    let $layers = $(`[id*='layui-layer-iframe'][id*='open_cache_table']`, win.document).parent()
                    $layers.prev(".layui-layer-shade").remove()
                    $layers.remove()
                    $end && $end()
                }
            }

            if (config.id && config.side) {
                // 可拖动表格（一般用于列表右侧）
                let name = $(`#${config.id} iframe[id^='layui-layer-iframe']`).attr("name")
                let index = layer.getFrameIndex(name)
                if (name && index) {
                    config.success($(`#${config.id}`).parent(), index)
                    return
                }
                let width = $global.getParameterValue("project.front.default.dialogFormWidth", '40%')
                config = $.extend(config, {
                    shade: 0,
                    offset: "rt",
                    anim: -1,
                    area: config.area ? config.area : [width, '100%'],
                    isOutAnim: true,
                    move: false, // 禁止默认标题拖拽
                    resize: false
                })
                let $success = config.success
                config.success = (layero, index) => {

                    let wrapper = $(`div[id='layui-layer${index}']`)[0]
                    wrapper.style.border = "0"
                    let maxWidth = $(wrapper).parent().width()

                    let el = $(
                        `<div style="position: absolute; top: 0px; left: 0px; width: 5px; height: 100%; cursor: col-resize; opacity: 5; background-color: transparent;">
                            <span>
                                <li class="fa fa-arrows-h " style="position: absolute; top: 50%; left: 50%;"></li>
                            </span>
                        </div>`
                    )
                    let body = layer.getChildFrame('body', index)
                    body.append(el)
                    let iframeDoc = window[layero.find('iframe')[0]['name']].document
                    el[0].onmousedown = (e) => {
                        // 当前点击时Left的值
                        let offsetLeft = wrapper.offsetLeft

                        let mouseMoveFn = function(e) {
                            //e.preventDefault(); // 移动时禁用默认事件
                            if (offsetLeft == e.clientX) {
                                return;
                            }

                            // 移动的距离
                            let moveDistance = -e.clientX;
                            wrapper.style.left = (wrapper.offsetLeft - moveDistance) + "px";
                            wrapper.style.width = (maxWidth - wrapper.offsetLeft) + "px";

                            // 已经拉到最左边了，最大化显示
                            if (wrapper.offsetLeft <= 0) {
                                wrapper.style.left = "0px";
                                wrapper.style.width = maxWidth + "px";
                                return;
                            }

                            // 已经拉到最右边了
                            if (wrapper.offsetLeft >= (maxWidth - 50)) {
                                wrapper.style.left = (maxWidth - 50) + "px";
                                wrapper.style.width = "50px";
                                return;
                            }

                            // 更新左边当前位置
                            offsetLeft = wrapper.offsetLeft

                        }
                        let fnMouseUp = (e) => {
                            iframeDoc.onmousemove = null;
                            iframeDoc.onmouseup = null;
                        }

                        iframeDoc.onmousemove = _.debounce(mouseMoveFn, 5)
                        iframeDoc.onmouseup = fnMouseUp
                        iframeDoc.ondragstart = iframeDoc.onselectstart = () => {
                            return false
                        }

                    }
                    $success && $success(layero, index)
                }
                return $open(config)
            }


            // 设置按钮样式
            let btnConfirmIndex = config.btnConfirmIndex
            if (!btnConfirmIndex) {
                return $open(config)
            }
            let $success = config.success
            config.success = (layero, index) => {
                layui.$(`${layero.selector} .layui-layer-btn->a:eq(0)`).removeClass("layui-layer-btn0")
                layui.$(`${layero.selector} .layui-layer-btn->a:eq(${btnConfirmIndex})`).addClass("layui-layer-btn0")
                $success && $success(layero, index)
            }

            return $open(config)
        }


        layer.success = (msg, config = {}) => {
            config.icon = 1
            return layer.msg(msg, config)
        }

        layer.error = (msg, config = {}) => {
            config.icon = 5
            return layer.msg(msg, config)
        }

        layer.loading = (options) => {
            let defaultOptions = {
                shade: [0.5, 'gray'], //0.5透明度的灰色背景,
                offset: [`${screen.availHeight / 2 - 50}px`, `${screen.availWidth / 2 - 50}px`],
                content: "加载中...",
                success(layero) {
                    layero.find('.layui-layer-content').css({
                        'padding-top': '39px',
                        'width': '60px'
                    });
                }
            }
            let tmpOptions = { ...defaultOptions, ...options }
            return layer.load(1, tmpOptions)
        }

        layui.layer.$enhanced = true
    }

    /**
     * 增强laydate功能
     * 1、当日期选择完成时，自动赋值相应的元素value
     * 2、支持渲染多个dom
     * 3、增加 获取laydate 实例方法
     * 4、增加快捷方式选项（增加字段：pickerOptions）
     */
    if (layui && layui.laydate && !layui.laydate.$enhanced) {
        let laydate = layui.laydate

        let instanceMap = new Map()

        let $render = laydate.render
        laydate.render = (config) => {
            config.pickerOptions = config.pickerOptions || $dates.pickerOptions.date
            if (config.isInitValue) {
                // && config.value.every(o => o instanceof Date)
                if (config.range && config.value && Array.isArray(config.value)) {
                    config.value = config.value.map(o => o.format($strings.defaultIfBlank(config.format, 'yyyy-MM-dd'))).join(` ${typeof config.range === "boolean" ? "-" : config.range} `)
                }
            }

            let $done = config.done
            config.done = (value, date, endDate) => {
                if (!config.range) {
                    config.elem && $(config.elem).val(value) && $(config.elem).change()
                }
                $done && $done(value, date, endDate)
            }

            let $ready = config.ready
            config.ready = function(date) {
                if (!(config.pickerOptions && config.pickerOptions.shortcuts)) {
                    $ready && typeof $ready === 'function' && $ready(date)
                    return
                }

                let shortcuts = config.pickerOptions.shortcuts
                let that = this
                let key = that.elem.attr("lay-key")
                let $elem = $("#layui-laydate" + key)
                let $ul = $(` <ul class="layui-laydate-sidebar" ></ul>`)
                shortcuts && shortcuts.forEach(o => {
                    let $li = $(`<li class="layui-laydate-shortcut">${o.text}</li>`)
                    $li.click(() => {
                        $elem.remove()
                        o.onClick(that)
                        instanceMap.delete(key)
                    })
                    $ul.append($li)
                })
                $elem.prepend($ul)
                $ul.height($elem.find(".layui-laydate-main").outerHeight())

                if (!config.range) {
                    $elem.find(".layui-laydate-main").css({ "display": "inline-block" })

                    // 宽度超限
                    let divWidth = $elem.offset().left + $elem.outerWidth() + $ul.outerWidth()
                    if (divWidth > document.body.offsetWidth) {
                        let left = document.body.offsetWidth - ($elem.outerWidth() + ($ul.outerWidth() / 2))
                        $elem.css({ "left": `${left}px` })
                    }
                } else {
                    $elem.width($elem.outerWidth() + $ul.outerWidth())
                }

                $ready && typeof $ready === 'function' && $ready(date)
            }

            let tmpConfig = { ...config }
            $(config.elem).each(function() {
                let that = this

                let conf = { ...tmpConfig }
                conf.elem = that
                conf.done = (value, date, endDate) => {
                    $(that).val(value) && $(that).change()
                    $done && $done(value, date, endDate)
                }
                let ins = $render(conf)
                instanceMap.set(conf.elem.getAttribute("lay-key"), ins)
            });
        }

        /**
         * 获取laydate实例
         * @param key   所渲染的表单元素 lay-key
         * @return {any}
         */
        laydate.getInstance = (key) => {
            return instanceMap.get(key)
        }

        laydate.$enhanced = true
    }

    /**
     * 表单验证功能增强
     */
    form.verify({
        "radio-required"(value, item) {
            //单选按钮必选
            let va = $(item).find("input[type='radio']:checked").val();
            if (typeof(va) == "undefined") {
                return $(item).attr("lay-verify-msg");
            }
        },
        "checkbox-required"(value, item) {
            //复选框必选
            let va = $(item).find("input[type='checkbox']:checked").val();
            if (typeof(va) == "undefined") {
                return $(item).attr("lay-verify-msg");
            }
        },
        "required"(value, item) {
            if (value === undefined && value == null) {
                return '必填项不能为空'
            }
            if (value.trim() === '') {
                return '必填项不能为空'
            }
        },
        "abc"(value, item) {
            if (!/^\w+$/.test(value)) {
                return '只能填写字母、数字及下划线'
            }
        },
        "email"(value, item) {
            if (isBlank(value)) {
                return
            }
            if (!/\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(value)) {
                return '邮箱格式不正确'
            }
        },
        "number"(value, item) {
            if (isNotBlank(value) && isNaN(value)) {
                return '只能填写数字'
            }
        },
        "phone"(value, item) {
            if (isBlank(value)) {
                return
            }
            if (!/^1\d{10}$/.test(value)) {
                return '请输入正确的手机号'
            }
        },
        "integer": [/^-?\d+$/, "只能填写整数"],
        "positive_integer": [/^\d+$/, "只能填写正整数"],
        "negative_integer": [/^-\d+$/, "只能填写负整数"]

        // integer   /^-?\d+$/
        // digits  /^(0|\+?[1-9][0-9]*)$/
        //     /^(([^0][0-9]+|0)\.([0-9]{1,2}))$/
    });



    /**
     * 可编辑表格相关工具
     * @type {{validateSingleRow(*=): boolean}}
     */
    let editable = {

        /**
         * 监听表格，当表格的可编辑内容（文本框、下拉框、复选框等） 值改变后，同步更新表格缓存的值
         * @param tableId
         */
        watch(tableId) {
            if (isBlank(tableId)) {
                throw new Error(`The parameter tableId cannot be blank`)
            }
            if (!layui.table.cache[tableId]) {
                throw new Error(`The table ${tableId} is not exist,please first to init`)
            }
            let instance = table.getInstance(tableId)
            if (instance && instance.$watched) {
                // 已经监听，不再进行重复监听
                return
            }

            let trs = $(`[lay-id='${tableId}'] .layui-table tr:gt(0)`)

            // 监听文本框，当值有更新时，修改缓存中的数据
            $(document).on('change', `[lay-id='${tableId}'] .layui-table input[data-name]`, (e) => {
                let row = e.target.getAttribute('data-index')
                let name = e.target.getAttribute('data-name')
                layui.table.cache[tableId][row][name] = e.target.value
            })

            // 监听下拉框，当值有更新时，修改缓存中的数据。 防止当表格没有数据时，监听失败
            instance.config.cols.forEach(cols => {
                cols.forEach(col => {
                    if ((col.editConfig && col.editConfig.form == "select") ||
                        (typeof col.templet == "string" && $(col.templet).html().indexOf("</select>") != -1)) {
                        form.on(`select(${col.field})`, function(obj) {
                            let row = obj.elem.getAttribute('data-index')
                            let name = obj.elem.getAttribute('data-name')
                            table.cache[tableId][row][name] = obj.value
                        });
                    }
                })
            })

            // 监听下拉框，当值有更新时，修改缓存中的数据
            // let selects = $(`[lay-id='${tableId}'] .layui-table select[data-name] `)
            // for (let i = 0; i < selects.length; i++) {
            //     let select = selects[i]
            //     form.on(`select(${select.getAttribute('lay-filter')})`, function (obj) {
            //         let row = obj.elem.getAttribute('data-index')
            //         let name = obj.elem.getAttribute('data-name')
            //         table.cache[tableId][row][name] = obj.value
            //     });
            // }

            let checkboxs = $(`[lay-id='${tableId}'] .layui-table input[type='checkbox'][data-name] `)
            for (let i = 0; i < checkboxs.length; i++) {
                let checkbox = checkboxs[i]
                form.on(`checkbox(${checkbox.getAttribute('lay-filter')})`, function(obj) {
                    let row = obj.elem.getAttribute('data-index')
                    let name = obj.elem.getAttribute('data-name')
                    table.cache[tableId][row][name] = obj.elem.checked ? 1 : 0
                });
            }

            instance.$watched = true
        },



        /**
         * 校验所有行数据
         * @param tableId
         * @param callback
         */
        validateAllRows(tableId, callback) {
            let trs = $(`[lay-id='${tableId}'] .layui-table-body .layui-table tr`)
            let errors = new Array()
            for (let i = 0; i < trs.length; i++) {
                let tr = trs[i]
                this.validateSingleRow(tableId, i, (valid, error) => {
                    if (!valid) {
                        errors.push(error)
                    }
                })
            }
            if (errors.length == 0) {
                callback && typeof callback === "function" && callback(true, [])
                return
            }

            callback && typeof callback === "function" && callback(false, errors)
        },


        /**
         * 校验单行数据
         * @param tableId 表格ID
         * @param rowIndex 行索引
         * @param callback 成功/失败回调, 有两个参数： (valid,error)  ，当校验成功失败时，valid为false、error为具体的错误信息 @code {field,rowIndex,message}
         */
        validateSingleRow(tableId, rowIndex, callback) {
            let tr = $(`[lay-id='${tableId}'] .layui-table-body .layui-table tr:eq(${rowIndex})`)[0]
            // let tr = $(trSelector)[0]
            if (!tr) {
                return
            }

            let tdChildren = tr.children
            let fields = new Array()
            for (let i = 0; i < tdChildren.length; i++) {
                fields.push(tdChildren[i].dataset.field)
            }

            for (let i = 0; i < fields.length; i++) {
                let field = fields[i]
                let el = $(`[data-name="${field}"][data-index="${rowIndex}"]`)

                // 获取校验规则、字段值
                let verify = el.attr("lay-verify")
                let verifies = verify ? verify.split("|") : []

                let value = el.val()

                el.removeClass('layui-form-danger')
                for (let j = 0; j < verifies.length; j++) {
                    let v = layui.form.config.verify[verifies[j]]

                    if (!v) {
                        continue
                    }
                    // return undefined or false，代表校验成功
                    let r = typeof v == 'function' ? v(value, el) : !v[0].test(value)

                    // 读取通过函数返回的参数 或者 直接取配置的正则 相应的提示信息 ，具体格式详见  layui.form.config.verify
                    let message = typeof r === "boolean" ? v[1] : r

                    "required" === verifies[j] && (message = el.attr("lay-reqText") || message)

                    if (!(r === undefined || r === false)) {
                        layui.layer.msg(message, {
                            icon: 5,
                            shift: 6
                        })
                        setTimeout(() => {
                            el.focus()
                            el.addClass("layui-form-danger")
                        }, 10)
                        callback && typeof callback === "function" && callback(false, {
                            field,
                            rowIndex,
                            message
                        })
                        return
                    }
                }
            }

            callback(true, {})
        }
    }

    window.$editable = editable

    exports('enhance', {}); //注意，这里是模块输出的核心，模块名必须和use时的模块名一致
});